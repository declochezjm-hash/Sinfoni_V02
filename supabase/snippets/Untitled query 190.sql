-- 1. Droits d'usage sur le schéma sous-jacent 'app'
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

-- 2. Recréation / Vérification des vues exposées dans 'public'
CREATE OR REPLACE VIEW public.users AS 
  SELECT * FROM app.users;

CREATE OR REPLACE VIEW public.contacts AS 
  SELECT * FROM app.contacts;

CREATE OR REPLACE VIEW public.energy_assets AS 
  SELECT * FROM app.energy_assets;

CREATE OR REPLACE VIEW public.tickets_maintenance AS 
  SELECT * FROM app.tickets_maintenance;

-- 3. Droits sur le schéma 'public'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Rechargement du cache du schéma PostgREST
NOTIFY pgrst, 'reload schema';