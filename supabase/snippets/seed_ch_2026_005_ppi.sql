-- Demo CH-2026-005 + PPI 2026/2027/2028 (idempotent)
BEGIN;

CREATE TEMP TABLE _seed_ctx AS
SELECT
  u.organization_id,
  u.id AS marie_user_id
FROM app.users u
WHERE u.email = 'm.lefranc@syndicat.fr'
LIMIT 1;

INSERT INTO app.chantiers (id, organization_id, code, name, address, status, latitude, longitude, budget_total)
SELECT
  '55555555-5555-5555-5555-555555555505'::uuid,
  ctx.organization_id,
  'CH-2026-005',
  'Création Piste Cyclable & Aménagement Sécurité - Voie Verte Nord',
  'Avenue du Maréchal Joffre, 66380 Pia',
  'en_cours',
  42.7435,
  2.9212,
  380000
FROM _seed_ctx ctx
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  budget_total = EXCLUDED.budget_total;

INSERT INTO app.projects (
  id, organization_id, reference, title, description, type, status,
  budget_total, budget_consumed, start_date, expected_end_date,
  owner_id, owner_name, location, latitude, longitude, commune_insee_code,
  quote_status, quote_amount_ht, billing_status, ppi_year
)
SELECT
  '66666666-6666-6666-6666-666666666605'::uuid,
  ctx.organization_id,
  'AF-2026-VOIRIE-005',
  'Création Piste Cyclable & Aménagement Sécurité - Voie Verte Nord',
  'Affaire syndicat liée au chantier CH-2026-005 (Pia) — piste cyclable & sécurité, PPI 2026-2028.',
  'Électricité',
  'En cours',
  380000,
  45000,
  '2026-04-01'::date,
  '2028-12-31'::date,
  ctx.marie_user_id::text,
  COALESCE((SELECT u.name FROM app.users u WHERE u.id = ctx.marie_user_id), 'Marie Lefranc'),
  'Avenue du Maréchal Joffre, 66380 Pia',
  42.7435,
  2.9212,
  '66190',
  'Accepté',
  380000,
  'Acompte émis',
  2026
FROM _seed_ctx ctx
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  reference = EXCLUDED.reference,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  budget_total = EXCLUDED.budget_total,
  budget_consumed = EXCLUDED.budget_consumed,
  start_date = EXCLUDED.start_date,
  expected_end_date = EXCLUDED.expected_end_date,
  owner_id = EXCLUDED.owner_id,
  owner_name = EXCLUDED.owner_name,
  location = EXCLUDED.location,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  commune_insee_code = EXCLUDED.commune_insee_code,
  quote_status = EXCLUDED.quote_status,
  quote_amount_ht = EXCLUDED.quote_amount_ht,
  billing_status = EXCLUDED.billing_status,
  ppi_year = EXCLUDED.ppi_year,
  updated_at = now();

INSERT INTO app.ppi_planification (
  id, organization_id, chantier_id, project_id, exercise_year,
  enveloppe_votee, engage, realise, status, financing_note
)
SELECT
  v.id,
  ctx.organization_id,
  v.chantier_id,
  v.project_id,
  v.exercise_year,
  v.enveloppe_votee,
  v.engage,
  v.realise,
  v.status,
  v.financing_note
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      '77777777-7777-7777-7777-777777777701'::uuid,
      '55555555-5555-5555-5555-555555555505'::uuid,
      '66666666-6666-6666-6666-666666666605'::uuid,
      2026, 150000::numeric, 120000::numeric, 45000::numeric, 'Validé', NULL::text
    ),
    (
      '77777777-7777-7777-7777-777777777702'::uuid,
      '55555555-5555-5555-5555-555555555505'::uuid,
      '66666666-6666-6666-6666-666666666605'::uuid,
      2027, 180000::numeric, 0::numeric, 0::numeric, 'Programmé', 'Financement DETR'
    ),
    (
      '77777777-7777-7777-7777-777777777703'::uuid,
      '55555555-5555-5555-5555-555555555505'::uuid,
      '66666666-6666-6666-6666-666666666605'::uuid,
      2028, 50000::numeric, 0::numeric, 0::numeric, 'Envisagé', NULL::text
    )
) AS v(id, chantier_id, project_id, exercise_year, enveloppe_votee, engage, realise, status, financing_note)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  chantier_id = EXCLUDED.chantier_id,
  project_id = EXCLUDED.project_id,
  exercise_year = EXCLUDED.exercise_year,
  enveloppe_votee = EXCLUDED.enveloppe_votee,
  engage = EXCLUDED.engage,
  realise = EXCLUDED.realise,
  status = EXCLUDED.status,
  financing_note = EXCLUDED.financing_note,
  updated_at = now();

COMMIT;

SELECT c.code, c.name, c.budget_total, c.latitude, c.longitude, c.status
FROM app.chantiers c WHERE c.code = 'CH-2026-005';

SELECT exercise_year, enveloppe_votee, engage, realise, status, financing_note
FROM app.ppi_planification
WHERE chantier_id = '55555555-5555-5555-5555-555555555505'
ORDER BY exercise_year;

SELECT reference, title, budget_total, budget_consumed, ppi_year
FROM app.projects WHERE reference = 'AF-2026-VOIRIE-005';
