-- Suivi main-d'œuvre : interrupteur par chantier + feuilles de temps
ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS enable_time_tracking BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS app.project_timesheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL DEFAULT '',
  user_name       TEXT NOT NULL DEFAULT '',
  hours           NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_timesheets_organization
  ON app.project_timesheets (organization_id);

CREATE INDEX IF NOT EXISTS idx_project_timesheets_project
  ON app.project_timesheets (project_id);

CREATE TRIGGER tr_project_timesheets_set_organization
  BEFORE INSERT ON app.project_timesheets
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

ALTER TABLE app.project_timesheets DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

CREATE OR REPLACE VIEW public.project_timesheets AS
  SELECT * FROM app.project_timesheets;

GRANT ALL ON public.project_timesheets TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
