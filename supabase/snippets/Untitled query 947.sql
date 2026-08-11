-- 1. Création du bucket de stockage pour la GED si non existant
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permettre à tout le monde (en dev) de lire et d'uploader dans ce bucket
CREATE POLICY "Accès total dev sur le stockage" ON storage.objects 
    FOR ALL 
    USING (bucket_id = 'documents')
    WITH CHECK (bucket_id = 'documents');