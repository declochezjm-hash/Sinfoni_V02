DO $$
DECLARE
  v_org_id UUID;
  v_marie_id UUID;
  v_sophie_id UUID;
  v_marc_id UUID;
  v_julien_id UUID;
BEGIN
  -- 1. Récupération des identifiants existants
  SELECT organization_id, id INTO v_org_id, v_marie_id
  FROM app.contacts
  WHERE role = 'DGS' OR email ILIKE '%marie%'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Contact Marie Lefranc introuvable. Exécutez d''abord le script de calage des contacts.';
  END IF;

  SELECT id INTO v_sophie_id FROM app.contacts WHERE email = 's.bernard@demo-sinfoni.fr' LIMIT 1;
  SELECT id INTO v_marc_id FROM app.contacts WHERE email = 'm.durand@demo-sinfoni.fr' LIMIT 1;
  SELECT id INTO v_julien_id FROM app.contacts WHERE email = 'j.roux@demo-sinfoni.fr' LIMIT 1;

  -- 2. Nettoyage optionnel des anciennes affaires de démo
  DELETE FROM app.affaires WHERE organization_id = v_org_id AND code LIKE 'AFF-DEMO-%';

  -- 3. Insertion des affaires aux différentes étapes d'avancement

  -- ÉTAPE 1 : Étude & Cadrage (10% - 25%)
  INSERT INTO app.affaires (
    id, organization_id, code, title, description, status, progress_pct, 
    assigned_to_id, created_by_id, budget_estimated, start_date, target_completion_date
  ) VALUES (
    'bbbbbbbb-0001-0000-0000-000000000001',
    v_org_id,
    'AFF-DEMO-001',
    'Rénovation Éclairage Public - Secteur Nord',
    'Passage de 120 points lumineux en LED haute efficacité et horloges astronomiques.',
    'etude',
    15,
    v_julien_id,
    v_marie_id,
    45000.00,
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '90 days'
  );

  -- ÉTAPE 2 : Consultation & Marché (35% - 50%)
  INSERT INTO app.affaires (
    id, organization_id, code, title, description, status, progress_pct, 
    assigned_to_id, created_by_id, budget_estimated, start_date, target_completion_date
  ) VALUES (
    'bbbbbbbb-0002-0000-0000-000000000002',
    v_org_id,
    'AFF-DEMO-002',
    'Déploiement Bornes IRVE - Parking Centre-Ville',
    'Installation de 4 bornes de recharge accélérée 22kW avec système de supervision.',
    'consultation',
    40,
    v_marc_id,
    v_sophie_id,
    68000.00,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '60 days'
  );

  -- ÉTAPE 3 : Travaux en Cours (65% - 85%)
  INSERT INTO app.affaires (
    id, organization_id, code, title, description, status, progress_pct, 
    assigned_to_id, created_by_id, budget_estimated, start_date, target_completion_date
  ) VALUES (
    'bbbbbbbb-0003-0000-0000-000000000003',
    v_org_id,
    'AFF-DEMO-003',
    'Audit Énergétique & Solarisations Bâtiments',
    'Pose de panneaux photovoltaïques en autoconsommation sur le gymnase municipal.',
    'en_cours',
    75,
    v_marc_id,
    v_sophie_id,
    120000.00,
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE + INTERVAL '20 days'
  );

  -- ÉTAPE 4 : Réception & Clôture (90% - 100%)
  INSERT INTO app.affaires (
    id, organization_id, code, title, description, status, progress_pct, 
    assigned_to_id, created_by_id, budget_estimated, start_date, target_completion_date
  ) VALUES (
    'bbbbbbbb-0004-0000-0000-000000000004',
    v_org_id,
    'AFF-DEMO-004',
    'Mise en conformité Armoires Électriques Zone Ouest',
    'Remplacement des départs obsolètes et reprise de la mise à la terre.',
    'cloture',
    100,
    v_julien_id,
    v_marie_id,
    28000.00,
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE - INTERVAL '5 days'
  );

  RAISE NOTICE '4 affaires de démo créées avec succès sous l''org %', v_org_id;
END $$;