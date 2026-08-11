-- ⚠️ Script corrigé : la colonne s'appelle `role` (pas `role_title`).
-- Préférer : supabase/seed/fix_marie_lefranc_apex.sql
-- ou : supabase/seed/contacts_workload_demo.sql

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_marie_contact_id UUID;
  v_email TEXT;
BEGIN
  SELECT id, organization_id, email INTO v_user_id, v_org_id, v_email
  FROM app.users
  WHERE active = true
    AND (
      lower(email) = lower('m.lefranc@syndicat.fr')
      OR (name ILIKE 'Marie Lefranc' AND role = 'DGS')
    )
  ORDER BY
    CASE WHEN lower(email) = lower('m.lefranc@syndicat.fr') THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur Marie Lefranc introuvable dans app.users';
  END IF;

  SELECT id INTO v_marie_contact_id
  FROM app.contacts
  WHERE lower(email) = lower(v_email)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_marie_contact_id IS NULL THEN
    INSERT INTO app.contacts (
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      department,
      parent_contact_id
    )
    VALUES (
      v_org_id,
      'Marie',
      'Lefranc',
      v_email,
      '04 90 00 10 01',
      'DGS',
      'Direction Générale',
      NULL
    )
    RETURNING id INTO v_marie_contact_id;
  ELSE
    UPDATE app.contacts SET
      organization_id = v_org_id,
      first_name = 'Marie',
      last_name = 'Lefranc',
      email = v_email,
      role = 'DGS',
      department = 'Direction Générale',
      parent_contact_id = NULL
    WHERE id = v_marie_contact_id;
  END IF;

  UPDATE app.contacts
  SET parent_contact_id = v_marie_contact_id,
      organization_id = v_org_id
  WHERE lower(email) IN (
    lower('s.bernard@gsi-concept.fr'),
    lower('c.martin@arles.fr')
  );

  UPDATE app.contacts
  SET organization_id = v_org_id
  WHERE lower(email) IN (
    lower('j.roux@gsi-concept.fr'),
    lower('c.rousseau@gsi-concept.fr'),
    lower('m.durand@gsi-concept.fr'),
    lower('l.petit@gsi-concept.fr')
  );

  UPDATE app.energy_assets
  SET organization_id = v_org_id
  WHERE id::text LIKE 'aaaaaaaa-%';

  UPDATE app.tickets_maintenance
  SET organization_id = v_org_id
  WHERE id::text LIKE 'cccccccc-%'
     OR id = '22222222-2222-2222-2222-222222222201';

  DELETE FROM app.contacts WHERE lower(email) = lower('p.martin@gsi-concept.fr');

  RAISE NOTICE 'Succès : Marie Lefranc contact=% org=% (colonne role)', v_marie_contact_id, v_org_id;
END $$;
