-- =============================================================================
-- Sinfoni — seed démo Chantiers, Planning & Maintenance (Supabase local / Docker)
-- Ancré sur l'organization_id de Marie Lefranc (DGS) dans app.users.
--
-- Exécution :
--   Get-Content supabase/seed.sql -Encoding UTF8 | docker exec -i supabase_db_Sinfoni psql -U postgres -d postgres -v ON_ERROR_STOP=1
-- =============================================================================

-- 0. Garde-fous schéma (idempotent)
ALTER TABLE IF EXISTS app.contacts
  ADD COLUMN IF NOT EXISTS electrical_habilitations TEXT[] DEFAULT '{}';

ALTER TABLE IF EXISTS administration.contacts
  ADD COLUMN IF NOT EXISTS electrical_habilitations TEXT[] DEFAULT '{}';

ALTER TABLE IF EXISTS app.tickets_maintenance
  ADD COLUMN IF NOT EXISTS assigned_contact_id UUID;

ALTER TABLE IF EXISTS app.tickets_maintenance
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4, 2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS required_habilitations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chantier_id UUID;

UPDATE app.contacts
SET electrical_habilitations = '{}'
WHERE electrical_habilitations IS NULL;

CREATE TABLE IF NOT EXISTS app.chantiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  code            TEXT,
  name            TEXT NOT NULL,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'en_cours',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  budget_total    NUMERIC(14, 2) NOT NULL DEFAULT 0
);

ALTER TABLE IF EXISTS app.chantiers
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS budget_total NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS app.projects
  ADD COLUMN IF NOT EXISTS ppi_year INTEGER;

CREATE TABLE IF NOT EXISTS app.ppi_planification (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  chantier_id       UUID REFERENCES app.chantiers(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES app.projects(id) ON DELETE SET NULL,
  exercise_year     INTEGER NOT NULL CHECK (exercise_year >= 2000 AND exercise_year <= 2100),
  enveloppe_votee   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  engage            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  realise           NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'Envisagé',
  financing_note    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chantiers_organization ON app.chantiers (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chantiers_org_code
  ON app.chantiers (organization_id, code)
  WHERE code IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_maintenance_assigned_contact_id_fkey'
  ) THEN
    ALTER TABLE app.tickets_maintenance
      ADD CONSTRAINT tickets_maintenance_assigned_contact_id_fkey
      FOREIGN KEY (assigned_contact_id) REFERENCES app.contacts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_maintenance_chantier_id_fkey'
  ) THEN
    ALTER TABLE app.tickets_maintenance
      ADD CONSTRAINT tickets_maintenance_chantier_id_fkey
      FOREIGN KEY (chantier_id) REFERENCES app.chantiers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 1. Contexte seed — organization_id de Marie Lefranc (source : app.users)
DROP TABLE IF EXISTS _seed_ctx;
CREATE TEMP TABLE _seed_ctx (
  organization_id UUID NOT NULL,
  marie_user_id   UUID NOT NULL,
  created_by      UUID NOT NULL
);

DO $$
DECLARE
  v_org_id    UUID;
  v_marie_id  UUID;
  v_created_by UUID;
BEGIN
  SELECT u.organization_id, u.id
  INTO v_org_id, v_marie_id
  FROM app.users u
  WHERE u.active = true
    AND (
      lower(u.email) = lower('m.lefranc@syndicat.fr')
      OR (u.name ILIKE 'Marie Lefranc' AND u.role = 'DGS')
    )
  ORDER BY
    CASE WHEN lower(u.email) = lower('m.lefranc@syndicat.fr') THEN 0 ELSE 1 END,
    u.created_at ASC
  LIMIT 1;

  IF v_org_id IS NULL THEN
    SELECT c.organization_id INTO v_org_id
    FROM app.contacts c
    WHERE lower(c.email) LIKE '%marie%'
       OR lower(c.first_name || ' ' || c.last_name) LIKE '%marie%lef%'
    ORDER BY c.created_at ASC
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM administration.organization ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000001';
  END IF;

  IF v_marie_id IS NULL THEN
    SELECT u.id INTO v_marie_id
    FROM app.users u
    WHERE u.organization_id = v_org_id AND u.role = 'DGS'
    ORDER BY u.created_at ASC
    LIMIT 1;
  END IF;

  IF v_marie_id IS NULL THEN
    v_marie_id := '11111111-1111-1111-1111-111111111101';
  END IF;

  SELECT u.id INTO v_created_by
  FROM app.users u
  WHERE u.organization_id = v_org_id
    AND u.role = 'Chargé d''Affaires'
    AND u.active = true
  ORDER BY u.created_at ASC
  LIMIT 1;

  IF v_created_by IS NULL THEN
    v_created_by := v_marie_id;
  END IF;

  INSERT INTO _seed_ctx (organization_id, marie_user_id, created_by)
  VALUES (v_org_id, v_marie_id, v_created_by);

  RAISE NOTICE 'Seed ancré org=% marie_user=% created_by=%', v_org_id, v_marie_id, v_created_by;
END $$;

INSERT INTO administration.organization (id, name)
SELECT ctx.organization_id, 'Sinfoni Demo Métropole'
FROM _seed_ctx ctx
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Chantiers de démonstration (Pia / Brouilla)
INSERT INTO app.chantiers (id, organization_id, code, name, address, status, latitude, longitude, budget_total)
SELECT
  v.id,
  ctx.organization_id,
  v.code,
  v.name,
  v.address,
  v.status,
  v.latitude,
  v.longitude,
  v.budget_total
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      '55555555-5555-5555-5555-555555555501'::uuid,
      'CH-2026-001',
      'Rénovation Éclairage Public - Avenue de la Gare',
      'Avenue de la Gare, Pia',
      'en_cours',
      42.7368::double precision,
      2.9174::double precision,
      145000::numeric
    ),
    (
      '55555555-5555-5555-5555-555555555502'::uuid,
      'CH-2026-002',
      'Installation Candélabres Solaires - Route de Banyuls',
      'Route de Banyuls, Brouilla',
      'planifie',
      42.4721::double precision,
      2.8703::double precision,
      98000::numeric
    ),
    (
      '55555555-5555-5555-5555-555555555503'::uuid,
      'CH-2026-003',
      'Maintenance Bornes IRVE - Centre Commercial',
      'Rue des Ecoles, Pia',
      'en_cours',
      42.7412::double precision,
      2.9088::double precision,
      62000::numeric
    ),
    (
      '55555555-5555-5555-5555-555555555505'::uuid,
      'CH-2026-005',
      'Création Piste Cyclable & Aménagement Sécurité - Voie Verte Nord',
      'Avenue du Maréchal Joffre, 66380 Pia',
      'en_cours',
      42.7435::double precision,
      2.9212::double precision,
      380000::numeric
    )
) AS v(id, code, name, address, status, latitude, longitude, budget_total)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  status = EXCLUDED.status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  budget_total = EXCLUDED.budget_total;

-- 2b. Affaires (app.projects) — parallèles aux chantiers site
INSERT INTO app.projects (
  id,
  organization_id,
  reference,
  title,
  description,
  type,
  status,
  budget_total,
  budget_consumed,
  start_date,
  expected_end_date,
  owner_id,
  owner_name,
  location,
  latitude,
  longitude,
  commune_insee_code,
  quote_status,
  quote_amount_ht,
  billing_status,
  ppi_year
)
SELECT
  v.id,
  ctx.organization_id,
  v.reference,
  v.title,
  v.description,
  v.type,
  v.status,
  v.budget_total,
  v.budget_consumed,
  v.start_date,
  v.expected_end_date,
  ctx.marie_user_id::text,
  COALESCE(
    (SELECT u.name FROM app.users u WHERE u.id = ctx.marie_user_id),
    'Marie Lefranc'
  ),
  v.location,
  v.latitude,
  v.longitude,
  v.commune_insee_code,
  v.quote_status,
  v.quote_amount_ht,
  v.billing_status,
  v.ppi_year
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      '66666666-6666-6666-6666-666666666601'::uuid,
      'AF-2026-EP-001',
      'Rénovation Éclairage Public - Avenue de la Gare',
      'Affaire syndicat liée au chantier CH-2026-001 (Pia) — modernisation EP.',
      'Éclairage Public',
      'En cours',
      145000,
      38200,
      '2026-01-15'::date,
      '2026-09-30'::date,
      'Avenue de la Gare, 66600 Pia',
      42.7368,
      2.9174,
      '66190',
      'Accepté',
      145000,
      'Acompte émis',
      2026
    ),
    (
      '66666666-6666-6666-6666-666666666602'::uuid,
      'AF-2026-EP-002',
      'Installation Candélabres Solaires - Route de Banyuls',
      'Affaire syndicat liée au chantier CH-2026-002 (Brouilla).',
      'Éclairage Public',
      'En Étude',
      98000,
      5200,
      '2026-03-01'::date,
      '2026-12-15'::date,
      'Route de Banyuls, 66620 Brouilla',
      42.4721,
      2.8703,
      '66021',
      'Envoyé au client',
      98000,
      'À émettre',
      2027
    ),
    (
      '66666666-6666-6666-6666-666666666603'::uuid,
      'AF-2026-IRVE-001',
      'Maintenance Bornes IRVE - Centre Commercial',
      'Affaire syndicat liée au chantier CH-2026-003 (Pia).',
      'IRVE',
      'En cours',
      62000,
      18750,
      '2026-02-01'::date,
      '2026-08-31'::date,
      'Rue des Ecoles, 66600 Pia',
      42.7412,
      2.9088,
      '66190',
      'Accepté',
      62000,
      'Facturé total',
      2026
    ),
    (
      '66666666-6666-6666-6666-666666666605'::uuid,
      'AF-2026-VOIRIE-005',
      'Création Piste Cyclable & Aménagement Sécurité - Voie Verte Nord',
      'Affaire syndicat liée au chantier CH-2026-005 (Pia) — piste cyclable & sécurité, PPI 2026-2028.',
      'Électricité',
      'En cours',
      380000,
      45000,
      '2026-04-01'::date,
      '2028-12-31'::date,
      'Avenue du Maréchal Joffre, 66380 Pia',
      42.7435,
      2.9212,
      '66190',
      'Accepté',
      380000,
      'Acompte émis',
      2026
    )
) AS v(
  id, reference, title, description, type, status,
  budget_total, budget_consumed, start_date, expected_end_date,
  location, latitude, longitude, commune_insee_code,
  quote_status, quote_amount_ht, billing_status, ppi_year
)
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

-- 2c. Planification PPI pluriannuelle — CH-2026-005 / AF-2026-VOIRIE-005
INSERT INTO app.ppi_planification (
  id,
  organization_id,
  chantier_id,
  project_id,
  exercise_year,
  enveloppe_votee,
  engage,
  realise,
  status,
  financing_note
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
      2026,
      150000::numeric,
      120000::numeric,
      45000::numeric,
      'Validé',
      NULL::text
    ),
    (
      '77777777-7777-7777-7777-777777777702'::uuid,
      '55555555-5555-5555-5555-555555555505'::uuid,
      '66666666-6666-6666-6666-666666666605'::uuid,
      2027,
      180000::numeric,
      0::numeric,
      0::numeric,
      'Programmé',
      'Financement DETR'
    ),
    (
      '77777777-7777-7777-7777-777777777703'::uuid,
      '55555555-5555-5555-5555-555555555505'::uuid,
      '66666666-6666-6666-6666-666666666605'::uuid,
      2028,
      50000::numeric,
      0::numeric,
      0::numeric,
      'Envisagé',
      NULL::text
    )
) AS v(
  id, chantier_id, project_id, exercise_year,
  enveloppe_votee, engage, realise, status, financing_note
)
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

-- 3. Actifs énergétiques
INSERT INTO app.energy_assets (
  id, organization_id, commune_insee_code, name, type, status, latitude, longitude, metadata
)
SELECT
  v.id,
  ctx.organization_id,
  v.commune_insee_code,
  v.name,
  v.type,
  v.status,
  v.latitude,
  v.longitude,
  v.metadata
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      '44444444-4444-4444-4444-444444444401'::uuid,
      '66190',
      'Armoire EP — Avenue de la Gare',
      'eclairage',
      'maintenance',
      42.6680::float8,
      2.9200::float8,
      '{"circuit_count": 10, "chantier_code": "CH-2026-001"}'::jsonb
    ),
    (
      '44444444-4444-4444-4444-444444444402'::uuid,
      '66190',
      'Borne IRVE — Centre Commercial Pia',
      'irve',
      'broken',
      42.6690::float8,
      2.9210::float8,
      '{"power_kw": 22, "chantier_code": "CH-2026-003"}'::jsonb
    ),
    (
      '44444444-4444-4444-4444-444444444403'::uuid,
      '66021',
      'Ligne EP — Route de Banyuls',
      'eclairage',
      'broken',
      42.6400::float8,
      2.8900::float8,
      '{"circuit_count": 12, "chantier_code": "CH-2026-002"}'::jsonb
    )
) AS v(id, commune_insee_code, name, type, status, latitude, longitude, metadata)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  commune_insee_code = EXCLUDED.commune_insee_code,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- 4. Techniciens
INSERT INTO app.contacts (
  id, organization_id, first_name, last_name, email, phone, role, department,
  parent_contact_id, electrical_habilitations
)
SELECT
  v.id,
  ctx.organization_id,
  v.first_name,
  v.last_name,
  v.email,
  v.phone,
  v.role,
  v.department,
  NULL,
  v.electrical_habilitations
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Marc', 'Durand', 'marc.durand@sinfoni.fr', '0601020304',
      'Technicien', 'Maintenance Éclairage', ARRAY['B1V', 'BR', 'H1V']::text[]
    ),
    (
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Sophie', 'Martin', 'sophie.martin@sinfoni.fr', '0605060708',
      'Technicien', 'Infrastructure Énergétique', ARRAY['B2V', 'BR', 'H0B0']::text[]
    ),
    (
      '33333333-3333-3333-3333-333333333333'::uuid,
      'Lucas', 'Bernard', 'lucas.bernard@sinfoni.fr', '0609101112',
      'Technicien', 'Éclairage Public', ARRAY['B2V', 'BR']::text[]
    )
) AS v(
  id, first_name, last_name, email, phone, role, department, electrical_habilitations
)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  electrical_habilitations = EXCLUDED.electrical_habilitations,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  updated_at = now();

-- 5. Tickets maintenance planifiés
INSERT INTO app.tickets_maintenance (
  id, organization_id, title, description, status, priority,
  asset_id, commune_insee_code, created_by, assigned_contact_id, chantier_id,
  scheduled_start, scheduled_end, duration_hours, required_habilitations
)
SELECT
  v.id,
  ctx.organization_id,
  v.title,
  v.description,
  v.status,
  v.priority,
  v.asset_id,
  v.commune_insee_code,
  ctx.created_by,
  v.assigned_contact_id,
  v.chantier_id,
  v.scheduled_start,
  v.scheduled_end,
  v.duration_hours,
  v.required_habilitations
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      'a1111111-1111-1111-1111-111111111111'::uuid,
      'Rénovation armoire EP — Avenue de la Gare',
      'Inspection disjoncteurs et remplacement modules — CH-2026-001 Pia.',
      'in_progress', 'high',
      '44444444-4444-4444-4444-444444444401'::uuid, '66190',
      '11111111-1111-1111-1111-111111111111'::uuid,
      '55555555-5555-5555-5555-555555555501'::uuid,
      (CURRENT_DATE + TIME '08:00:00')::timestamptz,
      (CURRENT_DATE + TIME '12:00:00')::timestamptz,
      4.0::numeric,
      ARRAY['B1V', 'BR']::text[]
    ),
    (
      'a2222222-2222-2222-2222-222222222222'::uuid,
      'Dépannage borne IRVE — Centre Commercial',
      'Intervention urgente IRVE — CH-2026-003. Marc assigné sans H0B0 (test incompatibilité).',
      'open', 'critical',
      '44444444-4444-4444-4444-444444444402'::uuid, '66190',
      '11111111-1111-1111-1111-111111111111'::uuid,
      '55555555-5555-5555-5555-555555555503'::uuid,
      (CURRENT_DATE + TIME '13:00:00')::timestamptz,
      (CURRENT_DATE + TIME '17:00:00')::timestamptz,
      4.0::numeric,
      ARRAY['H0B0']::text[]
    ),
    (
      'a3333333-3333-3333-3333-333333333333'::uuid,
      'Pose candélabres solaires — Route de Banyuls',
      'Préparation tranchées et raccordements — CH-2026-002 Brouilla.',
      'open', 'medium',
      '44444444-4444-4444-4444-444444444403'::uuid, '66021',
      '22222222-2222-2222-2222-222222222222'::uuid,
      '55555555-5555-5555-5555-555555555502'::uuid,
      (CURRENT_DATE + INTERVAL '1 day' + TIME '09:00:00')::timestamptz,
      (CURRENT_DATE + INTERVAL '1 day' + TIME '15:00:00')::timestamptz,
      6.0::numeric,
      ARRAY['B2V']::text[]
    )
) AS v(
  id, title, description, status, priority, asset_id, commune_insee_code,
  assigned_contact_id, chantier_id, scheduled_start, scheduled_end,
  duration_hours, required_habilitations
)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  asset_id = EXCLUDED.asset_id,
  commune_insee_code = EXCLUDED.commune_insee_code,
  created_by = EXCLUDED.created_by,
  assigned_contact_id = EXCLUDED.assigned_contact_id,
  chantier_id = EXCLUDED.chantier_id,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  duration_hours = EXCLUDED.duration_hours,
  required_habilitations = EXCLUDED.required_habilitations,
  updated_at = now();

-- 6. Réalignement forcé sur l'org de Marie (données seed existantes)
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organization_id INTO v_org_id FROM _seed_ctx LIMIT 1;

  UPDATE app.chantiers
  SET organization_id = v_org_id
  WHERE id IN (
    '55555555-5555-5555-5555-555555555501',
    '55555555-5555-5555-5555-555555555502',
    '55555555-5555-5555-5555-555555555503',
    '55555555-5555-5555-5555-555555555505'
  );

  UPDATE app.contacts
  SET organization_id = v_org_id
  WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

  UPDATE app.energy_assets
  SET organization_id = v_org_id
  WHERE id IN (
    '44444444-4444-4444-4444-444444444401',
    '44444444-4444-4444-4444-444444444402',
    '44444444-4444-4444-4444-444444444403'
  );

  UPDATE app.tickets_maintenance
  SET organization_id = v_org_id
  WHERE id IN (
    'a1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333'
  );

  UPDATE app.projects
  SET organization_id = v_org_id
  WHERE id IN (
    '66666666-6666-6666-6666-666666666601',
    '66666666-6666-6666-6666-666666666602',
    '66666666-6666-6666-6666-666666666603',
    '66666666-6666-6666-6666-666666666605'
  );

  UPDATE app.ppi_planification
  SET organization_id = v_org_id
  WHERE id IN (
    '77777777-7777-7777-7777-777777777701',
    '77777777-7777-7777-7777-777777777702',
    '77777777-7777-7777-7777-777777777703'
  );

  RAISE NOTICE 'Réalignement seed → organization_id=%', v_org_id;
END $$;

-- 7. Vues API public
CREATE OR REPLACE VIEW public.chantiers AS
  SELECT * FROM app.chantiers;

CREATE OR REPLACE VIEW public.contacts AS
  SELECT * FROM app.contacts;

CREATE OR REPLACE VIEW public.tickets_maintenance AS
  SELECT * FROM app.tickets_maintenance;

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

CREATE OR REPLACE VIEW public.ppi_planification AS
  SELECT * FROM app.ppi_planification;

GRANT ALL ON public.ppi_planification TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.tickets_maintenance_enriched;

CREATE VIEW public.tickets_maintenance_enriched AS
SELECT
  t.id,
  t.organization_id,
  t.created_at,
  t.updated_at,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.asset_id,
  t.commune_insee_code,
  t.created_by,
  t.assigned_to_provider_id,
  t.assigned_contact_id,
  t.scheduled_start,
  t.scheduled_end,
  t.duration_hours,
  t.required_habilitations,
  c.first_name AS assigned_contact_first_name,
  c.last_name AS assigned_contact_last_name,
  c.email AS assigned_contact_email,
  c.phone AS assigned_contact_phone,
  c.role AS assigned_contact_role,
  c.department AS assigned_contact_department,
  c.electrical_habilitations AS assigned_contact_habilitations
FROM app.tickets_maintenance t
LEFT JOIN app.contacts c ON c.id = t.assigned_contact_id;

GRANT ALL ON public.chantiers TO anon, authenticated, service_role;
GRANT ALL ON public.contacts TO anon, authenticated, service_role;
GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;
GRANT SELECT ON public.tickets_maintenance_enriched TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
