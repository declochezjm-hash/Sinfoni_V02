-- 1. Récupération dynamique d'une organisation existante (ou remplacez par votre UUID d'organisation)
DO $$
DECLARE
  v_org_id uuid;
  v_dgs_id uuid := gen_random_uuid();
  v_dst_id uuid := gen_random_uuid();
  v_ca1_id uuid := gen_random_uuid();
  v_ca2_id uuid := gen_random_uuid();
BEGIN
  -- Récupère la première organisation disponible
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Aucune organisation trouvée. Veuillez d abord créer une organisation.';
    RETURN;
  END IF;

  -- Nettoyage préalable des données de test sur cette organisation (optionnel)
  -- DELETE FROM app.contacts WHERE organization_id = v_org_id;

  -- 2. Niveau 1 : Direction Générale des Services (Racine de l'organigramme)
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES (
    v_dgs_id,
    v_org_id,
    'Valérie',
    'Mercier',
    'valerie.mercier@syndicat-energie.fr',
    '04 72 00 11 22',
    'DGS',
    'Direction Générale',
    NULL
  );

  -- 3. Niveau 2 : Direction des Services Techniques (Rattaché à la DGS)
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES (
    v_dst_id,
    v_org_id,
    'Alexandre',
    'Dubois',
    'alexandre.dubois@syndicat-energie.fr',
    '04 72 00 11 23',
    'DST',
    'Services Techniques',
    v_dgs_id
  );

  -- 4. Niveau 3 : Chargés d'Affaires (Rattachés au DST)
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
  (
    v_ca1_id,
    v_org_id,
    'Camille',
    'Rousseau',
    'camille.rousseau@syndicat-energie.fr',
    '06 11 22 33 44',
    'Chargé d''affaires',
    'Pôle Éclairage Public',
    v_dst_id
  ),
  (
    v_ca2_id,
    v_org_id,
    'Thomas',
    'Bernard',
    'thomas.bernard@syndicat-energie.fr',
    '06 55 66 77 88',
    'Chargé d''affaires',
    'Pôle IRVE & Mobilité',
    v_dst_id
  );

  -- 5. Niveau 4 : Techniciens de Terrain (Rattachés aux Chargés d'affaires respectifs)
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES 
  (
    gen_random_uuid(),
    v_org_id,
    'Lucas',
    'Moreau',
    'lucas.moreau@syndicat-energie.fr',
    '06 99 88 77 66',
    'Technicien',
    'Pôle Éclairage Public',
    v_ca1_id
  ),
  (
    gen_random_uuid(),
    v_org_id,
    'Sophie',
    'Lefebvre',
    'sophie.lefebvre@syndicat-energie.fr',
    '06 44 33 22 11',
    'Technicienne',
    'Pôle IRVE & Mobilité',
    v_ca2_id
  );

  -- 6. Contact Externe / Élu Référent (Sans lien hiérarchique direct)
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, phone, role, department, parent_contact_id)
  VALUES (
    gen_random_uuid(),
    v_org_id,
    'Jean-Pierre',
    'Girard',
    'jp.girard@commune-exemple.fr',
    '04 72 99 00 11',
    'Élu',
    'Conseil Syndical',
    NULL
  );

END $$;