DO $$
DECLARE
  v_org_id UUID;
  v_marie_id UUID;
  v_philippe_id UUID;
BEGIN
  -- 1. Récupérer l'organisation principale depuis Marie Lefranc
  SELECT organization_id, id INTO v_org_id, v_marie_id 
  FROM app.users 
  WHERE email ILIKE '%marie%' OR name ILIKE '%marie%' 
  LIMIT 1;

  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- 2. Récupérer Philippe Martin s'il existe déjà par email
  SELECT id INTO v_philippe_id FROM app.users WHERE email = 'p.martin@demo-sinfoni.fr' LIMIT 1;

  IF v_philippe_id IS NULL THEN
    v_philippe_id := 'a1b2c3d4-0000-0000-0000-000000000099'::uuid;
  END IF;

  -- 3. Upsert sécurisé dans app.users basé sur (id)
  INSERT INTO app.users (id, email, name, organization_id, role)
  VALUES (
    v_philippe_id,
    'p.martin@demo-sinfoni.fr',
    'Philippe Martin',
    v_org_id,
    'DST'
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = v_org_id,
    role = 'DST',
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  -- 4. Upsert dans app.contacts basé sur (id)
  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, role, parent_contact_id)
  VALUES (
    v_philippe_id,
    v_org_id,
    'Philippe',
    'Martin',
    'p.martin@demo-sinfoni.fr',
    'DST',
    v_marie_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = v_org_id,
    parent_contact_id = v_marie_id,
    role = 'DST';

  -- 5. Alignement global de toute la base de démo sur la même organization_id
  UPDATE app.users SET organization_id = v_org_id;
  UPDATE app.contacts SET organization_id = v_org_id;
  UPDATE app.energy_assets SET organization_id = v_org_id;
  UPDATE app.tickets_maintenance SET organization_id = v_org_id;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'app' AND tablename = 'affaires') THEN
    UPDATE app.affaires SET organization_id = v_org_id;
  END IF;

  RAISE NOTICE 'Succès : Philippe Martin et la base sont alignés sur org %', v_org_id;
END $$;