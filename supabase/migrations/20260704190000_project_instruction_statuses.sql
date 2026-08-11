-- Statuts d'instruction financière (En Étude, Proposé, Validé)
ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE app.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'Brouillon', 'En Étude', 'Proposé', 'Validé',
    'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé', 'À planifier'
  ));

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

NOTIFY pgrst, 'reload schema';
