-- =============================================================================
-- Diagnostic : pourquoi les tickets / chantiers n'apparaissent pas ?
-- =============================================================================
-- Exécuter dans le SQL Editor Supabase (rôle postgres / service_role).
-- Remplacer :EMAIL_TEST: par l'email de l'utilisateur Auth connecté.
-- =============================================================================

-- 1) Organisation démo seed vs organisations présentes
SELECT id, name, created_at
FROM administration.organization
ORDER BY created_at;

-- 2) Profil app.users correspondant à l'email Auth (ADAPTER l'email)
SELECT
  id,
  email,
  role,
  active,
  organization_id,
  commune_insee_code,
  organization_id = '00000000-0000-0000-0000-000000000001' AS matches_seed_org
FROM app.users
WHERE lower(email) = lower('REMPLACER_PAR_EMAIL_AUTH')  -- ← à adapter
   OR organization_id = '00000000-0000-0000-0000-000000000001'
ORDER BY email;

-- 3) Compteurs seed (org démo)
SELECT
  (SELECT COUNT(*) FROM app.tickets_maintenance
    WHERE organization_id = '00000000-0000-0000-0000-000000000001') AS tickets_seed_org,
  (SELECT COUNT(*) FROM app.tickets_maintenance
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'
      AND status IN ('open', 'in_progress')) AS tickets_actifs,
  (SELECT COUNT(*) FROM app.contacts
    WHERE organization_id = '00000000-0000-0000-0000-000000000001') AS contacts,
  (SELECT COUNT(*) FROM app.energy_assets
    WHERE organization_id = '00000000-0000-0000-0000-000000000001') AS assets,
  (SELECT COUNT(*) FROM app.projects
    WHERE organization_id = '00000000-0000-0000-0000-000000000001') AS projets_chantiers;

-- 4) Simulation rôle / org pour un email (comme la RLS après le fix)
SELECT
  u.email,
  u.role AS role_app_users,
  u.organization_id,
  u.role IN ('DGS', 'DST', 'Chargé d''Affaires') AS would_be_syndicat_staff
FROM app.users u
WHERE lower(u.email) = lower('REMPLACER_PAR_EMAIL_AUTH');

-- 5) Les tickets que le frontend devrait voir pour l'org du profil
SELECT t.id, t.title, t.status, t.priority, t.commune_insee_code, t.assigned_contact_id
FROM app.tickets_maintenance t
WHERE t.organization_id = (
  SELECT organization_id FROM app.users
  WHERE lower(email) = lower('REMPLACER_PAR_EMAIL_AUTH')
  LIMIT 1
)
ORDER BY t.updated_at DESC
LIMIT 20;
