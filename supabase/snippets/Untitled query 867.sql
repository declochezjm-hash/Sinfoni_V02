ALTER TABLE app.tickets_maintenance 
ADD COLUMN IF NOT EXISTS assigned_contact_id UUID REFERENCES app.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_assigned_contact 
ON app.tickets_maintenance(assigned_contact_id);