-- 1. On nettoie les contraintes de validation pour être tranquille
ALTER TABLE app.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_type_check;

-- 2. Insertion de l'Organisation
INSERT INTO administration.organization (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sinfoni Enterprise Local')
ON CONFLICT (id) DO NOTHING;

-- 3. Insertion des Utilisateurs
INSERT INTO app.users (id, organization_id, name, email, role, created_at)
VALUES 
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '00000000-0000-0000-0000-000000000001', 'Admin Local', 'admin@default.local', 'admin', NOW()),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '00000000-0000-0000-0000-000000000001', 'Jean Développeur', 'jean@sinfoni.local', 'user', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Insertion des Projets (Les Affaires)
INSERT INTO app.projects (id, organization_id, reference, title, description, type, status, created_at)
VALUES 
  ('01111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'AFF-2026-001', 'Affaire - Rénovation Centre Ville', 'Projet de déploiement réseau et infrastructure.', 'infrastructure', 'active', NOW()),
  ('02222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'AFF-2026-002', 'Affaire - Zone Industrielle Nord', 'Audit de raccordement fibre optique.', 'audit', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;