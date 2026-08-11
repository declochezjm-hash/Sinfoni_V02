-- ============================================================
-- 1. MISE À JOUR DES STATUTS (Fonctionnalité 3 : Workflow CEE)
-- ============================================================

-- On élargit la contrainte des statuts sur les projets pour accepter 'En Étude', 'Proposé' et 'Validé'
ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE app.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('Brouillon', 'En Étude', 'Proposé', 'Validé', 'En cours', 'PV/Réception', 'Clôturé'));

-- ============================================================
-- 2. PLANIFICATION PLURIANNUELLE (Fonctionnalité 4 : PPI)
-- ============================================================

-- Ajout du champ pour l'année de programmation des travaux (ex: 2026, 2027...)
ALTER TABLE app.projects ADD COLUMN IF NOT EXISTS ppi_year INTEGER;

-- Index pour accélérer les calculs du tableau de bord PPI
CREATE INDEX IF NOT EXISTS idx_projects_ppi_year ON app.projects (ppi_year)
  WHERE ppi_year IS NOT NULL;

-- On recharge le schéma pour que Supabase (PostgREST) prenne instantanément les changements en compte
NOTIFY pgrst, 'reload schema';