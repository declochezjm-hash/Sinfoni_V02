-- 1. Droits d'usage sur le schéma sous-jacent 'app'
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

-- 2. Recréation / Vérification des vues exposées dans 'public'
CREATE OR REPLACE VIEW public.users AS 
  SELECT * FROM app.users;

CREATE OR REPLACE VIEW public.contacts AS 
  SELECT * FROM app.contacts;

CREATE OR REPLACE VIEW public.energy_assets AS 
  SELECT * FROM app.energy_assets;

CREATE OR REPLACE VIEW public.tickets_maintenance AS 
  SELECT * FROM app.tickets_maintenance;

-- 3. Droits sur le schéma 'public'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Rechargement du cache du schéma PostgREST
NOTIFY pgrst, 'reload schema';-- 0. Assurer que le schéma 'app' existe
CREATE SCHEMA IF NOT EXISTS app;

-- 1. Nettoyage préventif
TRUNCATE TABLE app.tickets_maintenance CASCADE;
TRUNCATE TABLE app.contacts CASCADE;

DO $$
DECLARE
  v_org1_id uuid := '11111111-1111-1111-1111-111111111111';
  v_org2_id uuid := '22222222-2222-2222-2222-222222222222';
  
  -- Asset générique de test
  v_asset_id uuid := 'a1000000-0000-0000-0000-000000000001';

  -- Contacts Org 1
  v_dgs_id   uuid := 'c1000000-0000-0000-0000-000000000001';
  v_dst_id   uuid := 'c1000000-0000-0000-0000-000000000002';
  v_ca1_id   uuid := 'c1000000-0000-0000-0000-000000000003';
  v_ca2_id   uuid := 'c1000000-0000-0000-0000-000000000004';
  v_tech1_id uuid := 'c1000000-0000-0000-0000-000000000005';
  v_tech2_id uuid := 'c1000000-0000-0000-0000-000000000006';
  v_elu_id   uuid := 'c1000000-0000-0000-0000-000000000007';

  -- Contacts Org 2
  v_dir_id   uuid := 'c2000000-0000-0000-0000-000000000001';
  v_tech3_id uuid := 'c2000000-0000-0000-0000-000000000002';

BEGIN

  -----------------------------------------------------------------------------
  -- A. ORGANISATIONS & EQUIPEMENT TEST
  -----------------------------------------------------------------------------
  INSERT INTO public.organizations (id, name)
  VALUES 
    (v_org1_id, 'Syndicat Énergie & Innovation'),
    (v_org2_id, 'Territoire Énergie 69')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Équipement par défaut (sans statut pour éviter le check constraint)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'energy_assets') THEN
    INSERT INTO app.energy_assets (id, organization_id, name, type)
    VALUES (v_asset_id, v_org1_id, 'Armoire Générale - Secteur Centre', 'Eclairage Public')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -----------------------------------------------------------------------------
  -- B. ANNUAIRE DE CONTACTS
  -----------------------------------------------------------------------------
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
    (v_dgs_id, v_org1_id, 'Valérie', 'Mercier', 'valerie.mercier@syndicat-energie.fr', '04 72 00 11 22', 'DGS', 'Direction Générale', NULL),
    (v_dst_id, v_org1_id, 'Alexandre', 'Dubois', 'alexandre.dubois@syndicat-energie.fr', '04 72 00 11 23', 'DST', 'Services Techniques', v_dgs_id),
    (v_ca1_id, v_org1_id, 'Camille', 'Rousseau', 'camille.rousseau@syndicat-energie.fr', '06 11 22 33 44', 'Chargé d''affaires', 'Pôle Éclairage Public', v_dst_id),
    (v_ca2_id, v_org1_id, 'Thomas', 'Bernard', 'thomas.bernard@syndicat-energie.fr', '06 55 66 77 88', 'Chargé d''affaires', 'Pôle IRVE & Mobilité', v_dst_id),
    (v_tech1_id, v_org1_id, 'Lucas', 'Moreau', 'lucas.moreau@syndicat-energie.fr', '06 99 88 77 66', 'Technicien Éclairage', 'Pôle Éclairage Public', v_ca1_id),
    (v_tech2_id, v_org1_id, 'Sophie', 'Lefebvre', 'sophie.lefebvre@syndicat-energie.fr', '06 44 33 22 11', 'Technicienne Borne IRVE', 'Pôle IRVE & Mobilité', v_ca2_id),
    (v_elu_id, v_org1_id, 'Jean-Pierre', 'Girard', 'jp.girard@commune-exemple.fr', '04 72 99 00 11', 'Maire & Élu Référent', 'Conseil Syndical', NULL),
    (v_dir_id, v_org2_id, 'Marc', 'Vidal', 'marc.vidal@te69.fr', '04 78 00 99 88', 'Directeur', 'Direction', NULL),
    (v_tech3_id, v_org2_id, 'Julie', 'Bertrand', 'julie.bertrand@te69.fr', '06 12 34 56 78', 'Technicienne', 'Exploitation', v_dir_id);

  -----------------------------------------------------------------------------
  -- C. TICKETS DE MAINTENANCE (avec asset_id)
  -----------------------------------------------------------------------------
  
  -- Camille Rousseau (1 ticket -> 🟢)
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org1_id, v_asset_id, 'Panne armoire EP - Sectorielle', 'Horloge astronomique hs suite orage.', 'in_progress', 'high', v_ca1_id);

  -- Sophie Lefebvre (2 tickets -> 🟢)
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org1_id, v_asset_id, 'Défaut com carte SIM Borne IRVE', 'Lecteur RFID ne répond plus.', 'open', 'high', v_tech2_id),
    (v_org1_id, v_asset_id, 'Câble T2 bloqué', 'Connecteur verrouillé sur station 22kW.', 'in_progress', 'medium', v_tech2_id);

  -- Lucas Moreau (5 tickets -> 🔴 Surcharge)
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org1_id, v_asset_id, 'Remplacement lanterne LED Vénissieux', 'Lanterne cassée suite choc véhicule.', 'open', 'urgent', v_tech1_id),
    (v_org1_id, v_asset_id, 'Contrôle annuel des armoires - Zone Est', 'Visite de sécurité réglementaire.', 'in_progress', 'low', v_tech1_id),
    (v_org1_id, v_asset_id, 'Câble souterrain arraché', 'Travaux voie publique ayant sectionné le câble.', 'open', 'urgent', v_tech1_id),
    (v_org1_id, v_asset_id, 'Remplacement fusible secteur Mairie', 'Coupure sur 12 foyers lumineux.', 'open', 'high', v_tech1_id),
    (v_org1_id, v_asset_id, 'Nettoyage optiques et mâture', 'Entretien préventif programmé.', 'open', 'low', v_tech1_id);

  -- Tickets non assignés
  INSERT INTO app.tickets_maintenance (organization_id, asset_id, title, description, status, priority, assigned_contact_id)
  VALUES 
    (v_org1_id, v_asset_id, 'Demande de raccordement nouvelle borne', 'Étude de faisabilité technique.', 'open', 'low', NULL),
    (v_org1_id, v_asset_id, 'Signalement citoyen - Éclairage clignotant', 'Avenue de la République.', 'open', 'medium', NULL);

END $$;