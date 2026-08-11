DO $$
DECLARE
  v_org_id UUID;
  v_marie_id UUID;
  v_philippe_id UUID;
BEGIN
  -- 1. Récupérer l'organisation principale
  SELECT organization_id, id INTO v_org_id, v_marie_id 
  FROM app.users 
  WHERE email ILIKE '%marie%' OR name ILIKE '%marie%' 
  LIMIT 1;

  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- 2. Garantir la présence de Philippe Martin dans app.users
  INSERT INTO app.users (id, email, name, organization_id, role)
  VALUES (
    'a1b2c3d4-0000-0000-0000-000000000099'::uuid,
    'p.martin@demo-sinfoni.fr',
    'Philippe Martin',
    v_org_id,
    'DST'
  )
  ON CONFLICT (email) DO UPDATE SET
    organization_id = v_org_id,
    role = 'DST'
  RETURNING id INTO v_philippe_id;

  -- 3. Insérer Philippe Martin dans app.contacts sous Marie Lefranc
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
    parent_contact_id = v_marie_id;

  -- 4. Nettoyer et forcer TOUTE la base sur la même organisation
  UPDATE app.users SET organization_id = v_org_id;
  UPDATE app.contacts SET organization_id = v_org_id;
  UPDATE app.energy_assets SET organization_id = v_org_id;
  UPDATE app.tickets_maintenance SET organization_id = v_org_id;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'app' AND tablename = 'affaires') THEN
    UPDATE app.affaires SET organization_id = v_org_id;
  END IF;

END $$;