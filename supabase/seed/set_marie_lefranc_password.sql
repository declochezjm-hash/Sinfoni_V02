-- =============================================================================
-- Force le mot de passe Auth de Marie Lefranc → password123
-- =============================================================================
-- IMPORTANT : ne jamais laisser les colonnes token à NULL (sinon Auth renvoie
-- "Database error querying schema"). Toujours COALESCE(..., '').
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

UPDATE auth.users
SET
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  updated_at = now()
WHERE lower(email) = lower('m.lefranc@syndicat.fr')
   OR (email ILIKE '%marie%' AND email ILIKE '%lefranc%');

SELECT
  id,
  email,
  email_confirmed_at IS NOT NULL AS email_confirmed,
  encrypted_password IS NOT NULL AS has_password,
  confirmation_token IS NULL AS bad_confirmation_token_null,
  updated_at
FROM auth.users
WHERE lower(email) = lower('m.lefranc@syndicat.fr')
   OR (email ILIKE '%marie%' AND email ILIKE '%lefranc%');
