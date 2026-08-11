-- 1. Exposer / Accorder l'accès au schéma 'app' aux rôles de Supabase
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;

-- 2. Donner les droits de lecture / écriture sur toutes les tables du schéma 'app'
GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

-- 3. Appliquer automatiquement ces droits aux futures tables créées
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;