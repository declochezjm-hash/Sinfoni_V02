DO $$
DECLARE
  v_org_id uuid;
  
  -- IDs Contacts
  v_dgs_id uuid := gen_random_uuid();
  v_dst_id uuid := gen_random_uuid();
  v_ca1_id uuid := gen_random_uuid();
  v_ca2_id uuid := gen_random_uuid();
  v_tech1_id uuid := gen_random_uuid();
  v_tech2_id uuid := gen_random_uuid();
  v_elu_id uuid := gen_random_uuid();

  -- IDs Équipements / Actifs
  v_asset_irve1_id uuid := gen_random_uuid();
  v_asset_irve2_id uuid := gen_random_uuid();
  v_asset_ep1_id uuid := gen_random_uuid();
  v_asset_ep2_id uuid := gen_random_uuid();

BEGIN
  -- 1. Récupération ou création d'une organisation
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name)
    VALUES ('Syndicat Énergie & Innovation')
    RETURNING id INTO v_org_id;
  END IF;

  -----------------------------------------------------------------------------
  -- 2. INSERTION DES CONTACTS (Annuaire & Organigramme)
  -----------------------------------------------------------------------------
  
  -- Niveau 1 : DGS
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES (v_dgs_id, v_org_id, 'Valérie', 'Mercier', 'valerie.mercier@syndicat-energie.fr', '04 72 00 11 22', 'DGS', 'Direction Générale', NULL);

  -- Niveau 2 : DST
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES (v_dst_id, v_org_id, 'Alexandre', 'Dubois', 'alexandre.dubois@syndicat-energie.fr', '04 72 00 11 23', 'DST', 'Services Techniques', v_dgs_id);

  -- Niveau 3 : Chargés d'affaires
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
  (v_ca1_id, v_org_id, 'Camille', 'Rousseau', 'camille.rousseau@syndicat-energie.fr', '06 11 22 33 44', 'Chargé d''affaires', 'Pôle Éclairage Public', v_dst_id),
  (v_ca2_id, v_org_id, 'Thomas', 'Bernard', 'thomas.bernard@syndicat-energie.fr', '06 55 66 77 88', 'Chargé d''affaires', 'Pôle IRVE & Mobilité', v_dst_id);

  -- Niveau 4 : Techniciens
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
  (v_tech1_id, v_org_id, 'Lucas', 'Moreau', 'lucas.moreau@syndicat-energie.fr', '06 99 88 77 66', 'Technicien', 'Pôle Éclairage Public', v_ca1_id),
  (v_tech2_id, v_org_id, 'Sophie', 'Lefebvre', 'sophie.lefebvre@syndicat-energie.fr', '06 44 33 22 11', 'Technicienne', 'Pôle IRVE & Mobilité', v_ca2_id);

  -- Contact Externe : Élu
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES (v_elu_id, v_org_id, 'Jean-Pierre', 'Girard', 'jp.girard@commune-exemple.fr', '04 72 99 00 11', 'Élu', 'Conseil Syndical', NULL);

  -----------------------------------------------------------------------------
  -- 3. INSERTION DES ÉQUIPEMENTS DE DÉMONSTRATION (Si table existante)
  -----------------------------------------------------------------------------
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'energy_assets') THEN
    INSERT INTO app.energy_assets (id, organization_id, name, type, status, location_name)
    VALUES 
    (v_asset_irve1_id, v_org_id, 'Station IRVE - Place du Marché', 'IRVE', 'active', 'Lyon 6ème'),
    (v_asset_irve2_id, v_org_id, 'Borne de recharge Rapide - Mairie', 'IRVE', 'maintenance', 'Villeurbanne'),
    (v_asset_ep1_id, v_org_id, 'Armoire EP - Avenue Jean Jaurès', 'Eclairage Public', 'active', 'Bron'),
    (v_asset_ep2_id, v_org_id, 'Poste de Transformation EP - Centre', 'Eclairage Public', 'active', 'Meyzieu')
    ON CONFLICT DO NOTHING;
  END IF;

  -----------------------------------------------------------------------------
  -- 4. INSERTION DES TICKETS DE MAINTENANCE (Pour tester les charges de travail)
  -----------------------------------------------------------------------------
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'tickets_maintenance') THEN
    
    -- Ticket 1 : Assigné à Camille (Charge = 1 -> Badge Vert 🟢)
    INSERT INTO app.tickets_maintenance (organization_id, title, description, status, priority, asset_id, assigned_contact_id)
    VALUES (
      v_org_id, 
      'Défaut d''allumage secteur Nord', 
      'Coupure générale observée sur le secteur suite aux intempéries.', 
      'in_progress', 
      'high', 
      v_asset_ep1_id, 
      v_ca1_id
    );

    -- Tickets 2, 3, 4, 5 : Assignés à Lucas Moreau (Charge = 4 -> Badge Rouge 🔴 pour surcharge)
    INSERT INTO app.tickets_maintenance (organization_id, title, description, status, priority, asset_id, assigned_contact_id)
    VALUES 
    (v_org_id, 'Remplacement lanterne LED', 'Horloge astronomique déréglée.', 'open', 'medium', v_asset_ep1_id, v_tech1_id),
    (v_org_id, 'Contrôle annuel des armoires', 'Visite réglementaire de sécurité.', 'in_progress', 'low', v_asset_ep2_id, v_tech1_id),
    (v_org_id, 'Câble détérioré suite travaux', 'Poteau endommagé par un engin de chantier.', 'open', 'urgent', v_asset_ep1_id, v_tech1_id),
    (v_org_id, 'Nettoyage des optiques', 'Maintenance préventive programmée.', 'open', 'low', v_asset_ep2_id, v_tech1_id);

    -- Ticket 6 : Assigné à Sophie (Charge = 1 -> Badge Vert 🟢)
    INSERT INTO app.tickets_maintenance (organization_id, title, description, status, priority, asset_id, assigned_contact_id)
    VALUES (
      v_org_id, 
      'Erreur de communication lecteur RFID', 
      'Les utilisateurs ne peuvent plus badger sur la prise B.', 
      'open', 
      'high', 
      v_asset_irve1_id, 
      v_tech2_id
    );

    -- Ticket 7 : Non assigné
    INSERT INTO app.tickets_maintenance (organization_id, title, description, status, priority, asset_id, assigned_contact_id)
    VALUES (
      v_org_id, 
      'Câble de recharge bloqué', 
      'Connecteur T2 verrouillé sur le véhicule.', 
      'open', 
      'medium', 
      v_asset_irve2_id, 
      NULL
    );

  END IF;

END $$;