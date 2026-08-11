-- Réactivation de la sécurité sur les tables clés
ALTER TABLE app.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users ENABLE ROW SECURITY;

-- Création d' la politique : un utilisateur ne voit que les projets de son organisation
CREATE POLICY project_isolation_policy ON app.projects
    FOR ALL
    USING (organization_id = (auth.jwt() -> 'app_metadata' ->> 'organization_id')::uuid);