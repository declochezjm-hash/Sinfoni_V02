-- 1. Récupération des infos de Marie Lefranc et réalignement automatique de l'organisation
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Trouver l'ID utilisateur et l'organisation dans app.users (ou auth.users)
  SELECT id, organization_id INTO v_user_id, v_org_id
  FROM app.users
  WHERE email ILIKE '%marie%lefranc%' OR name ILIKE '%marie%lefranc%'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    SELECT id, (raw_user_meta_data->>'organization_id')::uuid INTO v_user_id, v_org_id
    FROM auth.users
    WHERE email ILIKE '%marie%lefranc%'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Utilisateur trouvé: ID %, Org %', v_user_id, v_org_id;

  IF v_org_id IS NOT NULL THEN
    -- Attribuer la même organisation à toutes les données du seed
    UPDATE app.energy_assets 
    SET organization_id = v_org_id 
    WHERE id::text LIKE 'aaaaaaaa-%';

    UPDATE app.tickets_maintenance 
    SET organization_id = v_org_id 
    WHERE id::text LIKE 'cccccccc-%';

    UPDATE app.contacts 
    SET organization_id = v_org_id 
    WHERE email IN ('p.martin@demo-sinfoni.fr', 'c.martin@demo-sinfoni.fr', 's.bernard@demo-sinfoni.fr', 'm.durand@demo-sinfoni.fr', 'j.roux@demo-sinfoni.fr', 'c.rousseau@demo-sinfoni.fr', 'l.petit@demo-sinfoni.fr');

    -- S'assurer que le rôle de Marie autorise la lecture
    UPDATE app.users 
    SET role = 'DST', active = true 
    WHERE id = v_user_id;
  END IF;
END $$;

-- 2. Vérification rapide du résultat
SELECT 
  (SELECT count(*) FROM app.tickets_maintenance WHERE organization_id = (SELECT organization_id FROM app.users WHERE name ILIKE '%marie%lefranc%' LIMIT 1)) as tickets_visibles_marie,
  (SELECT count(*) FROM app.contacts WHERE organization_id = (SELECT organization_id FROM app.users WHERE name ILIKE '%marie%lefranc%' LIMIT 1)) as contacts_visibles_marie;