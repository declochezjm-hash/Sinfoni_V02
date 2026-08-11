-- Annuaire des interlocuteurs & organigramme

CREATE TABLE IF NOT EXISTS app.contacts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  role                TEXT NOT NULL DEFAULT '',
  department          TEXT NOT NULL DEFAULT '',
  parent_contact_id   UUID NULL REFERENCES app.contacts(id) ON DELETE SET NULL,
  avatar_url          TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contacts_no_self_parent CHECK (parent_contact_id IS NULL OR parent_contact_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_organization ON app.contacts (organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_parent ON app.contacts (parent_contact_id);

CREATE TRIGGER tr_contacts_set_organization
  BEFORE INSERT ON app.contacts
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_contacts_updated_at
  BEFORE UPDATE ON app.contacts
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE app.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_org ON app.contacts;

CREATE POLICY contacts_org ON app.contacts
  FOR ALL
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

CREATE OR REPLACE VIEW public.contacts AS
  SELECT * FROM app.contacts;

GRANT ALL ON public.contacts TO anon, authenticated, service_role;

-- Données de démo — organigramme syndicat
INSERT INTO app.contacts (
  organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Philippe', 'Martin', 'p.martin@gsi-concept.fr', '04 90 00 10 01',
    'DGS', 'Direction Générale', NULL
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Sophie', 'Bernard', 's.bernard@gsi-concept.fr', '04 90 00 10 02',
    'DST', 'Services Techniques', NULL
  )
ON CONFLICT DO NOTHING;

INSERT INTO app.contacts (
  organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Julien', 'Roux', 'j.roux@gsi-concept.fr', '04 90 00 10 10',
  'Chargé d''affaires', 'Services Techniques', c.id
FROM app.contacts c
WHERE c.email = 's.bernard@gsi-concept.fr'
  AND c.organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO app.contacts (
  organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Marc', 'Durand', 'm.durand@gsi-concept.fr', '04 90 00 10 11',
  'Technicien', 'Voirie', c.id
FROM app.contacts c
WHERE c.email = 's.bernard@gsi-concept.fr'
  AND c.organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO app.contacts (
  organization_id, first_name, last_name, email, phone, role, department, parent_contact_id
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'Claire', 'Martin', 'c.martin@arles.fr', '04 90 00 20 01',
  'Élu', 'Syndicat', c.id
FROM app.contacts c
WHERE c.email = 'p.martin@gsi-concept.fr'
  AND c.organization_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
