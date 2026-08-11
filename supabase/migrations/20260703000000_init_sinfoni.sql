-- =============================================================================
-- Sinfoni — Migration initiale multi-tenant
-- Architecture : administration (tenants) | app (métier) | public (vues API)
-- Modèle inspiré de GisForge CRM — version allégée pour prototypage local
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Nettoyage du schéma legacy (projet bolt.new mono-tenant public.*)
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.users CASCADE;

DROP TABLE IF EXISTS public.dashboard_widgets CASCADE;
DROP TABLE IF EXISTS public.saved_reports CASCADE;
DROP TABLE IF EXISTS public.field_photos CASCADE;
DROP TABLE IF EXISTS public.signatures CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.workflow_steps CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ---------------------------------------------------------------------------
-- 1. Schémas & extensions
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS administration;
CREATE SCHEMA IF NOT EXISTS app;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 2. Schéma administration — gestion multi-tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS administration.organization (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organisation par défaut pour le développement local
INSERT INTO administration.organization (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sinfoni Dev')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Helpers organisation (contexte JWT / session / fallback dev)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION administration.dev_default_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = administration, public
AS $$
  SELECT id
  FROM administration.organization
  ORDER BY created_at
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION administration.current_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = administration, public
AS $$
DECLARE
  v_org_id UUID;
  v_claims JSON;
BEGIN
  -- Override session (utile en scripts locaux / tests)
  BEGIN
    v_org_id := NULLIF(current_setting('app.current_organization_id', true), '')::uuid;
    IF v_org_id IS NOT NULL THEN
      RETURN v_org_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  -- JWT Supabase : app_metadata ou user_metadata
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
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger léger : injecte organization_id sans quota ni validation croisée bloquante
CREATE OR REPLACE FUNCTION app.set_sinfoni_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, administration, public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(
      administration.current_organization_id(),
      administration.dev_default_organization_id()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Schéma app — tables métier Sinfoni
-- ---------------------------------------------------------------------------

CREATE TABLE app.projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  reference         TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  type              TEXT NOT NULL CHECK (type IN ('Électricité', 'Éclairage Public', 'Télécom', 'IRVE')),
  status            TEXT NOT NULL CHECK (status IN ('Brouillon', 'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé')),
  budget_total      INTEGER NOT NULL DEFAULT 0,
  budget_consumed   INTEGER NOT NULL DEFAULT 0,
  start_date        DATE,
  expected_end_date DATE,
  actual_end_date   DATE,
  owner_id          TEXT NOT NULL DEFAULT '',
  owner_name        TEXT NOT NULL DEFAULT '',
  contractor_id     TEXT,
  contractor_name   TEXT,
  location          TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, reference)
);

CREATE TABLE app.workflow_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  step_key        TEXT NOT NULL,
  step_label      TEXT NOT NULL,
  step_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'skipped')) DEFAULT 'pending',
  completed_at    TIMESTAMPTZ,
  completed_by    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('Administratif', 'Technique', 'Financier')),
  size            TEXT NOT NULL DEFAULT '',
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL DEFAULT '',
  user_name       TEXT NOT NULL DEFAULT '',
  user_role       TEXT NOT NULL DEFAULT '',
  action          TEXT NOT NULL DEFAULT '',
  target_type     TEXT NOT NULL CHECK (target_type IN ('project', 'document', 'workflow', 'user')),
  target_id       TEXT NOT NULL DEFAULT '',
  target_label    TEXT NOT NULL DEFAULT '',
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL DEFAULT '',
  title             TEXT NOT NULL DEFAULT '',
  message           TEXT NOT NULL DEFAULT '',
  type              TEXT NOT NULL CHECK (type IN ('budget_alert', 'delay_alert', 'validation_alert', 'system')) DEFAULT 'system',
  read              BOOLEAN NOT NULL DEFAULT false,
  project_id        TEXT,
  project_reference TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.signatures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id        TEXT NOT NULL,
  project_reference TEXT NOT NULL DEFAULT '',
  document_name     TEXT NOT NULL DEFAULT '',
  signer_name       TEXT NOT NULL DEFAULT '',
  signer_role       TEXT NOT NULL DEFAULT '',
  signature_data    TEXT NOT NULL DEFAULT '',
  signature_type    TEXT NOT NULL CHECK (signature_type IN ('draw', 'type', 'upload')) DEFAULT 'type',
  signed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.field_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id        TEXT NOT NULL,
  project_reference TEXT NOT NULL DEFAULT '',
  photo_url         TEXT NOT NULL DEFAULT '',
  caption           TEXT NOT NULL DEFAULT '',
  taken_by          TEXT NOT NULL DEFAULT '',
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  gps_lat           DOUBLE PRECISION,
  gps_lng           DOUBLE PRECISION
);

CREATE TABLE app.saved_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  filters         JSONB NOT NULL DEFAULT '{}',
  columns         TEXT[] NOT NULL DEFAULT '{}',
  created_by      TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at     TIMESTAMPTZ
);

CREATE TABLE app.dashboard_widgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL DEFAULT '',
  widget_key      TEXT NOT NULL DEFAULT '',
  position        INTEGER NOT NULL DEFAULT 0,
  visible         BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (organization_id, user_id, widget_key)
);

CREATE TABLE app.users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('DGS', 'DST', 'Chargé d''Affaires', 'Prestataire Extérieur')),
  avatar          TEXT NOT NULL DEFAULT '',
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

-- ---------------------------------------------------------------------------
-- 5. Index multi-tenant
-- ---------------------------------------------------------------------------

CREATE INDEX idx_projects_organization ON app.projects (organization_id);
CREATE INDEX idx_workflow_steps_organization ON app.workflow_steps (organization_id);
CREATE INDEX idx_workflow_steps_project ON app.workflow_steps (project_id);
CREATE INDEX idx_documents_organization ON app.documents (organization_id);
CREATE INDEX idx_documents_project ON app.documents (project_id);
CREATE INDEX idx_activity_logs_organization ON app.activity_logs (organization_id);
CREATE INDEX idx_notifications_organization ON app.notifications (organization_id);
CREATE INDEX idx_signatures_organization ON app.signatures (organization_id);
CREATE INDEX idx_field_photos_organization ON app.field_photos (organization_id);
CREATE INDEX idx_saved_reports_organization ON app.saved_reports (organization_id);
CREATE INDEX idx_dashboard_widgets_organization ON app.dashboard_widgets (organization_id);
CREATE INDEX idx_users_organization ON app.users (organization_id);

-- ---------------------------------------------------------------------------
-- 6. Triggers updated_at & organization_id
-- ---------------------------------------------------------------------------

CREATE TRIGGER tr_projects_updated
  BEFORE UPDATE ON app.projects
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER tr_documents_updated
  BEFORE UPDATE ON app.documents
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER tr_users_updated
  BEFORE UPDATE ON app.users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER tr_projects_set_organization
  BEFORE INSERT ON app.projects
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_workflow_steps_set_organization
  BEFORE INSERT ON app.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_documents_set_organization
  BEFORE INSERT ON app.documents
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_activity_logs_set_organization
  BEFORE INSERT ON app.activity_logs
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_notifications_set_organization
  BEFORE INSERT ON app.notifications
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_signatures_set_organization
  BEFORE INSERT ON app.signatures
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_field_photos_set_organization
  BEFORE INSERT ON app.field_photos
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_saved_reports_set_organization
  BEFORE INSERT ON app.saved_reports
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_dashboard_widgets_set_organization
  BEFORE INSERT ON app.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_users_set_organization
  BEFORE INSERT ON app.users
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

-- ---------------------------------------------------------------------------
-- 7. RLS désactivée sur app (prototypage local)
-- ---------------------------------------------------------------------------

ALTER TABLE app.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.workflow_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.signatures DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.field_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.saved_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.dashboard_widgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.users DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. Vues public — surface PostgREST (aucune table réelle dans public)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.organizations AS
  SELECT id, name, created_at
  FROM administration.organization;

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

CREATE OR REPLACE VIEW public.workflow_steps AS
  SELECT * FROM app.workflow_steps;

CREATE OR REPLACE VIEW public.documents AS
  SELECT * FROM app.documents;

CREATE OR REPLACE VIEW public.activity_logs AS
  SELECT * FROM app.activity_logs;

CREATE OR REPLACE VIEW public.notifications AS
  SELECT * FROM app.notifications;

CREATE OR REPLACE VIEW public.signatures AS
  SELECT * FROM app.signatures;

CREATE OR REPLACE VIEW public.field_photos AS
  SELECT * FROM app.field_photos;

CREATE OR REPLACE VIEW public.saved_reports AS
  SELECT * FROM app.saved_reports;

CREATE OR REPLACE VIEW public.dashboard_widgets AS
  SELECT * FROM app.dashboard_widgets;

CREATE OR REPLACE VIEW public.users AS
  SELECT * FROM app.users;

-- ---------------------------------------------------------------------------
-- 9. Droits d'accès initiaux
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA administration TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON administration.organization TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

GRANT ALL ON public.organizations TO anon, authenticated, service_role;
GRANT ALL ON public.projects TO anon, authenticated, service_role;
GRANT ALL ON public.workflow_steps TO anon, authenticated, service_role;
GRANT ALL ON public.documents TO anon, authenticated, service_role;
GRANT ALL ON public.activity_logs TO anon, authenticated, service_role;
GRANT ALL ON public.notifications TO anon, authenticated, service_role;
GRANT ALL ON public.signatures TO anon, authenticated, service_role;
GRANT ALL ON public.field_photos TO anon, authenticated, service_role;
GRANT ALL ON public.saved_reports TO anon, authenticated, service_role;
GRANT ALL ON public.dashboard_widgets TO anon, authenticated, service_role;
GRANT ALL ON public.users TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. Données de démo (organisation Sinfoni Dev)
-- ---------------------------------------------------------------------------

INSERT INTO app.users (id, organization_id, name, email, role, avatar) VALUES
  ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'Marie Lefranc', 'm.lefranc@syndicat.fr', 'DGS', 'ML'),
  ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000001', 'Pierre Durand', 'p.durand@syndicat.fr', 'DST', 'PD'),
  ('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000001', 'Sophie Bernard', 's.bernard@syndicat.fr', 'Chargé d''Affaires', 'SB'),
  ('11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000001', 'Jean Moreau', 'j.moreau@presta.fr', 'Prestataire Extérieur', 'JM')
ON CONFLICT (organization_id, email) DO NOTHING;
