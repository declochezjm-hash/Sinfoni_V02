-- Chiffrage & facturation sur app.projects
ALTER TABLE app.projects
  ADD COLUMN IF NOT EXISTS quote_status TEXT NOT NULL DEFAULT 'Brouillon',
  ADD COLUMN IF NOT EXISTS quote_amount_ht INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'À émettre',
  ADD COLUMN IF NOT EXISTS invoice_deposit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_balance BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_quote_status_check;
ALTER TABLE app.projects ADD CONSTRAINT projects_quote_status_check
  CHECK (quote_status IN ('Brouillon', 'Envoyé au client', 'Accepté', 'Refusé'));

ALTER TABLE app.projects DROP CONSTRAINT IF EXISTS projects_billing_status_check;
ALTER TABLE app.projects ADD CONSTRAINT projects_billing_status_check
  CHECK (billing_status IN ('À émettre', 'Acompte émis', 'Facturé total', 'Payé'));

CREATE OR REPLACE VIEW public.projects AS
  SELECT * FROM app.projects;

NOTIFY pgrst, 'reload schema';
