BEGIN;

-- 1. Donner explicitement tous les droits sur les tables du schéma app
GRANT ALL ON ALL TABLES IN SCHEMA app TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO authenticated;

-- 2. Désactiver temporairement RLS sur les tables bloquantes
ALTER TABLE app.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.tickets_maintenance DISABLE ROW LEVEL SECURITY;

-- 3. Reconstruire les vues publiques sans blocage
CREATE OR REPLACE VIEW public.contacts AS SELECT * FROM app.contacts;
CREATE OR REPLACE VIEW public.projects AS SELECT * FROM app.projects;
CREATE OR REPLACE VIEW public.tickets_maintenance AS SELECT * FROM app.tickets_maintenance;

-- 4. Accorder les permissions sur les vues API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets_maintenance TO authenticated;

COMMIT;

-- 5. Force la mise à jour immédiate du cache PostgREST
NOTIFY pgrst, 'reload schema';