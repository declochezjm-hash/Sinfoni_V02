DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_marie_contact_id UUID;
  v_email TEXT;
BEGIN
  -- 1. Récupération de Marie Lefranc depuis app.users ou auth.users
  SELECT id, organization_id, email INTO v_user_id, v_org_id, v_email
  FROM app.users
  WHERE email ILIKE '%marie%' OR name ILIKE '%marie%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id, (raw_user_meta_data->>'organization_id')::uuid, email INTO v_user_id, v_org_id, v_email
    FROM auth.users
    WHERE email ILIKE '%marie%'
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Marie Lefranc introuvable dans app.users ou auth.users';
  END IF;

  -- 2. Upsert basé sur la clé primaire (id) au lieu de l'email
  INSERT INTO app.contacts (
    id,
    organization_id,
    first_name,
    last_name,
    email,
    role,
    parent_contact_id
  )
  VALUES (
    v_user_id,
    v_org_id,
    'Marie',
    'Lefranc',
    v_email,
    'DGS',
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    email = EXCLUDED.email,
    role = 'DGS',
    parent_contact_id = NULL
  RETURNING id INTO v_marie_contact_id;

  -- 3. Rattachement de la hiérarchie (Sophie Bernard & Claire Martin)
  UPDATE app.contacts
  SET parent_contact_id = v_marie_contact_id,
      organization_id = v_org_id
  WHERE email IN ('s.bernard@demo-sinfoni.fr', 'c.martin@demo-sinfoni.fr');

  -- 4. Alignement des contacts, actifs et tickets du seed
  UPDATE app.contacts SET organization_id = v_org_id WHERE email IN ('j.roux@demo-sinfoni.fr', 'c.rousseau@demo-sinfoni.fr', 'm.durand@demo-sinfoni.fr', 'l.petit@demo-sinfoni.fr');
  UPDATE app.energy_assets SET organization_id = v_org_id WHERE id::text LIKE 'aaaaaaaa-%';
  UPDATE app.tickets_maintenance SET organization_id = v_org_id WHERE id::text LIKE 'cccccccc-%';

  RAISE NOTICE 'Succès ! Marie Lefranc alignée (ID %) sur org %', v_marie_contact_id, v_org_id;
END $$;