-- Statut « À planifier » et colonnes géographiques pour les affaires
ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE app.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'Brouillon', 'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé', 'À planifier'
  ));