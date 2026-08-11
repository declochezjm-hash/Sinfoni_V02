-- Catalogue BPU (Bordereau de Prix Unitaires) + lignes de devis par chantier

CREATE TABLE IF NOT EXISTS app.bpu_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  designation     TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'U',
  unit_price_ht   NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bpu_catalog_organization
  ON app.bpu_catalog (organization_id);

CREATE TRIGGER tr_bpu_catalog_set_organization
  BEFORE INSERT ON app.bpu_catalog
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

ALTER TABLE app.bpu_catalog DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS app.project_quote_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  bpu_id          UUID REFERENCES app.bpu_catalog(id) ON DELETE SET NULL,
  designation     TEXT NOT NULL,
  quantity        NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_ht   NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_quote_lines_organization
  ON app.project_quote_lines (organization_id);

CREATE INDEX IF NOT EXISTS idx_project_quote_lines_project
  ON app.project_quote_lines (project_id);

CREATE TRIGGER tr_project_quote_lines_set_organization
  BEFORE INSERT ON app.project_quote_lines
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

ALTER TABLE app.project_quote_lines DISABLE ROW LEVEL SECURITY;

-- Recalcule quote_amount_ht du projet à chaque modification de lignes
CREATE OR REPLACE FUNCTION app.sync_project_quote_amount_ht()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_project_id UUID;
  v_total      NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  SELECT COALESCE(SUM(quantity * unit_price_ht), 0)
  INTO v_total
  FROM app.project_quote_lines
  WHERE project_id = v_project_id;

  UPDATE app.projects
  SET quote_amount_ht = ROUND(v_total)::INTEGER,
      updated_at = now()
  WHERE id = v_project_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_project_quote_lines_sync_amount ON app.project_quote_lines;

CREATE TRIGGER tr_project_quote_lines_sync_amount
  AFTER INSERT OR UPDATE OR DELETE ON app.project_quote_lines
  FOR EACH ROW EXECUTE FUNCTION app.sync_project_quote_amount_ht();

CREATE OR REPLACE VIEW public.bpu_catalog AS
  SELECT * FROM app.bpu_catalog;

CREATE OR REPLACE VIEW public.project_quote_lines AS
  SELECT * FROM app.project_quote_lines;

GRANT ALL ON public.bpu_catalog TO anon, authenticated, service_role;
GRANT ALL ON public.project_quote_lines TO anon, authenticated, service_role;

-- Données de démonstration (organisation Sinfoni Dev)
INSERT INTO app.bpu_catalog (organization_id, designation, unit, unit_price_ht)
SELECT '00000000-0000-0000-0000-000000000001', v.designation, v.unit, v.unit_price_ht
FROM (VALUES
  ('Pose de compteur', 'U', 450.00::NUMERIC),
  ('Tirage de câble', 'm', 12.50::NUMERIC),
  ('Raccordement réseau', 'forfait', 850.00::NUMERIC)
) AS v(designation, unit, unit_price_ht)
WHERE NOT EXISTS (
  SELECT 1
  FROM app.bpu_catalog b
  WHERE b.organization_id = '00000000-0000-0000-0000-000000000001'
    AND b.designation = v.designation
);

NOTIFY pgrst, 'reload schema';
