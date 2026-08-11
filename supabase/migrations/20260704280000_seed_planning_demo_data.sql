-- Seed démo — Planning interactif & Maintenance (idempotent, réinjectable)

-- Constantes alignées sur Sinfoni Dev
-- Organisation : 00000000-0000-0000-0000-000000000001
-- Claire Martin (COMMUNE)  : 11111111-1111-1111-1111-111111111105
-- Jean Moreau (Prestataire): 11111111-1111-1111-1111-111111111104

-- ── 1. Techniciens avec habilitations variées ───────────────────────────────

-- Marc Durand — sans H0B0 (incompatible ticket IRVE démo)
UPDATE app.contacts
SET
  first_name = 'Marc',
  last_name = 'Durand',
  role = 'Technicien',
  department = 'Voirie',
  electrical_habilitations = ARRAY['B1V', 'BR', 'H1V']
WHERE email = 'm.durand@gsi-concept.fr'
  AND organization_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO app.contacts (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  department,
  parent_contact_id,
  electrical_habilitations
)
SELECT
  '33333333-3333-3333-3333-333333333301',
  '00000000-0000-0000-0000-000000000001',
  'Marc',
  'Durand',
  'm.durand@gsi-concept.fr',
  '04 90 00 10 11',
  'Technicien',
  'Voirie',
  mgr.id,
  ARRAY['B1V', 'BR', 'H1V']
FROM app.contacts mgr
WHERE mgr.email = 's.bernard@gsi-concept.fr'
  AND mgr.organization_id = '00000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM app.contacts c
    WHERE c.email = 'm.durand@gsi-concept.fr'
      AND c.organization_id = '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  parent_contact_id = EXCLUDED.parent_contact_id,
  electrical_habilitations = EXCLUDED.electrical_habilitations,
  updated_at = now();

-- Lucas Petit — habilité IRVE (H0B0)
INSERT INTO app.contacts (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  department,
  parent_contact_id,
  electrical_habilitations
)
SELECT
  '33333333-3333-3333-3333-333333333302',
  '00000000-0000-0000-0000-000000000001',
  'Lucas',
  'Petit',
  'l.petit@gsi-concept.fr',
  '04 90 00 10 12',
  'Technicien',
  'IRVE',
  mgr.id,
  ARRAY['B1V', 'B2V', 'BR', 'H0B0']
FROM app.contacts mgr
WHERE mgr.email = 's.bernard@gsi-concept.fr'
  AND mgr.organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  parent_contact_id = EXCLUDED.parent_contact_id,
  electrical_habilitations = EXCLUDED.electrical_habilitations,
  updated_at = now();

-- Nina Lambert — habilitations limitées (éclairage basique)
INSERT INTO app.contacts (
  id,
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  department,
  parent_contact_id,
  electrical_habilitations
)
SELECT
  '33333333-3333-3333-3333-333333333303',
  '00000000-0000-0000-0000-000000000001',
  'Nina',
  'Lambert',
  'n.lambert@gsi-concept.fr',
  '04 90 00 10 13',
  'Technicien',
  'Éclairage public',
  mgr.id,
  ARRAY['B1V', 'B2V']
FROM app.contacts mgr
WHERE mgr.email = 's.bernard@gsi-concept.fr'
  AND mgr.organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  parent_contact_id = EXCLUDED.parent_contact_id,
  electrical_habilitations = EXCLUDED.electrical_habilitations,
  updated_at = now();

-- Camille Rousseau — chargée d'affaires (habilitations partielles, non technicien IRVE)
UPDATE app.contacts
SET electrical_habilitations = ARRAY['B1V', 'B2V', 'BR']
WHERE email = 'c.rousseau@gsi-concept.fr'
  AND organization_id = '00000000-0000-0000-0000-000000000001';

-- ── 2. Tickets maintenance planifiés ────────────────────────────────────────

-- Ticket démo IRVE — requiert H0B0, assigné à Marc Durand (incompatibilité volontaire)
INSERT INTO app.tickets_maintenance (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  asset_id,
  commune_insee_code,
  created_by,
  assigned_to_provider_id,
  assigned_contact_id,
  scheduled_start,
  scheduled_end,
  duration_hours,
  required_habilitations
)
SELECT
  '22222222-2222-2222-2222-222222222201',
  '00000000-0000-0000-0000-000000000001',
  'Borne IRVE hors service — Parking République',
  'La borne ne charge plus depuis 48 h. Voyant rouge fixe. Signalement élu commune. Intervention IRVE — habilitation H0B0 requise.',
  'in_progress',
  'high',
  ea.id,
  '13004',
  '11111111-1111-1111-1111-111111111105',
  '11111111-1111-1111-1111-111111111104',
  tech.id,
  date_trunc('week', now()) + INTERVAL '2 days' + TIME '09:00',
  date_trunc('week', now()) + INTERVAL '2 days' + TIME '11:00',
  2.00,
  ARRAY['B1V', 'B2V', 'BR', 'H0B0']
FROM app.energy_assets ea
CROSS JOIN LATERAL (
  SELECT c.id
  FROM app.contacts c
  WHERE c.email = 'm.durand@gsi-concept.fr'
    AND c.organization_id = '00000000-0000-0000-0000-000000000001'
  ORDER BY c.created_at
  LIMIT 1
) tech
WHERE ea.organization_id = '00000000-0000-0000-0000-000000000001'
  AND ea.name = 'Borne IRVE — Parking République'
  AND ea.commune_insee_code = '13004'
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  asset_id = EXCLUDED.asset_id,
  commune_insee_code = EXCLUDED.commune_insee_code,
  assigned_to_provider_id = EXCLUDED.assigned_to_provider_id,
  assigned_contact_id = EXCLUDED.assigned_contact_id,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  duration_hours = EXCLUDED.duration_hours,
  required_habilitations = EXCLUDED.required_habilitations,
  updated_at = now();

-- Armoire EP Rue du Refuge — Marc Durand (compatible H1V)
INSERT INTO app.tickets_maintenance (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  asset_id,
  commune_insee_code,
  created_by,
  assigned_contact_id,
  scheduled_start,
  scheduled_end,
  duration_hours,
  required_habilitations
)
SELECT
  '22222222-2222-2222-2222-222222222202',
  '00000000-0000-0000-0000-000000000001',
  'Défaut alimentation — Armoire EP Rue du Refuge',
  'Coupe circuit récurrente n°3. Vérification câblage et remplacement fusibles.',
  'open',
  'medium',
  ea.id,
  '13004',
  '11111111-1111-1111-1111-111111111105',
  tech.id,
  date_trunc('week', now()) + INTERVAL '2 days' + TIME '14:00',
  date_trunc('week', now()) + INTERVAL '2 days' + TIME '17:00',
  3.00,
  ARRAY['B1V', 'B2V', 'BR', 'H1V']
FROM app.energy_assets ea
CROSS JOIN LATERAL (
  SELECT c.id FROM app.contacts c
  WHERE c.email = 'm.durand@gsi-concept.fr'
    AND c.organization_id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1
) tech
WHERE ea.organization_id = '00000000-0000-0000-0000-000000000001'
  AND ea.name = 'Armoire EP — Rue du Refuge'
  AND ea.commune_insee_code = '13004'
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  asset_id = EXCLUDED.asset_id,
  assigned_contact_id = EXCLUDED.assigned_contact_id,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  duration_hours = EXCLUDED.duration_hours,
  required_habilitations = EXCLUDED.required_habilitations,
  updated_at = now();

-- Armoire EP Clemenceau — Lucas Petit (charge jour 2)
INSERT INTO app.tickets_maintenance (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  asset_id,
  commune_insee_code,
  created_by,
  assigned_contact_id,
  scheduled_start,
  scheduled_end,
  duration_hours,
  required_habilitations
)
SELECT
  '22222222-2222-2222-2222-222222222203',
  '00000000-0000-0000-0000-000000000001',
  'Maintenance préventive — Armoire EP Clemenceau',
  'Contrôle annuel circuits et relais. Remplacement 2 modules LED si nécessaire.',
  'in_progress',
  'low',
  ea.id,
  '13004',
  '11111111-1111-1111-1111-111111111103',
  '33333333-3333-3333-3333-333333333302',
  date_trunc('week', now()) + INTERVAL '3 days' + TIME '08:30',
  date_trunc('week', now()) + INTERVAL '3 days' + TIME '12:30',
  4.00,
  ARRAY['B1V', 'B2V', 'BR', 'H1V']
FROM app.energy_assets ea
WHERE ea.organization_id = '00000000-0000-0000-0000-000000000001'
  AND ea.name = 'Armoire EP — Boulevard Georges Clemenceau'
  AND ea.commune_insee_code = '13004'
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  asset_id = EXCLUDED.asset_id,
  assigned_contact_id = EXCLUDED.assigned_contact_id,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  duration_hours = EXCLUDED.duration_hours,
  required_habilitations = EXCLUDED.required_habilitations,
  updated_at = now();

-- Borne IRVE Lamartine — non assigné (à planifier)
INSERT INTO app.tickets_maintenance (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  asset_id,
  commune_insee_code,
  created_by,
  assigned_contact_id,
  scheduled_start,
  scheduled_end,
  duration_hours,
  required_habilitations
)
SELECT
  '22222222-2222-2222-2222-222222222204',
  '00000000-0000-0000-0000-000000000001',
  'Diagnostic OCPP — Borne IRVE Place Lamartine',
  'Communication intermittente avec le backend. Test carte RFID et module 4G.',
  'open',
  'critical',
  ea.id,
  '13004',
  '11111111-1111-1111-1111-111111111105',
  NULL,
  date_trunc('week', now()) + INTERVAL '4 days' + TIME '10:00',
  date_trunc('week', now()) + INTERVAL '4 days' + TIME '13:00',
  3.00,
  ARRAY['B1V', 'B2V', 'BR', 'H0B0']
FROM app.energy_assets ea
WHERE ea.organization_id = '00000000-0000-0000-0000-000000000001'
  AND ea.name = 'Borne IRVE — Place Lamartine'
  AND ea.commune_insee_code = '13004'
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  asset_id = EXCLUDED.asset_id,
  assigned_contact_id = EXCLUDED.assigned_contact_id,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  duration_hours = EXCLUDED.duration_hours,
  required_habilitations = EXCLUDED.required_habilitations,
  updated_at = now();

-- Surcharge Marc Durand — 4e intervention même jour (mercredi après-midi + matin IRVE)
INSERT INTO app.tickets_maintenance (
  id,
  organization_id,
  title,
  description,
  status,
  priority,
  asset_id,
  commune_insee_code,
  created_by,
  assigned_contact_id,
  scheduled_start,
  scheduled_end,
  duration_hours,
  required_habilitations
)
SELECT
  '22222222-2222-2222-2222-222222222205',
  '00000000-0000-0000-0000-000000000001',
  'Remplacement photométrie — Arènes d''Arles',
  'Foyers LED défaillants sur allée nord. Habilitation hauteur H1V.',
  'open',
  'medium',
  ea.id,
  '13004',
  '11111111-1111-1111-1111-111111111103',
  tech.id,
  date_trunc('week', now()) + INTERVAL '2 days' + TIME '11:30',
  date_trunc('week', now()) + INTERVAL '2 days' + TIME '13:30',
  2.00,
  ARRAY['B1V', 'B2V', 'BR', 'H1V']
FROM app.energy_assets ea
CROSS JOIN LATERAL (
  SELECT c.id FROM app.contacts c
  WHERE c.email = 'm.durand@gsi-concept.fr'
    AND c.organization_id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1
) tech
WHERE ea.organization_id = '00000000-0000-0000-0000-000000000001'
  AND ea.name = 'Armoire EP — Arènes d''Arles'
  AND ea.commune_insee_code = '13004'
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  asset_id = EXCLUDED.asset_id,
  assigned_contact_id = EXCLUDED.assigned_contact_id,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  duration_hours = EXCLUDED.duration_hours,
  required_habilitations = EXCLUDED.required_habilitations,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
