-- Sécurité : s'assurer que la colonne existe dans app.contacts (ou administration.contacts)
ALTER TABLE app.contacts ADD COLUMN IF NOT EXISTS electrical_habilitations text[] DEFAULT '{}';