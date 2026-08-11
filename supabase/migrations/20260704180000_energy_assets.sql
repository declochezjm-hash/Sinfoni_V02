-- Patrimoine énergétique hors chantiers : bornes IRVE & armoires d'éclairage public

CREATE TABLE IF NOT EXISTS app.energy_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  commune_insee_code  TEXT NOT NULL,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('irve', 'eclairage')),
  status              TEXT NOT NULL DEFAULT 'functional'
                        CHECK (status IN ('functional', 'maintenance', 'broken')),
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_energy_assets_organization
  ON app.energy_assets (organization_id);

CREATE INDEX IF NOT EXISTS idx_energy_assets_commune
  ON app.energy_assets (commune_insee_code);

CREATE INDEX IF NOT EXISTS idx_energy_assets_type
  ON app.energy_assets (organization_id, type);

CREATE INDEX IF NOT EXISTS idx_energy_assets_geo
  ON app.energy_assets (latitude, longitude);

CREATE TRIGGER tr_energy_assets_set_organization
  BEFORE INSERT ON app.energy_assets
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_energy_assets_updated_at
  BEFORE UPDATE ON app.energy_assets
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ── Helpers JWT pour RLS (idempotent — créés aussi par commune_portal) ────────

CREATE OR REPLACE FUNCTION app.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
$$;

CREATE OR REPLACE FUNCTION app.current_user_commune_insee_code()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'commune_insee_code',
    auth.jwt() -> 'user_metadata' ->> 'commune_insee_code'
  );
$$;

CREATE OR REPLACE FUNCTION app.is_commune_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app.current_user_role() = 'COMMUNE';
$$;

-- ── RLS (même logique que app.projects : filtre commune pour le portail élu) ──

ALTER TABLE app.energy_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS energy_assets_org_and_commune ON app.energy_assets;

CREATE POLICY energy_assets_org_and_commune ON app.energy_assets
  FOR ALL
  USING (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT app.is_commune_user()
      OR commune_insee_code = app.current_user_commune_insee_code()
    )
  )
  WITH CHECK (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT app.is_commune_user()
      OR commune_insee_code = app.current_user_commune_insee_code()
    )
  );

CREATE OR REPLACE VIEW public.energy_assets AS
  SELECT * FROM app.energy_assets;

GRANT ALL ON public.energy_assets TO anon, authenticated, service_role;

-- ── Données de démo — Arles (INSEE 13004) ───────────────────────────────────

INSERT INTO app.energy_assets (
  organization_id, commune_insee_code, name, type, status, latitude, longitude, metadata
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '13004',
    'Borne IRVE — Place Lamartine',
    'irve',
    'functional',
    43.6780,
    4.6290,
    '{"power_kw": 22, "connector_type": "Type 2", "nb_prises": 2}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '13004',
    'Borne IRVE — Parking République',
    'irve',
    'broken',
    43.6755,
    4.6260,
    '{"power_kw": 7.4, "connector_type": "Type 2 Combo", "nb_prises": 1}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '13004',
    'Armoire EP — Boulevard Georges Clemenceau',
    'eclairage',
    'functional',
    43.6770,
    4.6310,
    '{"circuit_count": 12, "total_power_w": 3000, "nb_foyers": 48}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '13004',
    'Armoire EP — Rue du Refuge',
    'eclairage',
    'maintenance',
    43.6740,
    4.6250,
    '{"circuit_count": 8, "total_power_w": 2000, "nb_foyers": 32}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '13004',
    'Armoire EP — Arènes d''Arles',
    'eclairage',
    'functional',
    43.6790,
    4.6240,
    '{"circuit_count": 16, "total_power_w": 4000, "nb_foyers": 64}'::jsonb
  )
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
