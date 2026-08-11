-- 1. On supprime définitivement l'ancienne contrainte qui bloque
ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. On applique la colonne PPI pour la suite (Fonctionnalité 4)
ALTER TABLE app.projects ADD COLUMN IF NOT EXISTS ppi_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_projects_ppi_year ON app.projects (ppi_year)
  WHERE ppi_year IS NOT NULL;

-- 3. On force le rechargement pour Supabase
NOTIFY pgrst, 'reload schema';