-- 1. Réactiver RLS et créer des politiques de lecture/écriture permissives
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tickets_maintenance ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes politiques
DROP POLICY IF EXISTS "Allow all users" ON app.users;
DROP POLICY IF EXISTS "Allow all contacts" ON app.contacts;
DROP POLICY IF EXISTS "Allow all projects" ON app.projects;
DROP POLICY IF EXISTS "Allow all tickets" ON app.tickets_maintenance;

-- Politiques ouvertes pour l'environnement de démo (rôle authenticated + anon)
CREATE POLICY "Allow all users" ON app.users FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all contacts" ON app.contacts FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all projects" ON app.projects FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all tickets" ON app.tickets_maintenance FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 2. Recréer les vues publiques (intermédiaires PostgREST)
CREATE OR REPLACE VIEW public.users AS SELECT * FROM app.users;
CREATE OR REPLACE VIEW public.contacts AS SELECT * FROM app.contacts;
CREATE OR REPLACE VIEW public.projects AS SELECT * FROM app.projects;
CREATE OR REPLACE VIEW public.tickets_maintenance AS SELECT * FROM app.tickets_maintenance;

-- 3. Accorder les droits de requête sur le schéma public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 4. Notifier le relancement de la cache d'API
NOTIFY pgrst, 'reload schema';