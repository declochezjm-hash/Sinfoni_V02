-- 1. Colonnes et contrainte sur la table physique (app.projects)
ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE app.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'Brouillon', 'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé', 'À planifier'
  ));

-- 2. Rafraîchir la vue PostgREST (SELECT * figé à la création initiale)
CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

-- 3. Forcer PostgREST à recréer son cache
NOTIFY pgrst, 'reload schema';
