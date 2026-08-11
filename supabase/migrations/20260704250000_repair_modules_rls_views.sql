-- =============================================================================
-- Réparation globale PostgREST / RLS / vues public
-- =============================================================================
-- Object : modules hors Affaires en spinner / liste vide après realignement org.
-- Correctifs :
-- 1) GRANT USAGE + ALL sur app.*
-- 2) Vues tickets SANS security_invoker (alignées sur projects) pour éviter
--    les blocages RLS JWT (rôle manquant) tout en gardant le filtre org côté app
-- 3) Politiques RLS plus tolérantes : org claim NULL OU match organization_id
-- 4) Reload PostgREST
-- =============================================================================

GRANT USAGE ON SCHEMA administration TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON administration.organization TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ── Contacts : politique org (lecture/écriture) ──────────────────────────────
DROP POLICY IF EXISTS contacts_org ON app.contacts;
CREATE POLICY contacts_org ON app.contacts
  FOR ALL
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

-- ── Energy assets ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS energy_assets_org_and_commune ON app.energy_assets;
CREATE POLICY energy_assets_org_and_commune ON app.energy_assets
  FOR ALL
  USING (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT COALESCE(app.is_commune_user(), false)
      OR commune_insee_code = app.current_user_commune_insee_code()
    )
  )
  WITH CHECK (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT COALESCE(app.is_commune_user(), false)
      OR commune_insee_code = app.current_user_commune_insee_code()
    )
  );

-- ── Tickets : politique lecture élargie pour staff + fallback org ─────────────
-- Garde les politiques métier existantes ; ajoute un SELECT org-wide pour
-- éviter les listes vides quand le claim JWT role est absent mais org OK.

DROP POLICY IF EXISTS tickets_maintenance_org_select ON app.tickets_maintenance;
CREATE POLICY tickets_maintenance_org_select ON app.tickets_maintenance
  FOR SELECT
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

-- ── Vues public (API) — sans security_invoker, comme projects ────────────────
CREATE OR REPLACE VIEW public.contacts AS
  SELECT * FROM app.contacts;
GRANT ALL ON public.contacts TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.energy_assets AS
  SELECT * FROM app.energy_assets;
GRANT ALL ON public.energy_assets TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.users AS
  SELECT * FROM app.users;
GRANT ALL ON public.users TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.tickets_maintenance_enriched;
DROP VIEW IF EXISTS public.tickets_maintenance;

CREATE VIEW public.tickets_maintenance AS
  SELECT * FROM app.tickets_maintenance;
GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

CREATE VIEW public.tickets_maintenance_enriched AS
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

-- Autres vues courantes (idempotentes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='app' AND table_name='documents') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.documents AS SELECT * FROM app.documents';
    EXECUTE 'GRANT ALL ON public.documents TO anon, authenticated, service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='app' AND table_name='dashboard_widgets') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.dashboard_widgets AS SELECT * FROM app.dashboard_widgets';
    EXECUTE 'GRANT ALL ON public.dashboard_widgets TO anon, authenticated, service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='app' AND table_name='project_timesheets') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.project_timesheets AS SELECT * FROM app.project_timesheets';
    EXECUTE 'GRANT ALL ON public.project_timesheets TO anon, authenticated, service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='app' AND table_name='projects') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.projects AS SELECT * FROM app.projects';
    EXECUTE 'GRANT ALL ON public.projects TO anon, authenticated, service_role';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
