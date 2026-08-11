-- Bucket Supabase Storage pour la galerie photos terrain
-- À exécuter dans le SQL Editor APRÈS la migration project_photos

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politique dev : accès total au bucket project-photos
-- (adapter en production selon vos règles RLS)
DROP POLICY IF EXISTS "Accès total dev project-photos" ON storage.objects;

CREATE POLICY "Accès total dev project-photos" ON storage.objects
  FOR ALL
  USING (bucket_id = 'project-photos')
  WITH CHECK (bucket_id = 'project-photos');
