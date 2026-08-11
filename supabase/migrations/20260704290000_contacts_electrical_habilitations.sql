-- Habilitations électriques sur les contacts (techniciens)
-- Table : app.contacts (schéma métier Sinfoni, pas administration)

ALTER TABLE app.contacts
  ADD COLUMN IF NOT EXISTS electrical_habilitations TEXT[] DEFAULT '{}';

-- Normaliser les lignes existantes
UPDATE app.contacts
SET electrical_habilitations = '{}'
WHERE electrical_habilitations IS NULL;

CREATE OR REPLACE VIEW public.contacts AS
  SELECT * FROM app.contacts;

GRANT ALL ON public.contacts TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
