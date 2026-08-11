-- 1. Ajout des colonnes de géolocalisation sur la table des projets
ALTER TABLE app.projects 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Optionnel : Mettre à jour un projet existant avec de vraies coordonnées (Ex: Arles) pour tester la carte
UPDATE app.projects 
SET latitude = 43.6766, longitude = 4.6278
WHERE id = (SELECT id FROM app.projects LIMIT 1);