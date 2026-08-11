-- Portail des Communes — rôle COMMUNE, localisation INSEE, demandes de travaux

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS commune_insee_code TEXT;

ALTER TABLE app.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE app.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('DGS','DST','Chargé d''Affaires','Prestataire Extérieur','COMMUNE'));

CREATE INDEX IF NOT EXISTS idx_users_commune_insee ON app.users (commune_insee_code)
  WHERE commune_insee_code IS NOT NULL;

ALTER TABLE app.projects ADD COLUMN IF NOT EXISTS commune_insee_code TEXT;
ALTER TABLE app.projects ADD COLUMN IF NOT EXISTS source_demand TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_commune_insee ON app.projects (commune_insee_code)
  WHERE commune_insee_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_commune_geo ON app.projects (commune_insee_code, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_source_demand ON app.projects (source_demand)
  WHERE source_demand IS NOT NULL;

-- Helpers JWT + RLS filtrant par commune_insee_code si rôle = COMMUNE
-- + seed élu Arles (INSEE 13004) + tag de 4 projets de démo