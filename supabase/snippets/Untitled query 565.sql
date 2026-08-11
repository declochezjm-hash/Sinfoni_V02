INSERT INTO app.users (id, organization_id, name, email, role, created_at)
VALUES 
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1', '00000000-0000-0000-0000-000000000001', 'Admin Local', 'admin@default.local', 'METTRE_LE_BON_MOT_ICI', NOW())
ON CONFLICT DO NOTHING;