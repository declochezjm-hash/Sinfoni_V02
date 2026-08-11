-- Lien tickets maintenance ↔ annuaire contacts (responsable assigné)

ALTER TABLE app.tickets_maintenance
  ADD COLUMN IF NOT EXISTS assigned_contact_id UUID NULL
    REFERENCES app.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_assigned_contact
  ON app.tickets_maintenance (assigned_contact_id)
  WHERE assigned_contact_id IS NOT NULL;

-- Contact démo : Camille Rousseau
INSERT INTO app.contacts (
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  department,
  parent_contact_id
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Camille',
  'Rousseau',
  'c.rousseau@gsi-concept.fr',
  '04 90 00 10 15',
  'Chargé d''affaires',
  'Éclairage public',
  c.id
FROM app.contacts c
WHERE c.email = 's.bernard@gsi-concept.fr'
  AND c.organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Assigner le ticket démo IRVE à Camille Rousseau
UPDATE app.tickets_maintenance t
SET assigned_contact_id = c.id
FROM app.contacts c
WHERE c.email = 'c.rousseau@gsi-concept.fr'
  AND c.organization_id = t.organization_id
  AND t.id = '22222222-2222-2222-2222-222222222201';

-- Rafraîchir la vue publique (SELECT * ne propage pas les nouvelles colonnes automatiquement)
CREATE OR REPLACE VIEW public.tickets_maintenance AS
  SELECT * FROM app.tickets_maintenance;

GRANT ALL ON public.tickets_maintenance TO anon, authenticated, service_role;

-- Vue enrichie (lecture) avec jointure contacts
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
  c.first_name AS assigned_contact_first_name,
  c.last_name AS assigned_contact_last_name,
  c.email AS assigned_contact_email,
  c.phone AS assigned_contact_phone,
  c.role AS assigned_contact_role,
  c.department AS assigned_contact_department
FROM app.tickets_maintenance t
LEFT JOIN app.contacts c ON c.id = t.assigned_contact_id;

GRANT SELECT ON public.tickets_maintenance_enriched TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
