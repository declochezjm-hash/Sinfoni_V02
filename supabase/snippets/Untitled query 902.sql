-- 1. Ajout des colonnes de coordonnées si elles sont absentes
ALTER TABLE app.chantiers ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE app.chantiers ADD COLUMN IF NOT EXISTS longitude double precision;

-- 2. Injection des coordonnées GPS de démo
UPDATE app.chantiers 
SET 
    latitude = CASE 
        WHEN code = 'CH-2026-001' THEN 48.8566 
        WHEN code = 'CH-2026-002' THEN 48.8606 
        WHEN code = 'CH-2026-003' THEN 48.8526 
        ELSE 48.8566
    END,
    longitude = CASE 
        WHEN code = 'CH-2026-001' THEN 2.3522 
        WHEN code = 'CH-2026-002' THEN 2.3376 
        WHEN code = 'CH-2026-003' THEN 2.3444 
        ELSE 2.3522
    END
WHERE organization_id = '00000000-0000-0000-0000-000000000001';