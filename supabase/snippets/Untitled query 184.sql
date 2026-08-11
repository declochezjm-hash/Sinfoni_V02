-- 1. Désactiver temporairement RLS sur les tables de travail pour valider l'affichage
ALTER TABLE app.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.tickets_maintenance DISABLE ROW LEVEL SECURITY;

-- 2. Créer une politique permissive pour les utilisateurs authentifiés (si RLS reste active)
DROP POLICY IF EXISTS "Allow authenticated read projects" ON app.projects;
CREATE POLICY "Allow authenticated read projects" ON app.projects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read tickets" ON app.tickets_maintenance;
CREATE POLICY "Allow authenticated read tickets" ON app.tickets_maintenance FOR SELECT TO authenticated USING (true);

-- 3. S'assurer que les vues de l'API publique sont bien configurées
CREATE OR REPLACE VIEW public.projects AS SELECT * FROM app.projects;
CREATE OR REPLACE VIEW public.tickets_maintenance AS SELECT * FROM app.tickets_maintenance;

GRANT SELECT ON public.projects TO authenticated, anon;
GRANT SELECT ON public.tickets_maintenance TO authenticated, anon;

NOTIFY pgrst, 'reload schema';