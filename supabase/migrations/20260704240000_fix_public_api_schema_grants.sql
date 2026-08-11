-- =============================================================================
-- Fix PostgREST / RLS : accès schéma app via vues public (security_invoker)
-- =============================================================================
-- L'erreur "Database error querying schema" apparaît souvent quand :
-- 1) le client demande Accept-Profile: app (schéma non exposé par l'API)
-- 2) les vues security_invoker=true n'ont pas USAGE/SELECT suffisants sur app.*
--
-- Correctif : grants explicites + reload schema. Le client reste sur public.
-- =============================================================================

GRANT USAGE ON SCHEMA administration TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON administration.organization TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Vues API publiques (si absentes / à rafraîchir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'app' AND table_name = 'contacts'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.contacts AS SELECT * FROM app.contacts';
    EXECUTE 'GRANT ALL ON public.contacts TO anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'app' AND table_name = 'energy_assets'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.energy_assets AS SELECT * FROM app.energy_assets';
    EXECUTE 'GRANT ALL ON public.energy_assets TO anon, authenticated, service_role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'app' AND table_name = 'users'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.users AS SELECT * FROM app.users';
    EXECUTE 'GRANT ALL ON public.users TO anon, authenticated, service_role';
  END IF;
END $$;

-- Tickets : vues avec security_invoker (RLS de l'appelant)
DROP VIEW IF EXISTS public.tickets_maintenance_enriched;
DROP VIEW IF EXISTS public.tickets_maintenance;

CREATE VIEW public.tickets_maintenance
WITH (security_invoker = true)
AS
  SELECT * FROM app.tickets_maintenance;

GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

CREATE VIEW public.tickets_maintenance_enriched
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.organization_id,
  t.created_at,
  t.updated_at,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.asset_id,
  t.commune_insee_code,
  t.created_by,
  t.assigned_to_provider_id,
  t.assigned_contact_id,
  c.first_name AS assigned_contact_first_name,
  c.last_name AS assigned_contact_last_name,
  c.email AS assigned_contact_email,
  c.phone AS assigned_contact_phone,
  c.role AS assigned_contact_role,
  c.department AS assigned_contact_department
FROM app.tickets_maintenance t
LEFT JOIN app.contacts c ON c.id = t.assigned_contact_id;

GRANT SELECT ON public.tickets_maintenance_enriched TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
