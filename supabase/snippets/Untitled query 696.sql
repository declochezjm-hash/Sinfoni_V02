CREATE OR REPLACE FUNCTION app.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
$$;

CREATE OR REPLACE FUNCTION app.current_user_commune_insee_code()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'commune_insee_code',
    auth.jwt() -> 'user_metadata' ->> 'commune_insee_code'
  );
$$;

CREATE OR REPLACE FUNCTION app.is_commune_user()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT app.current_user_role() = 'COMMUNE';
$$;