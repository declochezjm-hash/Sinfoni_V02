-- Planning interactif : créneaux d'intervention & habilitations électriques techniciens

-- ── 1. Habilitations sur les contacts (techniciens) ─────────────────────────

ALTER TABLE app.contacts
  ADD COLUMN IF NOT EXISTS electrical_habilitations TEXT[] NOT NULL DEFAULT '{}';

-- ── 2. Planification sur les tickets maintenance ─────────────────────────────

ALTER TABLE app.tickets_maintenance
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC(4, 2) NOT NULL DEFAULT 2.00
    CHECK (duration_hours > 0 AND duration_hours <= 24),
  ADD COLUMN IF NOT EXISTS required_habilitations TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_scheduled
  ON app.tickets_maintenance (organization_id, scheduled_start)
  WHERE scheduled_start IS NOT NULL;

-- ── 3. Données de démo — habilitations techniciens ──────────────────────────

UPDATE app.contacts
SET electrical_habilitations = ARRAY['B1V', 'B2V', 'BR', 'H1V']
WHERE email = 'm.durand@gsi-concept.fr'
  AND organization_id = '00000000-0000-0000-0000-000000000001';

UPDATE app.contacts
SET electrical_habilitations = ARRAY['B1V', 'B2V', 'BR']
WHERE email = 'c.rousseau@gsi-concept.fr'
  AND organization_id = '00000000-0000-0000-0000-000000000001';

-- Ticket démo IRVE : habilitations IRVE + créneau planifié (semaine courante)
UPDATE app.tickets_maintenance t
SET
  required_habilitations = ARRAY['B1V', 'B2V', 'BR', 'H0B0'],
  scheduled_start = date_trunc('week', now()) + INTERVAL '2 days' + TIME '09:00',
  scheduled_end = date_trunc('week', now()) + INTERVAL '2 days' + TIME '11:00',
  duration_hours = 2.00
WHERE t.id = '22222222-2222-2222-2222-222222222201';

-- ── 4. Vues public ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.contacts AS
  SELECT * FROM app.contacts;

GRANT ALL ON public.contacts TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.tickets_maintenance AS
  SELECT * FROM app.tickets_maintenance;

GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.tickets_maintenance_enriched AS
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
