-- =============================================================================
-- FIX Auth : "Database error querying schema" (500)
-- =============================================================================
-- Cause : UPDATE/INSERT manuel sur auth.users avec tokens NULL.
-- GoTrue attend des chaînes vides '', pas NULL.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  col TEXT;
  cols TEXT[] := ARRAY[
    'confirmation_token',
    'recovery_token',
    'email_change_token_new',
    'email_change',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ];
BEGIN
  FOREACH col IN ARRAY cols
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND column_name = col
    ) THEN
      EXECUTE format(
        'UPDATE auth.users SET %I = COALESCE(%I, '''') WHERE %I IS NULL',
        col, col, col
      );
    END IF;
  END LOOP;
END $$;

-- Mot de passe Marie Lefranc → password123 (+ tokens non NULL)
UPDATE auth.users
SET
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE lower(email) = lower('m.lefranc@syndicat.fr')
   OR (email ILIKE '%marie%' AND email ILIKE '%lefranc%');

-- Re-applique les COALESCE tokens sur le compte Marie (colonnes présentes)
DO $$
DECLARE
  col TEXT;
  cols TEXT[] := ARRAY[
    'confirmation_token',
    'recovery_token',
    'email_change_token_new',
    'email_change',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ];
BEGIN
  FOREACH col IN ARRAY cols
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND column_name = col
    ) THEN
      EXECUTE format(
        'UPDATE auth.users SET %I = COALESCE(%I, '''')
         WHERE lower(email) = lower(''m.lefranc@syndicat.fr'')
            OR (email ILIKE ''%%marie%%'' AND email ILIKE ''%%lefranc%%'')',
        col, col
      );
    END IF;
  END LOOP;
END $$;

SELECT
  email,
  (encrypted_password IS NOT NULL) AS has_password,
  (email_confirmed_at IS NOT NULL) AS email_confirmed,
  confirmation_token IS NULL AS confirmation_token_is_null,
  recovery_token IS NULL AS recovery_token_is_null
FROM auth.users
WHERE lower(email) = lower('m.lefranc@syndicat.fr')
   OR (email ILIKE '%marie%' AND email ILIKE '%lefranc%');
