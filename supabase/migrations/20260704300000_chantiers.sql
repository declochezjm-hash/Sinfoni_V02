-- Chantiers (sites) — table métier + lien tickets maintenance

-- ── 1. Habilitations contacts (idempotent) ────────────────────────────────────

ALTER TABLE app.contacts
  ADD COLUMN IF NOT EXISTS electrical_habilitations TEXT[] DEFAULT '{}';

UPDATE app.contacts
SET electrical_habilitations = '{}'
WHERE electrical_habilitations IS NULL;

-- ── 2. Table chantiers ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.chantiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  code            TEXT,
  name            TEXT NOT NULL,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'en_cours',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chantiers_organization ON app.chantiers (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chantiers_org_code
  ON app.chantiers (organization_id, code)
  WHERE code IS NOT NULL;

CREATE TRIGGER tr_chantiers_set_organization
  BEFORE INSERT ON app.chantiers
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

-- ── 3. Lien tickets → chantier ───────────────────────────────────────────────

ALTER TABLE app.tickets_maintenance
  ADD COLUMN IF NOT EXISTS chantier_id UUID REFERENCES app.chantiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_chantier
  ON app.tickets_maintenance (chantier_id)
  WHERE chantier_id IS NOT NULL;

-- ── 4. RLS (isolation organisation) ─────────────────────────────────────────

ALTER TABLE app.chantiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chantiers_org ON app.chantiers;

CREATE POLICY chantiers_org ON app.chantiers
  FOR ALL
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

-- ── 5. Vue API public ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.chantiers AS
  SELECT * FROM app.chantiers;

GRANT ALL ON public.chantiers TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
