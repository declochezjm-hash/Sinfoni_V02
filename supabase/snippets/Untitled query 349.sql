-- 1. Diagnostic : Vérifier l'org_id de l'utilisateur connecté vs la table contacts
SELECT 
  u.id AS user_id, 
  u.email, 
  u.organization_id AS user_org, 
  c.id AS contact_id, 
  c.organization_id AS contact_org
FROM app.users u
LEFT JOIN app.contacts c ON c.id = u.id OR c.email = u.email
WHERE u.email ILIKE '%marie%' OR u.name ILIKE '%marie%';

-- 2. Force l'alignement absolu de TOUTE la base sur l'organization_id réel de Marie Lefranc
DO $$
DECLARE
  v_real_org_id UUID;
  v_marie_id UUID;
BEGIN
  -- Récupère l'org officiel depuis app.users
  SELECT organization_id, id INTO v_real_org_id, v_marie_id 
  FROM app.users 
  WHERE email ILIKE '%marie%' OR name ILIKE '%marie%' 
  LIMIT 1;

  IF v_real_org_id IS NULL THEN
    RAISE EXCEPTION 'Marie Lefranc non trouvée dans app.users';
  END IF;

  -- Met à jour TOUS les contacts de la démo sur cette org
  UPDATE app.contacts SET organization_id = v_real_org_id;
  
  -- S'assure que Marie est en racine dans app.contacts
  UPDATE app.contacts 
  SET parent_contact_id = NULL, role = 'DGS' 
  WHERE id = v_marie_id OR email ILIKE '%marie%';

  -- Met à jour les affaires, actifs et tickets
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'app' AND tablename = 'affaires') THEN
    UPDATE app.affaires SET organization_id = v_real_org_id;
  END IF;
  UPDATE app.energy_assets SET organization_id = v_real_org_id;
  UPDATE app.tickets_maintenance SET organization_id = v_real_org_id;

  RAISE NOTICE 'Base réalignée avec succès sur l org %', v_real_org_id;
END $$;