# Database access posture (RLS + grants)

**Architecture:** custom email/password auth (iron-session), **not** Supabase Auth.
The app talks to Postgres over a **direct connection as the `postgres` owner role**
(`DATABASE_URL`, via drizzle/postgres-js) — it does **not** use the Supabase
client / PostgREST. Tenant isolation is enforced in application code: every query
filters by `organization_id` from the session.

## Why "RLS enabled, no policy" is correct here
The Supabase linter reports `rls_enabled_no_policy` (INFO) on every table. For a
trusted-backend app that is the **safe** state:

- RLS **enabled** + **no policy** ⇒ the auto-exposed public REST/Realtime API
  (`anon`, `authenticated`) is denied **all** rows by default.
- The `postgres` owner role **bypasses RLS**, so the app keeps full access.

Writing `auth.uid()`-based policies would be theater — there are no
Supabase-authenticated users, and the app's owner connection bypasses RLS anyway.

## Defense-in-depth applied (migration `lock_public_api_grants`)
We additionally revoked privileges so the public API is locked at the **grant**
layer too — two independent locks:

```sql
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
```

Verified after applying: only `postgres` (app) and `service_role` (Supabase admin)
retain table grants; `anon` / `authenticated` have none.

## If we ever expose the public API (future)
If a feature needs the Supabase client from the browser, switch that table to
Supabase Auth + add explicit `organization_id = (auth.jwt() ->> 'org')` policies
and re-grant the minimal privileges. Until then, keep it backend-only.
