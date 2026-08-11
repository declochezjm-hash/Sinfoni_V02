-- =============================================================================
-- Seed / jeu de données de test — Charge de travail Contacts × Maintenance
-- =============================================================================
-- Prérequis : migrations appliquées + profil app.users Marie Lefranc (DGS).
--
-- Sommet organigramme : Marie Lefranc (email + organization_id lus depuis app.users)
--   ├── Sophie Bernard (DST)
--   │     ├── Julien Roux, Camille Rousseau, Marc Durand, Luc Petit
--   └── Claire Martin (Élu)
--
-- IMPORTANT frontend :
--   - Tickets   → public.tickets_maintenance_enriched (filtre organization_id)
--   - Chantiers → public.projects (section 1bis — 5 affaires démo)
--   - OrgChart  → public.contacts (parent_contact_id)
--
-- Contraintes :
--   projects.type / status / quote_status / billing_status CHECK
--   energy_assets.type ∈ ('irve', 'eclairage')
--   tickets status ∈ (open|in_progress|resolved|closed)
--   tickets priority ∈ (low|medium|high|critical)
--   contacts.parent_contact_id ≠ self
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Résoudre Marie Lefranc (Auth / app.users) — source de vérité org + email
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _seed_ctx (
  marie_user_id UUID NOT NULL,
  marie_email TEXT NOT NULL,
  marie_name TEXT NOT NULL,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  provider_id UUID NULL
) ON COMMIT DROP;

DO $$
DECLARE
  v_marie RECORD;
  v_created_by UUID;
  v_provider UUID;
BEGIN
  SELECT u.id, u.email, u.name, u.organization_id, u.role
  INTO v_marie
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

  IF v_marie.id IS NULL THEN
    RAISE EXCEPTION
      'Profil Marie Lefranc introuvable dans app.users (email m.lefranc@syndicat.fr, rôle DGS).';
  END IF;

  IF v_marie.organization_id IS NULL THEN
    RAISE EXCEPTION 'Marie Lefranc (%) n''a pas d''organization_id dans app.users', v_marie.email;
  END IF;

  -- Créateur des tickets : préférer un Chargé d'Affaires de la même org, sinon Marie
  SELECT u.id INTO v_created_by
  FROM app.users u
  WHERE u.organization_id = v_marie.organization_id
    AND u.role = 'Chargé d''Affaires'
    AND u.active = true
  ORDER BY u.created_at ASC
  LIMIT 1;

  IF v_created_by IS NULL THEN
    v_created_by := v_marie.id;
  END IF;

  SELECT u.id INTO v_provider
  FROM app.users u
  WHERE u.organization_id = v_marie.organization_id
    AND u.role = 'Prestataire Extérieur'
    AND u.active = true
  ORDER BY u.created_at ASC
  LIMIT 1;

  INSERT INTO _seed_ctx (
    marie_user_id, marie_email, marie_name, organization_id, created_by, provider_id
  ) VALUES (
    v_marie.id,
    v_marie.email,
    COALESCE(NULLIF(trim(v_marie.name), ''), 'Marie Lefranc'),
    v_marie.organization_id,
    v_created_by,
    v_provider
  );

  RAISE NOTICE 'Seed ancré sur Marie Lefranc email=% org=%',
    v_marie.email, v_marie.organization_id;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Actifs énergétiques (même organization_id que Marie)
-- ---------------------------------------------------------------------------

INSERT INTO app.energy_assets (
  id,
  organization_id,
  commune_insee_code,
  name,
  type,
  status,
  latitude,
  longitude,
  metadata
)
SELECT
  v.id,
  ctx.organization_id,
  '13004',
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
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101'::uuid,
      'Borne IRVE — Gare SNCF',
      'irve',
      'functional',
      43.6842,
      4.6318,
      '{"power_kw": 22, "connector_type": "Type 2", "nb_prises": 2}'::jsonb
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102'::uuid,
      'Borne IRVE — Centre aquatique',
      'irve',
      'maintenance',
      43.6710,
      4.6405,
      '{"power_kw": 50, "connector_type": "CCS Combo 2", "nb_prises": 2}'::jsonb
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103'::uuid,
      'Armoire EP — Avenue de la Libération',
      'eclairage',
      'broken',
      43.6765,
      4.6288,
      '{"circuit_count": 10, "total_power_w": 2500, "nb_foyers": 40}'::jsonb
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104'::uuid,
      'Armoire EP — Quartier Trinquetaille',
      'eclairage',
      'functional',
      43.6728,
      4.6215,
      '{"circuit_count": 14, "total_power_w": 3500, "nb_foyers": 56}'::jsonb
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105'::uuid,
      'Borne IRVE — Zone commerciale Nord',
      'irve',
      'broken',
      43.6890,
      4.6350,
      '{"power_kw": 7.4, "connector_type": "Type 2", "nb_prises": 1}'::jsonb
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa106'::uuid,
      'Armoire EP — Rue de la République',
      'eclairage',
      'maintenance',
      43.6758,
      4.6272,
      '{"circuit_count": 6, "total_power_w": 1500, "nb_foyers": 24}'::jsonb
    )
) AS v(id, name, type, status, latitude, longitude, metadata)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  metadata = EXCLUDED.metadata,
  commune_insee_code = EXCLUDED.commune_insee_code;

-- Actifs démo « classiques » (migrations) : même org que Marie
UPDATE app.energy_assets ea
SET organization_id = ctx.organization_id
FROM _seed_ctx ctx
WHERE ea.name IN (
  'Borne IRVE — Place Lamartine',
  'Borne IRVE — Parking République',
  'Armoire EP — Boulevard Georges Clemenceau',
  'Armoire EP — Rue du Refuge',
  'Armoire EP — Arènes d''Arles'
);

-- ---------------------------------------------------------------------------
-- 1bis. Affaires / chantiers (projects) — 5 dossiers cohérents Arles / Bouches-du-Rhône
-- ---------------------------------------------------------------------------
-- Types CHECK  : Électricité | Éclairage Public | Télécom | IRVE
-- Statuts CHECK: Brouillon | En Étude | Proposé | Validé | APS/APD | BC/OS |
--                En cours | PV/Réception | Clôturé | À planifier
-- ---------------------------------------------------------------------------

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
  actual_end_date,
  owner_id,
  owner_name,
  contractor_id,
  contractor_name,
  location,
  latitude,
  longitude,
  quote_status,
  quote_amount_ht,
  billing_status,
  invoice_deposit,
  invoice_balance,
  enable_time_tracking,
  commune_insee_code
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
  v.actual_end_date,
  ctx.created_by::text,
  COALESCE(
    (SELECT u.name FROM app.users u WHERE u.id = ctx.created_by),
    'Sophie Bernard'
  ),
  CASE WHEN v.has_contractor THEN ctx.provider_id::text ELSE NULL END,
  CASE WHEN v.has_contractor THEN 'Jean Moreau — Prestataire Extérieur' ELSE NULL END,
  v.location,
  v.latitude,
  v.longitude,
  v.quote_status,
  v.quote_amount_ht,
  v.billing_status,
  v.invoice_deposit,
  v.invoice_balance,
  v.enable_time_tracking,
  '13004'
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    (
      'dddddddd-dddd-dddd-dddd-ddddddddd001'::uuid,
      'AF-2026-EP-001',
      'Rénovation Éclairage Public - Avenue Jean Jaurès',
      'Remplacement des luminaires sodium par LED BAR-EQ-111, modernisation des armoires et horloges astronomiques sur l''avenue Jean Jaurès (Arles).',
      'Éclairage Public',
      'En Étude',
      185000,
      12400,
      '2026-03-01'::date,
      '2026-11-30'::date,
      NULL::date,
      'Avenue Jean Jaurès, 13200 Arles',
      43.6769,
      4.6275,
      'Brouillon',
      178500,
      'À émettre',
      false,
      false,
      true,
      false
    ),
    (
      'dddddddd-dddd-dddd-dddd-ddddddddd002'::uuid,
      'AF-2026-HT-002',
      'Déploiement Haute Tension - Zone Industrielle Nord',
      'Création d''un poste de livraison HTA/BT et extension réseau pour desservir la ZI Nord (Trinquetaille). Coordination Enedis + commune.',
      'Électricité',
      'En cours',
      420000,
      187500,
      '2025-11-15'::date,
      '2026-09-15'::date,
      NULL::date,
      'Zone Industrielle Nord, 13200 Arles',
      43.6895,
      4.6180,
      'Accepté',
      398000,
      'Acompte émis',
      true,
      false,
      true,
      true
    ),
    (
      'dddddddd-dddd-dddd-dddd-ddddddddd003'::uuid,
      'AF-2026-MAINT-003',
      'Maintenance Préventive Postes HT/BT',
      'Campagne annuelle d''inspection, mesures d''isolement et thermographie IR sur les postes de livraison communaux (secteur Arènes / République).',
      'Électricité',
      'À planifier',
      48000,
      0,
      '2026-09-01'::date,
      '2026-12-20'::date,
      NULL::date,
      'Postes HT/BT — commune d''Arles',
      43.6778,
      4.6302,
      'Brouillon',
      45200,
      'À émettre',
      false,
      false,
      false,
      false
    ),
    (
      'dddddddd-dddd-dddd-dddd-ddddddddd004'::uuid,
      'AF-2026-IRVE-004',
      'Déploiement bornes IRVE — Parkings communaux',
      'Installation de 6 bornes 22 kW Type 2 sur les parkings Place Lamartine, République et Gare SNCF, raccordement et supervision OCPP.',
      'IRVE',
      'APS/APD',
      156000,
      31200,
      '2026-01-10'::date,
      '2026-08-31'::date,
      NULL::date,
      'Parkings communaux, 13200 Arles',
      43.6840,
      4.6325,
      'Envoyé au client',
      149800,
      'À émettre',
      false,
      false,
      true,
      true
    ),
    (
      'dddddddd-dddd-dddd-dddd-ddddddddd005'::uuid,
      'AF-2025-TEL-005',
      'Renforcement réseau télécom — Centre historique',
      'Tirage fibre et modernisation des armoires télécom pour le centre historique (autour des Arènes). Affaire clôturée — référence historique.',
      'Télécom',
      'Clôturé',
      92000,
      91850,
      '2025-02-01'::date,
      '2025-10-15'::date,
      '2025-10-12'::date,
      'Centre historique, 13200 Arles',
      43.6772,
      4.6308,
      'Accepté',
      89500,
      'Payé',
      true,
      true,
      false,
      true
    )
) AS v(
  id, reference, title, description, type, status,
  budget_total, budget_consumed, start_date, expected_end_date, actual_end_date,
  location, latitude, longitude,
  quote_status, quote_amount_ht, billing_status,
  invoice_deposit, invoice_balance, enable_time_tracking, has_contractor
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
  actual_end_date = EXCLUDED.actual_end_date,
  owner_id = EXCLUDED.owner_id,
  owner_name = EXCLUDED.owner_name,
  contractor_id = EXCLUDED.contractor_id,
  contractor_name = EXCLUDED.contractor_name,
  location = EXCLUDED.location,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  quote_status = EXCLUDED.quote_status,
  quote_amount_ht = EXCLUDED.quote_amount_ht,
  billing_status = EXCLUDED.billing_status,
  invoice_deposit = EXCLUDED.invoice_deposit,
  invoice_balance = EXCLUDED.invoice_balance,
  enable_time_tracking = EXCLUDED.enable_time_tracking,
  commune_insee_code = EXCLUDED.commune_insee_code,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 1ter. Étapes workflow (cycle de vie) pour chaque projet démo
-- ---------------------------------------------------------------------------
-- Étapes : Étude → Préparation → Réalisation → Réception → Clôture
-- Statut dérivé du status projet (même logique que le front).
-- ---------------------------------------------------------------------------

DELETE FROM app.workflow_steps
WHERE project_id IN (
  SELECT id FROM app.projects
  WHERE id::text LIKE 'dddddddd-dddd-dddd-dddd-%'
);

INSERT INTO app.workflow_steps (
  organization_id,
  project_id,
  step_key,
  step_label,
  step_order,
  status,
  completed_at,
  completed_by
)
SELECT
  p.organization_id,
  p.id,
  s.step_key,
  s.step_label,
  s.step_order,
  CASE
    WHEN s.step_order < v.active_order THEN 'completed'
    WHEN s.step_order = v.active_order AND v.active_order < 5 THEN 'active'
    ELSE 'pending'
  END,
  CASE WHEN s.step_order < v.active_order THEN now() ELSE NULL END,
  CASE WHEN s.step_order < v.active_order THEN 'Système' ELSE NULL END
FROM app.projects p
JOIN LATERAL (
  SELECT CASE p.status
    WHEN 'APS/APD' THEN 1
    WHEN 'BC/OS' THEN 1
    WHEN 'En cours' THEN 2
    WHEN 'PV/Réception' THEN 3
    WHEN 'Clôturé' THEN 5
    ELSE 0
  END AS active_order
) v ON true
CROSS JOIN (
  VALUES
    ('etude', 'Étude', 0),
    ('preparation', 'Préparation', 1),
    ('realisation', 'Réalisation', 2),
    ('reception', 'Réception', 3),
    ('cloture', 'Clôture', 4)
) AS s(step_key, step_label, step_order)
WHERE p.id::text LIKE 'dddddddd-dddd-dddd-dddd-%';

-- ---------------------------------------------------------------------------
-- 2. Arborescence contacts — Marie Lefranc (DGS) au sommet
-- ---------------------------------------------------------------------------
-- Marie Lefranc (DGS)  ← email / org = app.users
-- ├── Sophie Bernard (DST)
-- │     ├── Julien Roux (2 tickets actifs)
-- │     ├── Camille Rousseau (2–3 tickets actifs)
-- │     ├── Marc Durand (5 tickets — surcharge)
-- │     └── Luc Petit (1 ticket actif)
-- └── Claire Martin (Élu)
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _seed_contacts (
  email TEXT PRIMARY KEY,
  contact_id UUID NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  ctx RECORD;
  v_marie UUID;
  v_sophie UUID;
  v_claire UUID;
  v_julien UUID;
  v_camille UUID;
  v_marc UUID;
  v_luc UUID;
  v_first TEXT;
  v_last TEXT;
BEGIN
  SELECT * INTO ctx FROM _seed_ctx LIMIT 1;

  -- Prénom / nom depuis app.users.name (« Marie Lefranc »)
  v_first := split_part(ctx.marie_name, ' ', 1);
  v_last := NULLIF(trim(substr(ctx.marie_name, length(v_first) + 1)), '');
  IF v_last IS NULL THEN
    v_first := 'Marie';
    v_last := 'Lefranc';
  END IF;

  -- Retirer l'ancien sommet démo « Philippe Martin » s'il existe encore
  UPDATE app.contacts c
  SET parent_contact_id = NULL
  WHERE c.organization_id = ctx.organization_id
    AND c.parent_contact_id IN (
      SELECT id FROM app.contacts
      WHERE organization_id = ctx.organization_id
        AND lower(email) = lower('p.martin@gsi-concept.fr')
    );

  DELETE FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('p.martin@gsi-concept.fr');

  -- Marie Lefranc — racine DGS (email Auth exact)
  SELECT id INTO v_marie FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower(ctx.marie_email)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_marie IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001',
      ctx.organization_id,
      v_first,
      v_last,
      ctx.marie_email,
      '04 90 00 10 01',
      'DGS',
      'Direction Générale',
      NULL
    )
    RETURNING id INTO v_marie;
  ELSE
    UPDATE app.contacts SET
      first_name = v_first,
      last_name = v_last,
      email = ctx.marie_email,
      phone = COALESCE(NULLIF(phone, ''), '04 90 00 10 01'),
      role = 'DGS',
      department = 'Direction Générale',
      parent_contact_id = NULL,
      organization_id = ctx.organization_id
    WHERE id = v_marie;
  END IF;

  -- Sophie Bernard (DST) — enfant direct de Marie
  SELECT id INTO v_sophie FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('s.bernard@gsi-concept.fr')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_sophie IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002',
      ctx.organization_id,
      'Sophie', 'Bernard', 's.bernard@gsi-concept.fr', '04 90 00 10 02',
      'DST', 'Services Techniques', v_marie
    )
    RETURNING id INTO v_sophie;
  ELSE
    UPDATE app.contacts SET
      first_name = 'Sophie', last_name = 'Bernard',
      phone = '04 90 00 10 02', role = 'DST', department = 'Services Techniques',
      parent_contact_id = v_marie,
      organization_id = ctx.organization_id
    WHERE id = v_sophie;
  END IF;

  -- Claire Martin (Élu) — enfant direct de Marie
  SELECT id INTO v_claire FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('c.martin@arles.fr')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_claire IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003',
      ctx.organization_id,
      'Claire', 'Martin', 'c.martin@arles.fr', '04 90 00 20 01',
      'Élu', 'Syndicat', v_marie
    )
    RETURNING id INTO v_claire;
  ELSE
    UPDATE app.contacts SET
      first_name = 'Claire', last_name = 'Martin',
      phone = '04 90 00 20 01', role = 'Élu', department = 'Syndicat',
      parent_contact_id = v_marie,
      organization_id = ctx.organization_id
    WHERE id = v_claire;
  END IF;

  -- Équipe sous Sophie Bernard
  SELECT id INTO v_julien FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('j.roux@gsi-concept.fr')
  ORDER BY created_at ASC LIMIT 1;

  IF v_julien IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004',
      ctx.organization_id,
      'Julien', 'Roux', 'j.roux@gsi-concept.fr', '04 90 00 10 10',
      'Chargé d''affaires', 'Services Techniques', v_sophie
    )
    RETURNING id INTO v_julien;
  ELSE
    UPDATE app.contacts SET
      first_name = 'Julien', last_name = 'Roux',
      phone = '04 90 00 10 10', role = 'Chargé d''affaires', department = 'Services Techniques',
      parent_contact_id = v_sophie,
      organization_id = ctx.organization_id
    WHERE id = v_julien;
  END IF;

  SELECT id INTO v_camille FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('c.rousseau@gsi-concept.fr')
  ORDER BY created_at ASC LIMIT 1;

  IF v_camille IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005',
      ctx.organization_id,
      'Camille', 'Rousseau', 'c.rousseau@gsi-concept.fr', '04 90 00 10 15',
      'Chargé d''affaires', 'Éclairage public', v_sophie
    )
    RETURNING id INTO v_camille;
  ELSE
    UPDATE app.contacts SET
      first_name = 'Camille', last_name = 'Rousseau',
      phone = '04 90 00 10 15', role = 'Chargé d''affaires', department = 'Éclairage public',
      parent_contact_id = v_sophie,
      organization_id = ctx.organization_id
    WHERE id = v_camille;
  END IF;

  SELECT id INTO v_marc FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('m.durand@gsi-concept.fr')
  ORDER BY created_at ASC LIMIT 1;

  IF v_marc IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006',
      ctx.organization_id,
      'Marc', 'Durand', 'm.durand@gsi-concept.fr', '04 90 00 10 11',
      'Technicien', 'Voirie', v_sophie
    )
    RETURNING id INTO v_marc;
  ELSE
    UPDATE app.contacts SET
      first_name = 'Marc', last_name = 'Durand',
      phone = '04 90 00 10 11', role = 'Technicien', department = 'Voirie',
      parent_contact_id = v_sophie,
      organization_id = ctx.organization_id
    WHERE id = v_marc;
  END IF;

  SELECT id INTO v_luc FROM app.contacts
  WHERE organization_id = ctx.organization_id
    AND lower(email) = lower('l.petit@gsi-concept.fr')
  ORDER BY created_at ASC LIMIT 1;

  IF v_luc IS NULL THEN
    INSERT INTO app.contacts (
      id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
    ) VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007',
      ctx.organization_id,
      'Luc', 'Petit', 'l.petit@gsi-concept.fr', '04 90 00 10 16',
      'Technicien', 'IRVE', v_sophie
    )
    RETURNING id INTO v_luc;
  ELSE
    UPDATE app.contacts SET
      first_name = 'Luc', last_name = 'Petit',
      phone = '04 90 00 10 16', role = 'Technicien', department = 'IRVE',
      parent_contact_id = v_sophie,
      organization_id = ctx.organization_id
    WHERE id = v_luc;
  END IF;

  INSERT INTO _seed_contacts (email, contact_id) VALUES
    (lower(ctx.marie_email), v_marie),
    ('s.bernard@gsi-concept.fr', v_sophie),
    ('c.martin@arles.fr', v_claire),
    ('j.roux@gsi-concept.fr', v_julien),
    ('c.rousseau@gsi-concept.fr', v_camille),
    ('m.durand@gsi-concept.fr', v_marc),
    ('l.petit@gsi-concept.fr', v_luc);
END $$;

-- ---------------------------------------------------------------------------
-- 3. Tickets de maintenance — même organization_id que Marie
-- ---------------------------------------------------------------------------

DELETE FROM app.tickets_maintenance
WHERE id IN (
  'cccccccc-cccc-cccc-cccc-ccccccccc101',
  'cccccccc-cccc-cccc-cccc-ccccccccc102',
  'cccccccc-cccc-cccc-cccc-ccccccccc103',
  'cccccccc-cccc-cccc-cccc-ccccccccc104',
  'cccccccc-cccc-cccc-cccc-ccccccccc105',
  'cccccccc-cccc-cccc-cccc-ccccccccc106',
  'cccccccc-cccc-cccc-cccc-ccccccccc107',
  'cccccccc-cccc-cccc-cccc-ccccccccc108',
  'cccccccc-cccc-cccc-cccc-ccccccccc109',
  'cccccccc-cccc-cccc-cccc-ccccccccc110',
  'cccccccc-cccc-cccc-cccc-ccccccccc111',
  'cccccccc-cccc-cccc-cccc-ccccccccc112'
);

UPDATE app.tickets_maintenance t
SET assigned_contact_id = NULL
WHERE t.id <> '22222222-2222-2222-2222-222222222201'
  AND t.assigned_contact_id IN (SELECT contact_id FROM _seed_contacts)
  AND t.id::text NOT LIKE 'cccccccc-cccc-cccc-cccc-%';

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
  assigned_contact_id
)
SELECT
  v.id,
  ctx.organization_id,
  v.title,
  v.description,
  v.status,
  v.priority,
  v.asset_id,
  '13004',
  ctx.created_by,
  CASE WHEN v.assign_provider THEN ctx.provider_id ELSE NULL END,
  m.contact_id
FROM _seed_ctx ctx
CROSS JOIN (
  VALUES
    -- Marc Durand — 5 tickets actifs (surcharge)
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc101'::uuid,
      'Défaut d''isolement Armoire A12',
      'Mesure d''isolement < 0,5 MΩ sur le circuit 3 (Avenue Jean Jaurès). Coupure nocturne signalée par riverains.',
      'open', 'critical',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103'::uuid,
      'm.durand@gsi-concept.fr', true
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc102'::uuid,
      'Remplacement transformateur BT',
      'Transformateur 250 kVA saturé — ZI Nord. Remplacement programmé, coordination Enedis.',
      'in_progress', 'high',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104'::uuid,
      'm.durand@gsi-concept.fr', true
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc103'::uuid,
      'Inspection annuelle poste de livraison',
      'Thermographie IR + serrage barres — poste République. Rapport à transmettre à la DST.',
      'open', 'high',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa106'::uuid,
      'm.durand@gsi-concept.fr', false
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc104'::uuid,
      'Câble dénudé — rue du Refuge',
      'Câble aérien endommagé suite tempête. Sécurisation en attente.',
      'in_progress', 'critical',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104'::uuid,
      'm.durand@gsi-concept.fr', true
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc105'::uuid,
      'Horloge astronomique hors sync',
      'Allumage / extinction décalés de 2 h sur le secteur Clemenceau.',
      'open', 'medium',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa106'::uuid,
      'm.durand@gsi-concept.fr', false
    ),

    -- Camille Rousseau — 2 tickets seed (+ historique éventuel)
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc106'::uuid,
      'Armoire EP — diagnostic éclairage public',
      'Audit circuits 1–4 suite plainte commune (lié rénovation Avenue Jean Jaurès).',
      'in_progress', 'medium',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa103'::uuid,
      'c.rousseau@gsi-concept.fr', false
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc107'::uuid,
      'Suivi maintenance préventive EP Nord',
      'Planification tournée LED — secteur arènes / postes HT-BT.',
      'open', 'low',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa104'::uuid,
      'c.rousseau@gsi-concept.fr', false
    ),

    -- Julien Roux — 2 tickets actifs
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc108'::uuid,
      'Borne IRVE Gare — erreur communication',
      'Borne hors ligne OCPP depuis 12 h. Redémarrage distant échoué.',
      'open', 'high',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101'::uuid,
      'j.roux@gsi-concept.fr', true
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc109'::uuid,
      'Borne centre aquatique — puissance limitée',
      'Charge plafonnée à 7 kW au lieu de 50 kW. Investigation contrat.',
      'in_progress', 'medium',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa102'::uuid,
      'j.roux@gsi-concept.fr', true
    ),

    -- Luc Petit — 1 ticket actif
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc110'::uuid,
      'Borne Zone commerciale Nord — hors service',
      'Voyant rouge fixe, aucune session possible. Remplacement carte mère ?',
      'open', 'critical',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa105'::uuid,
      'l.petit@gsi-concept.fr', true
    ),

    -- Tickets inactifs (hors charge)
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc111'::uuid,
      'Intervention terminée — fuse LED',
      'Remplacement fusibles secteur Refuge. Clôturé.',
      'closed', 'low',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa106'::uuid,
      'm.durand@gsi-concept.fr', false
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccc112'::uuid,
      'Borne Gare — reset logiciel OK',
      'Incident résolu après mise à jour firmware.',
      'resolved', 'medium',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa101'::uuid,
      'j.roux@gsi-concept.fr', false
    )
) AS v(id, title, description, status, priority, asset_id, contact_email, assign_provider)
JOIN _seed_contacts m ON lower(m.email) = lower(v.contact_email);

-- Ticket démo historique → Camille + org Marie
UPDATE app.tickets_maintenance t
SET
  organization_id = ctx.organization_id,
  assigned_contact_id = m.contact_id,
  status = 'in_progress',
  commune_insee_code = COALESCE(NULLIF(t.commune_insee_code, ''), '13004')
FROM _seed_ctx ctx
JOIN _seed_contacts m ON lower(m.email) = lower('c.rousseau@gsi-concept.fr')
WHERE t.id = '22222222-2222-2222-2222-222222222201';

-- ---------------------------------------------------------------------------
-- 4. Contrôle post-seed
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  ctx RECORD;
  v_marie_email TEXT;
  v_marc_active INTEGER;
  v_camille_active INTEGER;
  v_julien_active INTEGER;
  v_luc_active INTEGER;
  v_marie_active INTEGER;
  v_marie_parent_ok BOOLEAN;
BEGIN
  SELECT * INTO ctx FROM _seed_ctx LIMIT 1;
  v_marie_email := lower(ctx.marie_email);

  SELECT COUNT(*) INTO v_marc_active
  FROM app.tickets_maintenance t
  JOIN _seed_contacts m ON m.contact_id = t.assigned_contact_id
  WHERE lower(m.email) = lower('m.durand@gsi-concept.fr')
    AND t.status IN ('open', 'in_progress')
    AND t.organization_id = ctx.organization_id;

  SELECT COUNT(*) INTO v_camille_active
  FROM app.tickets_maintenance t
  JOIN _seed_contacts m ON m.contact_id = t.assigned_contact_id
  WHERE lower(m.email) = lower('c.rousseau@gsi-concept.fr')
    AND t.status IN ('open', 'in_progress')
    AND t.organization_id = ctx.organization_id;

  SELECT COUNT(*) INTO v_julien_active
  FROM app.tickets_maintenance t
  JOIN _seed_contacts m ON m.contact_id = t.assigned_contact_id
  WHERE lower(m.email) = lower('j.roux@gsi-concept.fr')
    AND t.status IN ('open', 'in_progress')
    AND t.organization_id = ctx.organization_id;

  SELECT COUNT(*) INTO v_luc_active
  FROM app.tickets_maintenance t
  JOIN _seed_contacts m ON m.contact_id = t.assigned_contact_id
  WHERE lower(m.email) = lower('l.petit@gsi-concept.fr')
    AND t.status IN ('open', 'in_progress')
    AND t.organization_id = ctx.organization_id;

  SELECT COUNT(*) INTO v_marie_active
  FROM app.tickets_maintenance t
  JOIN _seed_contacts m ON m.contact_id = t.assigned_contact_id
  WHERE lower(m.email) = v_marie_email
    AND t.status IN ('open', 'in_progress')
    AND t.organization_id = ctx.organization_id;

  SELECT EXISTS (
    SELECT 1
    FROM app.contacts sophie
    JOIN app.contacts marie ON marie.id = sophie.parent_contact_id
    WHERE lower(sophie.email) = lower('s.bernard@gsi-concept.fr')
      AND lower(marie.email) = v_marie_email
      AND sophie.organization_id = ctx.organization_id
  ) AND EXISTS (
    SELECT 1
    FROM app.contacts claire
    JOIN app.contacts marie ON marie.id = claire.parent_contact_id
    WHERE lower(claire.email) = lower('c.martin@arles.fr')
      AND lower(marie.email) = v_marie_email
      AND claire.organization_id = ctx.organization_id
  ) INTO v_marie_parent_ok;

  IF NOT v_marie_parent_ok THEN
    RAISE EXCEPTION 'Seed invalide : Marie Lefranc doit être parente de Sophie Bernard et Claire Martin';
  END IF;

  IF EXISTS (
    SELECT 1 FROM app.tickets_maintenance t
    WHERE t.id::text LIKE 'cccccccc-cccc-cccc-cccc-%'
      AND t.organization_id <> ctx.organization_id
  ) THEN
    RAISE EXCEPTION 'Seed invalide : des tickets seed n''ont pas l''organization_id de Marie Lefranc';
  END IF;

  IF EXISTS (
    SELECT 1 FROM app.energy_assets ea
    WHERE ea.id::text LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-%'
      AND ea.organization_id <> ctx.organization_id
  ) THEN
    RAISE EXCEPTION 'Seed invalide : des actifs seed n''ont pas l''organization_id de Marie Lefranc';
  END IF;

  IF v_marc_active < 5 THEN
    RAISE EXCEPTION 'Seed invalide : Marc Durand devrait avoir ≥ 5 tickets actifs (trouvé %)', v_marc_active;
  END IF;

  IF v_camille_active < 1 OR v_camille_active > 3 THEN
    RAISE EXCEPTION 'Seed invalide : Camille Rousseau devrait avoir 1–3 tickets actifs (trouvé %)', v_camille_active;
  END IF;

  IF v_julien_active < 1 OR v_julien_active > 3 THEN
    RAISE EXCEPTION 'Seed invalide : Julien Roux devrait avoir 1–3 tickets actifs (trouvé %)', v_julien_active;
  END IF;

  IF v_luc_active <> 1 THEN
    RAISE EXCEPTION 'Seed invalide : Luc Petit devrait avoir 1 ticket actif (trouvé %)', v_luc_active;
  END IF;

  IF v_marie_active <> 0 THEN
    RAISE EXCEPTION 'Seed invalide : Marie Lefranc devrait avoir 0 ticket actif (trouvé %)', v_marie_active;
  END IF;

  IF (
    SELECT COUNT(*) FROM app.projects p
    WHERE p.id::text LIKE 'dddddddd-dddd-dddd-dddd-%'
      AND p.organization_id = ctx.organization_id
  ) < 5 THEN
    RAISE EXCEPTION 'Seed invalide : 5 projets démo attendus (dddddddd-…) pour l''org Marie';
  END IF;

  IF (
    SELECT COUNT(*) FROM app.workflow_steps w
    JOIN app.projects p ON p.id = w.project_id
    WHERE p.id::text LIKE 'dddddddd-dddd-dddd-dddd-%'
      AND w.organization_id = ctx.organization_id
  ) < 25 THEN
    RAISE EXCEPTION 'Seed invalide : 5×5 étapes workflow attendues pour les projets démo';
  END IF;

  RAISE NOTICE 'Seed OK — Marie=% org=% | charge : Marc=% Camille=% Julien=% Luc=% Marie=% | projets=5 | workflow OK',
    ctx.marie_email, ctx.organization_id,
    v_marc_active, v_camille_active, v_julien_active, v_luc_active, v_marie_active;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
