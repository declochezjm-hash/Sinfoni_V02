-- =============================================================================
-- Fix : Marie Lefranc (DGS) au sommet + réalignement organization_id
-- =============================================================================
-- Schéma app.contacts (migration 20260704210000) :
--   id, organization_id, first_name, last_name, email, phone,
--   role, department, parent_contact_id, avatar_url, created_at, updated_at
--   → PAS de colonne role_title (erreur 42703)
--   → PAS de UNIQUE(email) : pas de ON CONFLICT (email)
-- =============================================================================

DO $$
DECLARE
  v_marie_user   RECORD;
  v_marie_id     UUID;
  v_org_id       UUID;
  v_email        TEXT;
  v_first        TEXT;
  v_last         TEXT;
BEGIN
  -- 1. Profil Auth / app.users Marie Lefranc
  SELECT u.id, u.email, u.name, u.organization_id, u.role
  INTO v_marie_user
  FROM app.users u
  WHERE u.active = true
    AND (
      lower(u.email) = lower('m.lefranc@syndicat.fr')
      OR (u.name ILIKE 'Marie Lefranc' AND u.role = 'DGS')
      OR (u.name ILIKE '%marie%lefranc%' AND u.role = 'DGS')
    )
  ORDER BY
    CASE WHEN lower(u.email) = lower('m.lefranc@syndicat.fr') THEN 0 ELSE 1 END,
    u.created_at ASC
  LIMIT 1;

  IF v_marie_user.id IS NULL THEN
    RAISE EXCEPTION
      'Marie Lefranc introuvable dans app.users (attendu: m.lefranc@syndicat.fr, rôle DGS).';
  END IF;

  IF v_marie_user.organization_id IS NULL THEN
    RAISE EXCEPTION 'Marie Lefranc (%) sans organization_id', v_marie_user.email;
  END IF;

  v_org_id := v_marie_user.organization_id;
  v_email := v_marie_user.email;
  v_first := split_part(COALESCE(NULLIF(trim(v_marie_user.name), ''), 'Marie Lefranc'), ' ', 1);
  v_last := NULLIF(trim(substr(
    COALESCE(NULLIF(trim(v_marie_user.name), ''), 'Marie Lefranc'),
    length(v_first) + 1
  )), '');
  IF v_last IS NULL THEN
    v_first := 'Marie';
    v_last := 'Lefranc';
  END IF;

  -- 2. Retirer Philippe Martin (ancien sommet démo)
  UPDATE app.contacts child
  SET parent_contact_id = NULL
  WHERE parent_contact_id IN (
    SELECT id FROM app.contacts
    WHERE lower(email) = lower('p.martin@gsi-concept.fr')
  );

  DELETE FROM app.contacts
  WHERE lower(email) = lower('p.martin@gsi-concept.fr');

  -- 3. Upsert Marie Lefranc dans app.contacts (colonne = role, pas role_title)
  SELECT id INTO v_marie_id
  FROM app.contacts
  WHERE organization_id = v_org_id
    AND lower(email) = lower(v_email)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_marie_id IS NULL THEN
    -- Aussi chercher par email sans filtre org (réalignement)
    SELECT id INTO v_marie_id
    FROM app.contacts
    WHERE lower(email) = lower(v_email)
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_marie_id IS NULL THEN
    INSERT INTO app.contacts (
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      role,
      department,
      parent_contact_id
    ) VALUES (
      v_org_id,
      v_first,
      v_last,
      v_email,
      '04 90 00 10 01',
      'DGS',
      'Direction Générale',
      NULL
    )
    RETURNING id INTO v_marie_id;
  ELSE
    UPDATE app.contacts SET
      organization_id = v_org_id,
      first_name = v_first,
      last_name = v_last,
      email = v_email,
      phone = COALESCE(NULLIF(phone, ''), '04 90 00 10 01'),
      role = 'DGS',
      department = 'Direction Générale',
      parent_contact_id = NULL
    WHERE id = v_marie_id;
  END IF;

  -- 4. Sophie Bernard + Claire Martin → enfants directs de Marie
  UPDATE app.contacts SET
    parent_contact_id = v_marie_id,
    organization_id = v_org_id
  WHERE lower(email) IN (
    lower('s.bernard@gsi-concept.fr'),
    lower('c.martin@arles.fr')
  );

  -- 5. Reste de l'arborescence seed → org Marie
  UPDATE app.contacts SET
    organization_id = v_org_id
  WHERE lower(email) IN (
    lower(v_email),
    lower('s.bernard@gsi-concept.fr'),
    lower('c.martin@arles.fr'),
    lower('j.roux@gsi-concept.fr'),
    lower('c.rousseau@gsi-concept.fr'),
    lower('m.durand@gsi-concept.fr'),
    lower('l.petit@gsi-concept.fr')
  );

  -- Équipe technique sous Sophie (si Sophie existe)
  UPDATE app.contacts child
  SET parent_contact_id = sophie.id,
      organization_id = v_org_id
  FROM app.contacts sophie
  WHERE lower(sophie.email) = lower('s.bernard@gsi-concept.fr')
    AND sophie.organization_id = v_org_id
    AND lower(child.email) IN (
      lower('j.roux@gsi-concept.fr'),
      lower('c.rousseau@gsi-concept.fr'),
      lower('m.durand@gsi-concept.fr'),
      lower('l.petit@gsi-concept.fr')
    );

  -- 6. Actifs + tickets seed → org Marie
  UPDATE app.energy_assets
  SET organization_id = v_org_id
  WHERE id::text LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-%'
     OR name IN (
       'Borne IRVE — Place Lamartine',
       'Borne IRVE — Parking République',
       'Armoire EP — Boulevard Georges Clemenceau',
       'Armoire EP — Rue du Refuge',
       'Armoire EP — Arènes d''Arles'
     );

  UPDATE app.tickets_maintenance
  SET organization_id = v_org_id
  WHERE id::text LIKE 'cccccccc-cccc-cccc-cccc-%'
     OR id = '22222222-2222-2222-2222-222222222201';

  RAISE NOTICE
    'OK — Marie Lefranc contact_id=% email=% org=% (colonne role=DGS)',
    v_marie_id, v_email, v_org_id;
END $$;

-- Vérification rapide
SELECT
  c.first_name,
  c.last_name,
  c.email,
  c.role,
  c.department,
  c.organization_id,
  c.parent_contact_id,
  p.email AS parent_email
FROM app.contacts c
LEFT JOIN app.contacts p ON p.id = c.parent_contact_id
WHERE lower(c.email) IN (
  lower('m.lefranc@syndicat.fr'),
  lower('s.bernard@gsi-concept.fr'),
  lower('c.martin@arles.fr'),
  lower('j.roux@gsi-concept.fr'),
  lower('c.rousseau@gsi-concept.fr'),
  lower('m.durand@gsi-concept.fr'),
  lower('l.petit@gsi-concept.fr')
)
   OR c.email IN (SELECT email FROM app.users WHERE name ILIKE 'Marie Lefranc')
ORDER BY
  CASE WHEN c.parent_contact_id IS NULL THEN 0 ELSE 1 END,
  c.last_name;
