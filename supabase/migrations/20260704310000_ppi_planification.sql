-- PPI pluriannuelle + géo/budget chantiers + ppi_year sur affaires

-- ── 1. Enrichissement chantiers ───────────────────────────────────────────────

ALTER TABLE app.chantiers
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS budget_total NUMERIC(14, 2) NOT NULL DEFAULT 0;

-- ── 2. Année PPI sur affaires (dashboard /ppi) ────────────────────────────────

ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS ppi_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_ppi_year
  ON app.projects (ppi_year)
  WHERE ppi_year IS NOT NULL;

-- ── 3. Planification PPI pluriannuelle ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.ppi_planification (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  chantier_id       UUID REFERENCES app.chantiers(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES app.projects(id) ON DELETE SET NULL,
  exercise_year     INTEGER NOT NULL CHECK (exercise_year >= 2000 AND exercise_year <= 2100),
  enveloppe_votee   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  engage            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  realise           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'Envisagé',
  financing_note    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ppi_planification_chantier_or_project CHECK (
    chantier_id IS NOT NULL OR project_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ppi_planification_chantier_year
  ON app.ppi_planification (chantier_id, exercise_year)
  WHERE chantier_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ppi_planification_project_year
  ON app.ppi_planification (project_id, exercise_year)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ppi_planification_organization
  ON app.ppi_planification (organization_id);

CREATE INDEX IF NOT EXISTS idx_ppi_planification_year
  ON app.ppi_planification (exercise_year);

DROP TRIGGER IF EXISTS tr_ppi_planification_set_organization ON app.ppi_planification;
CREATE TRIGGER tr_ppi_planification_set_organization
  BEFORE INSERT ON app.ppi_planification
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

ALTER TABLE app.ppi_planification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ppi_planification_org ON app.ppi_planification;
CREATE POLICY ppi_planification_org ON app.ppi_planification
  FOR ALL
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

-- ── 4. Vues API public ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.chantiers AS
  SELECT * FROM app.chantiers;

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

CREATE OR REPLACE VIEW public.ppi_planification AS
  SELECT * FROM app.ppi_planification;

GRANT ALL ON public.chantiers TO anon, authenticated, service_role;
GRANT ALL ON public.projects TO anon, authenticated, service_role;
GRANT ALL ON public.ppi_planification TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
