-- =============================================================================
-- Fix RLS tickets / rôle JWT manquant
-- =============================================================================
-- Problème : app.current_user_role() ne lit que le JWT (app_metadata / user_metadata).
-- Le RoleSwitcher frontend et beaucoup de comptes Auth n'y mettent pas `role`.
-- Résultat : is_syndicat_staff() = false → 0 ticket visible (alors que /contacts marche,
-- car sa RLS ne filtre que sur organization_id).
--
-- Correctif :
-- 1. Résoudre le rôle (et la commune) aussi depuis app.users via email JWT.
-- 2. Résoudre organization_id depuis app.users si absent du JWT.
-- 3. Recréer la vue enrichie en security_invoker pour appliquer la RLS correctement.
-- =============================================================================

-- Rôle : JWT puis profil app.users
CREATE OR REPLACE FUNCTION app.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    (
      SELECT u.role
      FROM app.users u
      WHERE auth.jwt() ->> 'email' IS NOT NULL
        AND lower(u.email) = lower(auth.jwt() ->> 'email')
        AND u.active = true
      ORDER BY u.created_at ASC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION app.current_user_commune_insee_code()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'commune_insee_code', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'commune_insee_code', ''),
    (
      SELECT u.commune_insee_code
      FROM app.users u
      WHERE auth.jwt() ->> 'email' IS NOT NULL
        AND lower(u.email) = lower(auth.jwt() ->> 'email')
        AND u.active = true
      ORDER BY u.created_at ASC
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION app.is_syndicat_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT COALESCE(app.current_user_role(), '') IN ('DGS', 'DST', 'Chargé d''Affaires');
$$;

CREATE OR REPLACE FUNCTION app.is_commune_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT COALESCE(app.current_user_role(), '') = 'COMMUNE';
$$;

CREATE OR REPLACE FUNCTION app.is_prestataire_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT COALESCE(app.current_user_role(), '') = 'Prestataire Extérieur';
$$;

-- organization_id : claims JWT puis profil app.users
CREATE OR REPLACE FUNCTION administration.current_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = administration, app, public
AS $$
DECLARE
  v_org_id UUID;
  v_claims JSON;
  v_email TEXT;
BEGIN
  BEGIN
    v_org_id := NULLIF(current_setting('app.current_organization_id', true), '')::uuid;
    IF v_org_id IS NOT NULL THEN
      RETURN v_org_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::json;
    IF v_claims IS NOT NULL THEN
      v_org_id := NULLIF(v_claims->'app_metadata'->>'organization_id', '')::uuid;
      IF v_org_id IS NOT NULL THEN
        RETURN v_org_id;
      END IF;

      v_org_id := NULLIF(v_claims->'user_metadata'->>'organization_id', '')::uuid;
      IF v_org_id IS NOT NULL THEN
        RETURN v_org_id;
      END IF;

      v_org_id := NULLIF(v_claims->>'organization_id', '')::uuid;
      IF v_org_id IS NOT NULL THEN
        RETURN v_org_id;
      END IF;

      v_email := NULLIF(v_claims->>'email', '');
      IF v_email IS NOT NULL THEN
        SELECT u.organization_id INTO v_org_id
        FROM app.users u
        WHERE lower(u.email) = lower(v_email)
          AND u.active = true
        ORDER BY u.created_at ASC
        LIMIT 1;
        IF v_org_id IS NOT NULL THEN
          RETURN v_org_id;
        END IF;
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$;

-- Vue enrichie : exécutée avec les droits de l'appelant (RLS réelle)
DROP VIEW IF EXISTS public.tickets_maintenance_enriched;

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

-- Même principe pour la vue CRUD tickets (mutations + lectures directes)
DROP VIEW IF EXISTS public.tickets_maintenance;

CREATE VIEW public.tickets_maintenance
WITH (security_invoker = true)
AS
  SELECT * FROM app.tickets_maintenance;

GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
