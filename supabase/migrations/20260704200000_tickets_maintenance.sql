-- Signalement Terrain & Maintenance — tickets d'anomalies sur actifs IRVE / éclairage

-- ── 1. Table métier ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.tickets_maintenance (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL DEFAULT '',
  status                  TEXT NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority                TEXT NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  asset_id                UUID NOT NULL REFERENCES app.energy_assets(id) ON DELETE RESTRICT,
  commune_insee_code      TEXT NOT NULL,
  created_by              UUID NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  assigned_to_provider_id UUID REFERENCES app.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_organization
  ON app.tickets_maintenance (organization_id);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_commune
  ON app.tickets_maintenance (commune_insee_code);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_asset
  ON app.tickets_maintenance (asset_id);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_status
  ON app.tickets_maintenance (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_provider
  ON app.tickets_maintenance (assigned_to_provider_id)
  WHERE assigned_to_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_created_by
  ON app.tickets_maintenance (created_by);

CREATE TRIGGER tr_tickets_maintenance_set_organization
  BEFORE INSERT ON app.tickets_maintenance
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_tickets_maintenance_updated_at
  BEFORE UPDATE ON app.tickets_maintenance
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ── 2. Helpers JWT / rôles (idempotents) ────────────────────────────────────

CREATE OR REPLACE FUNCTION app.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, administration, public
AS $$
  SELECT u.id
  FROM app.users u
  WHERE u.email = auth.jwt() ->> 'email'
    AND (
      administration.current_organization_id() IS NULL
      OR u.organization_id = administration.current_organization_id()
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.is_syndicat_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app.current_user_role() IN ('DGS', 'DST', 'Chargé d''Affaires');
$$;

CREATE OR REPLACE FUNCTION app.is_prestataire_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app.current_user_role() = 'Prestataire Extérieur';
$$;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE app.tickets_maintenance ENABLE ROW LEVEL SECURITY;

-- DGS, DST, Chargés d'Affaires : gestion complète des tickets du réseau (org courante)
DROP POLICY IF EXISTS tickets_maintenance_syndicat_staff ON app.tickets_maintenance;

CREATE POLICY tickets_maintenance_syndicat_staff ON app.tickets_maintenance
  FOR ALL
  USING (
    app.is_syndicat_staff()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
  )
  WITH CHECK (
    app.is_syndicat_staff()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
  );

-- COMMUNE : lecture des tickets de sa commune
DROP POLICY IF EXISTS tickets_maintenance_commune_select ON app.tickets_maintenance;

CREATE POLICY tickets_maintenance_commune_select ON app.tickets_maintenance
  FOR SELECT
  USING (
    app.is_commune_user()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND commune_insee_code = app.current_user_commune_insee_code()
  );

-- COMMUNE : création de tickets sur le patrimoine de sa commune
DROP POLICY IF EXISTS tickets_maintenance_commune_insert ON app.tickets_maintenance;

CREATE POLICY tickets_maintenance_commune_insert ON app.tickets_maintenance
  FOR INSERT
  WITH CHECK (
    app.is_commune_user()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND commune_insee_code = app.current_user_commune_insee_code()
    AND created_by = app.current_app_user_id()
    AND EXISTS (
      SELECT 1
      FROM app.energy_assets ea
      WHERE ea.id = asset_id
        AND ea.commune_insee_code = app.current_user_commune_insee_code()
        AND (
          administration.current_organization_id() IS NULL
          OR ea.organization_id = administration.current_organization_id()
        )
    )
  );

-- Prestataire Extérieur : consultation des tickets qui lui sont assignés
DROP POLICY IF EXISTS tickets_maintenance_prestataire_select ON app.tickets_maintenance;

CREATE POLICY tickets_maintenance_prestataire_select ON app.tickets_maintenance
  FOR SELECT
  USING (
    app.is_prestataire_user()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND assigned_to_provider_id = app.current_app_user_id()
  );

-- Prestataire Extérieur : mise à jour (statut, suivi) des tickets assignés
DROP POLICY IF EXISTS tickets_maintenance_prestataire_update ON app.tickets_maintenance;

CREATE POLICY tickets_maintenance_prestataire_update ON app.tickets_maintenance
  FOR UPDATE
  USING (
    app.is_prestataire_user()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND assigned_to_provider_id = app.current_app_user_id()
  )
  WITH CHECK (
    app.is_prestataire_user()
    AND (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND assigned_to_provider_id = app.current_app_user_id()
  );

-- ── 4. Vue API public ─────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.tickets_maintenance AS
  SELECT * FROM app.tickets_maintenance;

GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

-- ── 5. Données de démo — signalement sur borne IRVE en panne (Arles 13004) ───

INSERT INTO app.tickets_maintenance (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  asset_id,
  commune_insee_code,
  created_by,
  assigned_to_provider_id
)
SELECT
  '22222222-2222-2222-2222-222222222201',
  '00000000-0000-0000-0000-000000000001',
  'Borne IRVE hors service — Parking République',
  'La borne ne charge plus depuis 48 h. Voyant rouge fixe. Signalement élu commune.',
  'in_progress',
  'high',
  ea.id,
  '13004',
  '11111111-1111-1111-1111-111111111105',
  '11111111-1111-1111-1111-111111111104'
FROM app.energy_assets ea
WHERE ea.organization_id = '00000000-0000-0000-0000-000000000001'
  AND ea.name = 'Borne IRVE — Parking République'
  AND ea.commune_insee_code = '13004'
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
