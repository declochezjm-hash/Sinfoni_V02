-- =============================================================================
-- Richard — sessions de chat isolées (sessionId) + persistance des messages
-- Tables : app.richard_sessions, app.richard_messages
-- Vues API : public.richard_sessions, public.richard_messages, public.jarvis_messages
-- =============================================================================

-- ── 1. Sessions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.richard_sessions (
  id                UUID PRIMARY KEY,
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  user_id           UUID,
  title             TEXT NOT NULL DEFAULT 'Nouveau chat',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_richard_sessions_org_user
  ON app.richard_sessions (organization_id, user_id, updated_at DESC);

CREATE TRIGGER tr_richard_sessions_set_organization
  BEFORE INSERT ON app.richard_sessions
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

CREATE TRIGGER tr_richard_sessions_updated_at
  BEFORE UPDATE ON app.richard_sessions
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- ── 2. Messages (payload UIMessage JSON) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS app.richard_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES administration.organization(id) ON DELETE CASCADE,
  user_id           UUID,
  session_id        UUID NOT NULL REFERENCES app.richard_sessions(id) ON DELETE CASCADE,
  message_id        TEXT NOT NULL,
  role              TEXT NOT NULL,
  payload           JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_richard_messages_session
  ON app.richard_messages (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_richard_messages_org_user
  ON app.richard_messages (organization_id, user_id, created_at DESC);

CREATE TRIGGER tr_richard_messages_set_organization
  BEFORE INSERT ON app.richard_messages
  FOR EACH ROW EXECUTE FUNCTION app.set_sinfoni_organization_id();

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE app.richard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.richard_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS richard_sessions_org ON app.richard_sessions;
CREATE POLICY richard_sessions_org ON app.richard_sessions
  FOR ALL
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

DROP POLICY IF EXISTS richard_messages_org ON app.richard_messages;
CREATE POLICY richard_messages_org ON app.richard_messages
  FOR ALL
  USING (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  )
  WITH CHECK (
    administration.current_organization_id() IS NULL
    OR organization_id = administration.current_organization_id()
  );

-- ── 4. Vues API public ───────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.richard_sessions
WITH (security_invoker = true)
AS
  SELECT * FROM app.richard_sessions;

CREATE OR REPLACE VIEW public.richard_messages
WITH (security_invoker = true)
AS
  SELECT * FROM app.richard_messages;

-- Alias historique / compatibilité (Jarvis)
CREATE OR REPLACE VIEW public.jarvis_messages
WITH (security_invoker = true)
AS
  SELECT * FROM app.richard_messages;

GRANT ALL ON app.richard_sessions TO anon, authenticated, service_role;
GRANT ALL ON app.richard_messages TO anon, authenticated, service_role;
GRANT ALL ON public.richard_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.richard_messages TO anon, authenticated, service_role;
GRANT ALL ON public.jarvis_messages TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
