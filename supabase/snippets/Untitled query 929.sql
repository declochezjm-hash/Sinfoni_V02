-- 1. On s'assure que les colonnes existent bien dans le schéma public
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. On nettoie la contrainte de statut au cas où elle bloquerait
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('Brouillon', 'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé', 'À planifier'));

-- 3. ON FORCE LE RECHARGEMENT TOTAL DE L'API
NOTIFY pgrst, 'reload schema';