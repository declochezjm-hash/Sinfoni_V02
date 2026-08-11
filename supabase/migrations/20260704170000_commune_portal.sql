-- Portail des Communes — rôle COMMUNE, localisation INSEE, demandes de travaux

-- ── 1. Étendre app.users ──────────────────────────────────────────────────────

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS commune_insee_code TEXT;

ALTER TABLE app.users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE app.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN (
    'DGS',
    'DST',
    'Chargé d''Affaires',
    'Prestataire Extérieur',
    'COMMUNE'
  ));

CREATE INDEX IF NOT EXISTS idx_users_commune_insee
  ON app.users (commune_insee_code)
  WHERE commune_insee_code IS NOT NULL;

-- ── 2. Étendre app.projects ─────────────────────────────────────────────────

ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS commune_insee_code TEXT;

ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS source_demand TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_commune_insee
  ON app.projects (commune_insee_code)
  WHERE commune_insee_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_commune_geo
  ON app.projects (commune_insee_code, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_source_demand
  ON app.projects (source_demand)
  WHERE source_demand IS NOT NULL;

-- ── 3. Helpers JWT pour RLS ─────────────────────────────────────────────────

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

-- ── 4. RLS sur app.projects ───────────────────────────────────────────────────

ALTER TABLE app.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_org_isolation ON app.projects;
DROP POLICY IF EXISTS projects_commune_filter ON app.projects;
DROP POLICY IF EXISTS projects_org_and_commune ON app.projects;

CREATE POLICY projects_org_and_commune ON app.projects
  FOR ALL
  USING (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT app.is_commune_user()
      OR (
        commune_insee_code IS NOT NULL
        AND commune_insee_code = app.current_user_commune_insee_code()
      )
    )
  )
  WITH CHECK (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT app.is_commune_user()
      OR (
        commune_insee_code IS NOT NULL
        AND commune_insee_code = app.current_user_commune_insee_code()
      )
    )
  );

-- ── 5. RLS sur app.users (lecture filtrée pour communes) ──────────────────────

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_org_isolation ON app.users;
DROP POLICY IF EXISTS users_self_or_staff ON app.users;

CREATE POLICY users_self_or_staff ON app.users
  FOR SELECT
  USING (
    (
      administration.current_organization_id() IS NULL
      OR organization_id = administration.current_organization_id()
    )
    AND (
      NOT app.is_commune_user()
      OR email = auth.jwt() ->> 'email'
    )
  );

-- ── 6. Recréer les vues public ────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.users AS
  SELECT * FROM app.users;

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT ALL ON public.projects TO anon, authenticated, service_role;

-- ── 7. Données de démo — élu commune d'Arles (13004) ─────────────────────────

INSERT INTO app.users (id, organization_id, name, email, role, avatar, commune_insee_code)
VALUES (
  '11111111-1111-1111-1111-111111111105',
  '00000000-0000-0000-0000-000000000001',
  'Claire Martin',
  'c.martin@mairie-arles.fr',
  'COMMUNE',
  'CM',
  '13004'
)
ON CONFLICT (organization_id, email) DO UPDATE
  SET role = EXCLUDED.role,
      commune_insee_code = EXCLUDED.commune_insee_code,
      name = EXCLUDED.name,
      avatar = EXCLUDED.avatar;

-- Taguer quelques projets existants avec le code INSEE d'Arles pour les tests
UPDATE app.projects
SET commune_insee_code = '13004'
WHERE organization_id = '00000000-0000-0000-0000-000000000001'
  AND commune_insee_code IS NULL
  AND id IN (
    SELECT id FROM app.projects
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'
    ORDER BY created_at
    LIMIT 4
  );

NOTIFY pgrst, 'reload schema';
