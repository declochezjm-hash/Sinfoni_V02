-- Rafraîchir la vue exposée à PostgREST après ajout de latitude/longitude sur app.projects
CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

NOTIFY pgrst, 'reload schema';
