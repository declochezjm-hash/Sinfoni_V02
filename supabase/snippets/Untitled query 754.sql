-- 1. Donner les droits au rôle API (PostgREST) sur le schéma sous-jacent 'app'
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;

-- 2. Assurer les droits sur le schéma 'public' et ses vues
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Sécurité RLS sur les vues : s'assurer que PostgREST peut lire à travers
ALTER VIEW public.users OWNER TO postgres;
ALTER VIEW public.contacts OWNER TO postgres;
ALTER VIEW public.energy_assets OWNER TO postgres;
ALTER VIEW public.tickets_maintenance OWNER TO postgres;

-- 4. FORCER le rechargement du cache du schéma par PostgREST
NOTIFY pgrst, 'reload schema';