-- 1. On s'assure que l'organisation par défaut existe
INSERT INTO administration.organization (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sinfoni Enterprise Local')
ON CONFLICT (id) DO NOTHING;

-- 2. On lie des utilisateurs de test à cette organisation
INSERT INTO app.users (id, organization_id, name, email, role, created_at)
VALUES 
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '00000000-0000-0000-0000-000000000001', 'Admin Local', 'admin@default.local', 'admin', NOW()),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', '00000000-0000-0000-0000-000000000001', 'Jean Développeur', 'jean@sinfoni.local', 'user', NOW())
ON CONFLICT DO NOTHING;

-- 3. On crée des projets de test pour Sinfoni
INSERT INTO app.projects (id, organization_id, name, status, description, created_at)
VALUES 
  ('p1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Affaire - Rénovation Centre Ville', 'active', 'Projet de déploiement réseau et infrastructure.', NOW()),
  ('p2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Affaire - Zone Industrielle Nord', 'pending', 'Audit de raccordement fibre optique.', NOW())
ON CONFLICT DO NOTHING;

-- 4. On ajoute les widgets de statistiques du Tableau de bord
INSERT INTO app.dashboard_widgets (organization_id, user_id, widget_key, title, config, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', 'stats_overview', 'Vue d''ensemble', '{"total_projects": 2, "active_tasks": 5}', NOW())
ON CONFLICT DO NOTHING;