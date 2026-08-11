-- Colonnes Storage pour la GED réelle
ALTER TABLE app.documents
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Recréer la vue public pour exposer les nouvelles colonnes
CREATE OR REPLACE VIEW public.documents AS
  SELECT * FROM app.documents;
