-- 0. Assurer la présence des schémas requis
CREATE SCHEMA IF NOT EXISTS app;

-- 1. Nettoyage préventif
TRUNCATE TABLE app.tickets_maintenance CASCADE;
TRUNCATE TABLE app.contacts CASCADE;

DO $$
DECLARE
  -- Organisations
  v_org_main_id uuid := '11111111-1111-1111-1111-111111111111';
  v_org_ext_id  uuid := '22222222-2222-2222-2222-222222222222';

  -- Contacts Org Principale
  v_dgs_id   uuid := 'c1000000-0000-0000-0000-000000000001';
  v_dst_id   uuid := 'c1000000-0000-0000-0000-000000000002';
  v_ca1_id   uuid := 'c1000000-0000-0000-0000-000000000003';
  v_ca2_id   uuid := 'c1000000-0000-0000-0000-000000000004';
  v_tech1_id uuid := 'c1000000-0000-0000-0000-000000000005';
  v_tech2_id uuid := 'c1000000-0000-0000-0000-000000000006';
  v_tech3_id uuid := 'c1000000-0000-0000-0000-000000000007';
  v_elu_id   uuid := 'c1000000-0000-0000-0000-000000000008';

  -- Équipements (Assets)
  v_asset_ep1_id   uuid := 'a1000000-0000-0000-0000-000000000001';
  v_asset_ep2_id   uuid := 'a1000000-0000-0000-0000-000000000002';
  v_asset_irve1_id uuid := 'a1000000-0000-0000-0000-000000000003';
  v_asset_irve2_id uuid := 'a1000000-0000-0000-0000-000000000004';
  v_asset_pv1_id   uuid := 'a1000000-0000-0000-0000-000000000005';

BEGIN

  -----------------------------------------------------------------------------
  -- A. ORGANISATIONS
  -----------------------------------------------------------------------------
  INSERT INTO public.organizations (id, name)
  VALUES 
    (v_org_main_id, 'Syndicat Énergie Métropole'),
    (v_org_ext_id, 'Commune de Saint-Éloi')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -----------------------------------------------------------------------------
  -- B. ÉQUIPEMENTS ÉNERGÉTIQUES (Types normalisés sans accents/caractères spéciaux)
  -----------------------------------------------------------------------------
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'energy_assets') THEN
    INSERT INTO app.energy_assets (id, organization_id, name, type, commune_insee_code, latitude, longitude)
    VALUES 
      (v_asset_ep1_id, v_org_main_id, 'Armoire EP - Centre Ville', 'public_lighting', '69123', 45.7675, 4.8336),
      (v_asset_ep2_id, v_org_main_id, 'Poste HT/BT - Zone Industrielle', 'public_lighting', '69123', 45.7500, 4.8500),
      (v_asset_irve1_id, v_org_main_id, 'Station IRVE - Place du Marché', 'irve', '69266', 45.7667, 4.8792),
      (v_asset_irve2_id, v_org_main_id, 'Borne Rapide 50kW - Gare', 'irve', '69266', 45.7600, 4.8800),
      (v_asset_pv1_id, v_org_main_id, 'Centrale Solaire - Gymnase Municipal', 'photovoltaic', '69029', 45.7333, 4.9117)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -----------------------------------------------------------------------------
  -- C. ANNUAIRE & ORGANIGRAMME
  -----------------------------------------------------------------------------
  
  -- Level 1: Direction Générale
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
    (v_dgs_id, v_org_main_id, 'Valérie', 'Mercier', 'v.mercier@syndicat-energie.fr', '04 72 00 11 22', 'Directrice Générale (DGS)', 'Direction Générale', NULL);

  -- Level 2: Direction Technique
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
    (v_dst_id, v_org_main_id, 'Alexandre', 'Dubois', 'a.dubois@syndicat-energie.fr', '04 72 00 11 23', 'Directeur Services Techniques (DST)', 'Services Techniques', v_dgs_id);

  -- Level 3: Chargés d'affaires / Chefs de pôle
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
    (v_ca1_id, v_org_main_id, 'Camille', 'Rousseau', 'c.rousseau@syndicat-energie.fr', '06 11 22 33 44', 'Responsable Pôle Éclairage', 'Pôle Éclairage Public', v_dst_id),
    (v_ca2_id, v_org_main_id, 'Thomas', 'Bernard', 't.bernard@syndicat-energie.fr', '06 55 66 77 88', 'Responsable Pôle Mobilité', 'Pôle IRVE & Mobilité', v_dst_id);

  -- Level 4: Techniciens de Terrain
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
    (v_tech1_id, v_org_main_id, 'Lucas', 'Moreau', 'l.moreau@syndicat-energie.fr', '06 99 88 77 66', 'Technicien Senior EP', 'Pôle Éclairage Public', v_ca1_id),
    (v_tech2_id, v_org_main_id, 'Sophie', 'Lefebvre', 's.lefebvre@syndicat-energie.fr', '06 44 33 22 11', 'Technicienne Spécialiste IRVE', 'Pôle IRVE & Mobilité', v_ca2_id),
    (v_tech3_id, v_org_main_id, 'Maxime', 'Gautier', 'm.gautier@syndicat-energie.fr', '06 77 88 99 00', 'Technicien Maintenance', 'Pôle Éclairage Public', v_ca1_id);

  -- Contact Hors-Hiérarchie : Élu Référent
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
    (v_elu_id, v_org_main_id, 'Jean-Pierre', 'Girard', 'jp.girard@saint-eloi.fr', '04 72 99 00 11', 'Vice-Président Énergie', 'Conseil Syndical', NULL);

  -----------------------------------------------------------------------------
  -- D. TICKETS DE MAINTENANCE
  -----------------------------------------------------------------------------
  
  -- 1. SURCHARGE (5 Tickets) : Lucas Moreau -> BADGE ROUGE 🔴
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org_main_id, v_asset_ep1_id, 'Panne secteur Allée des Lices', 'Coupure totale sur 18 candélabres.', 'open', 'urgent', v_tech1_id),
    (v_org_main_id, v_asset_ep1_id, 'Contrôle réglementaire armoire N°4', 'Visite annuelle de conformité électrique.', 'in_progress', 'low', v_tech1_id),
    (v_org_main_id, v_asset_ep2_id, 'Horloge astronomique hs', 'Éclairage reste allumé en journée.', 'open', 'high', v_tech1_id),
    (v_org_main_id, v_asset_ep2_id, 'Remplacement mât endommagé', 'Choc véhicule léger sur mât N°12.', 'open', 'high', v_tech1_id),
    (v_org_main_id, v_asset_ep1_id, 'Reprise étanchéité boîte de jonction', 'Infiltration eau observée lors du dernier passage.', 'open', 'medium', v_tech1_id);

  -- 2. NORMAL (2 Tickets) : Sophie Lefebvre -> BADGE VERT 🟢
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org_main_id, v_asset_irve1_id, 'Défaut de communication 4G', 'La borne n''envoie plus les télémesures.', 'in_progress', 'high', v_tech2_id),
    (v_org_main_id, v_asset_irve2_id, 'Verrouillage prise T2 défaillant', 'Bloque les usagers en fin de charge.', 'open', 'medium', v_tech2_id);

  -- 3. NORMAL (1 Ticket) : Camille Rousseau -> BADGE VERT 🟢
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org_main_id, v_asset_pv1_id, 'Validation étude raccordement PV', 'Analyse du dossier d''injection réseau.', 'in_progress', 'low', v_ca1_id);

  -- 4. NORMAL (3 Tickets) : Maxime Gautier -> BADGE VERT 🟢
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org_main_id, v_asset_ep1_id, 'Nettoyage des crosses et verres', 'Entretien préventif trimestriel.', 'open', 'low', v_tech3_id),
    (v_org_main_id, v_asset_ep2_id, 'Test d''isolement ligne Sud', 'Mesure préventive d''isolement des câbles.', 'open', 'medium', v_tech3_id),
    (v_org_main_id, v_asset_ep1_id, 'Remplacement cellule photoélectrique', 'Éclairage clignote au crépuscule.', 'in_progress', 'medium', v_tech3_id);

  -- 5. TICKETS NON ASSIGNÉS
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org_main_id, v_asset_irve2_id, 'Demande d''extension station IRVE', 'Ajout de 2 points de charge supplémentaires.', 'open', 'medium', NULL),
    (v_org_main_id, v_asset_pv1_id, 'Nettoyage des panneaux solaires', 'Baisse de rendement observée (-12%).', 'open', 'low', NULL);

END $$;