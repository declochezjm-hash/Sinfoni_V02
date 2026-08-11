-- Galerie photos terrain : avant / après travaux par chantier

CREATE TABLE IF NOT EXISTS app.project_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  tag             TEXT NOT NULL CHECK (tag IN ('avant', 'apres')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_photos_organization
  ON app.project_photos (organization_id);

CREATE INDEX IF NOT EXISTS idx_project_photos_project
  ON app.project_photos (project_id);

CREATE INDEX IF NOT EXISTS idx_project_photos_tag
  ON app.project_photos (project_id, tag);

CREATE TRIGGER tr_project_photos_set_organization
  BEFORE INSERT ON app.project_photos
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

ALTER TABLE app.project_photos DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.project_photos AS
  SELECT * FROM app.project_photos;

GRANT ALL ON public.project_photos TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
