-- Correctif : vue tickets_maintenance_enriched sans colonnes de planification
-- (cas où 20260704260000 n'a pas été appliquée ou vue recréée sans scheduled_*)

-- ── 1. Colonnes planning (idempotent) ───────────────────────────────────────

ALTER TABLE app.contacts
  ADD COLUMN IF NOT EXISTS electrical_habilitations TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE app.tickets_maintenance
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4, 2) NOT NULL DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS required_habilitations TEXT[] NOT NULL DEFAULT '{}';

-- Contrainte duration_hours (ignore si déjà présente)
DO $$
BEGIN
  ALTER TABLE app.tickets_maintenance
    ADD CONSTRAINT tickets_maintenance_duration_hours_check
    CHECK (duration_hours > 0 AND duration_hours <= 24);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_scheduled
  ON app.tickets_maintenance (organization_id, scheduled_start)
  WHERE scheduled_start IS NOT NULL;

-- ── 2. Vues public — liste explicite des colonnes planning ────────────────────

CREATE OR REPLACE VIEW public.contacts AS
  SELECT * FROM app.contacts;

GRANT ALL ON public.contacts TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.tickets_maintenance AS
  SELECT * FROM app.tickets_maintenance;

GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.tickets_maintenance_enriched;

CREATE VIEW public.tickets_maintenance_enriched AS
SELECT
  t.id,
  t.organization_id,
  t.created_at,
  t.updated_at,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.asset_id,
  t.commune_insee_code,
  t.created_by,
  t.assigned_to_provider_id,
  t.assigned_contact_id,
  t.scheduled_start,
  t.scheduled_end,
  t.duration_hours,
  t.required_habilitations,
  c.first_name AS assigned_contact_first_name,
  c.last_name AS assigned_contact_last_name,
  c.email AS assigned_contact_email,
  c.phone AS assigned_contact_phone,
  c.role AS assigned_contact_role,
  c.department AS assigned_contact_department,
  c.electrical_habilitations AS assigned_contact_habilitations
FROM app.tickets_maintenance t
LEFT JOIN app.contacts c ON c.id = t.assigned_contact_id;

GRANT SELECT ON public.tickets_maintenance_enriched TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
