BEGIN;

-- 1. Correction des tokens GoTrue (remplacement des NULLs par '')
-- Note : confirmed_at est omis car c'est une colonne générée
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
  encrypted_password = crypt('password123', gen_salt('bf')),
  updated_at = now(),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  aud = 'authenticated',
  role = 'authenticated'
WHERE email = 'm.lefranc@syndicat.fr';

-- 2. Resynchronisation de l'identité auth.identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  id,
  id,
  format('{"sub":"%s","email":"%s"}', id, email)::jsonb,
  'email',
  id::text,
  now(),
  now(),
  now()
FROM auth.users
WHERE email = 'm.lefranc@syndicat.fr'
ON CONFLICT (provider, provider_id) DO UPDATE
SET identity_data = EXCLUDED.identity_data,
    updated_at = now();

COMMIT;

-- 3. Contrôle visuel post-exécution
SELECT id, email, role, confirmation_token, recovery_token, encrypted_password IS NOT NULL as has_password
FROM auth.users
WHERE email = 'm.lefranc@syndicat.fr';