CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id UUID := 'a1b2c3d4-0000-0000-0000-000000000001'::uuid;
  v_org_id UUID;
  v_email TEXT := 'm.lefranc@syndicat.fr';
  v_password TEXT := 'password123';
BEGIN
  -- 1. Récupérer l'org_id existant dans app.users si disponible
  SELECT organization_id INTO v_org_id FROM app.users WHERE email ILIKE '%marie%' LIMIT 1;
  IF v_org_id IS NULL THEN
    v_org_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- 2. Créer ou mettre à jour l'utilisateur dans auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_email,
    crypt(v_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('name', 'Marie Lefranc', 'organization_id', v_org_id, 'role', 'DGS'),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    email_confirmed_at = NOW();

  -- 3. Synchroniser app.users et app.contacts sur cet ID exact
  INSERT INTO app.users (id, email, name, organization_id, role)
  VALUES (v_user_id, v_email, 'Marie Lefranc', v_org_id, 'DGS')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, organization_id = v_org_id;

  INSERT INTO app.contacts (id, organization_id, first_name, last_name, email, role)
  VALUES (v_user_id, v_org_id, 'Marie', 'Lefranc', v_email, 'DGS')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, organization_id = v_org_id;

  RAISE NOTICE 'Utilisateur % paré à la connexion !', v_email;
END $$;