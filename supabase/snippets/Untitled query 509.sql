-- 1. On nettoie proprement les anciens projets de test pour repartir à zéro
DELETE FROM app.projects WHERE reference IN ('AF-2026-001', 'AF-2026-002', 'AF-2026-003');

-- 2. Insertion de 3 affaires avec coordonnées réelles et données budgétaires
INSERT INTO app.projects (
  id, 
  organization_id, 
  reference, 
  title, 
  location, 
  latitude, 
  longitude, 
  status, 
  budget_total, 
  budget_consumed, 
  expected_end_date,
  created_at,
  updated_at
) VALUES 
-- Projet 1 : Arles (Alerte Budget ! Consommé > Total)
(
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM administration.organization LIMIT 1),
  'AF-2026-001',
  'Maintenance Photovoltaïque - Hangar Arles',
  'Arles, France',
  43.6766,
  4.6278,
  'En cours',
  50000,
  55000, -- Déclenche l'alerte budget
  '2026-12-31',
  NOW(),
  NOW()
),
-- Projet 2 : Nîmes (Alerte Délai ! Date de fin dépassée ou très proche)
(
  'b2222222-2222-2222-2222-222222222222',
  (SELECT id FROM administration.organization LIMIT 1),
  'AF-2026-002',
  'Rénovation Électrique - Centre Commercial Nîmes',
  'Nîmes, France',
  43.8367,
  4.3601,
  'En cours',
  120000,
  45000, 
  '2026-06-01', -- Déclenche l'alerte délai (on est en juillet 2026)
  NOW(),
  NOW()
),
-- Projet 3 : Montpellier (Tout est au vert)
(
  'c3333333-3333-3333-3333-333333333333',
  (SELECT id FROM administration.organization LIMIT 1),
  'AF-2026-003',
  'Audit Thermique - Complexe Sportif Montpellier',
  'Montpellier, France',
  43.6108,
  3.8767,
  'En cours',
  15000,
  2000, 
  '2027-03-15',
  NOW(),
  NOW()
);