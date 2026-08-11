-- Suivi planning : dates de début et de fin prévue sur app.projects
-- (start_date et expected_end_date existent déjà depuis l'init ; migration idempotente)
ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS expected_end_date DATE;

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

NOTIFY pgrst, 'reload schema';
