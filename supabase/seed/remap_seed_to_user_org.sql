-- =============================================================================
-- Correctif org : rattacher le seed à l'organization_id de Marie Lefranc
-- =============================================================================
-- Préférer ré-exécuter contacts_workload_demo.sql (ancré sur app.users Marie).
-- Ce script force le réalignement si des lignes seed sont encore sur une autre org.
-- =============================================================================

DO $$
DECLARE
  v_marie RECORD;
BEGIN
  SELECT u.id, u.email, u.organization_id
  INTO v_marie
  FROM app.users u
  WHERE u.active = true
    AND (
      lower(u.email) = lower('m.lefranc@syndicat.fr')
      OR (u.name ILIKE 'Marie Lefranc' AND u.role = 'DGS')
    )
  ORDER BY
    CASE WHEN lower(u.email) = lower('m.lefranc@syndicat.fr') THEN 0 ELSE 1 END,
    u.created_at ASC
  LIMIT 1;

  IF v_marie.id IS NULL OR v_marie.organization_id IS NULL THEN
    RAISE EXCEPTION 'Marie Lefranc introuvable dans app.users (email m.lefranc@syndicat.fr).';
  END IF;

  UPDATE app.energy_assets
  SET organization_id = v_marie.organization_id
  WHERE id::text LIKE 'aaaaaaaa-aaaa-aaaa-aaaa-%'
     OR name IN (
       'Borne IRVE — Place Lamartine',
       'Borne IRVE — Parking République',
       'Armoire EP — Boulevard Georges Clemenceau',
       'Armoire EP — Rue du Refuge',
       'Armoire EP — Arènes d''Arles'
     );

  UPDATE app.contacts
  SET organization_id = v_marie.organization_id
  WHERE lower(email) IN (
    lower(v_marie.email),
    's.bernard@gsi-concept.fr',
    'c.martin@arles.fr',
    'j.roux@gsi-concept.fr',
    'c.rousseau@gsi-concept.fr',
    'm.durand@gsi-concept.fr',
    'l.petit@gsi-concept.fr'
  );

  UPDATE app.tickets_maintenance
  SET organization_id = v_marie.organization_id
  WHERE id::text LIKE 'cccccccc-cccc-cccc-cccc-%'
     OR id = '22222222-2222-2222-2222-222222222201';

  -- Hiérarchie : Marie parente de Sophie + Claire
  UPDATE app.contacts child
  SET parent_contact_id = marie.id
  FROM app.contacts marie
  WHERE lower(marie.email) = lower(v_marie.email)
    AND marie.organization_id = v_marie.organization_id
    AND child.organization_id = v_marie.organization_id
    AND lower(child.email) IN (
      lower('s.bernard@gsi-concept.fr'),
      lower('c.martin@arles.fr')
    );

  DELETE FROM app.contacts
  WHERE lower(email) = lower('p.martin@gsi-concept.fr');

  RAISE NOTICE 'Réaligné sur Marie Lefranc % / org %', v_marie.email, v_marie.organization_id;
END $$;
