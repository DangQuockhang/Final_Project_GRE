# KD Design: PostgreSQL cloud cutover

This is a staged migration, not an automatic reset. Creating a cloud project does
not recover missing local records and Git does not carry database rows or uploads.
Keep the original volume and current server/.env until the cloud restore is verified.

## 1. Create the project in the owner's account

1. Sign in at https://supabase.com/dashboard and create a project in your own organization.
2. Use a clear name such as `kd-design-staging`, select a nearby available region,
   and save the generated database password in a password manager.
3. For an initial connectivity test you can select a free plan if available. Review
   its limits before creating it. Paid plan/billing decisions belong to the owner.
4. In Data API settings, disable the Data API **before restoring application data**.
   KD Design uses its Express API, SQL and existing JWT authentication. Its users
   table must not become an anonymously readable Supabase REST/GraphQL endpoint.
   If Data API is needed later, design grants and RLS first.
5. In Connect, select **Session pooler, port 5432**. This avoids the direct
   endpoint's IPv6 requirement on IPv4-only networks. Do not use transaction
   pooler port 6543 for the initial migration.
6. In Database settings, download the project's root CA certificate. Keep it in
   `server/certs/supabase-ca.crt` and enable SSL enforcement where available.

Only server processes receive the database URI. Never put it in VITE_ variables,
frontend code, screenshots, Git or chat. A publishable/anon API key is not a
PostgreSQL password. Percent-encode special characters in a URI password.

## 2. Check the destination without changing the running API

Copy `server/cloud.env.example` to `server/.env.cloud` and fill the actual pooler
URI and CA path. The example contains no working credentials.

```powershell
npm run db:cloud:check -- --connect-only
```

This reads only `.env.cloud`, never falls back to `.env`, verifies TLS and prints
only host/database, schema status and counts. A new database should report
`connected: true`, `tls: true`, `ready: false`. This is expected before restore.

After restoring the complete schema and data:

```powershell
npm run db:cloud:check
```

Exit 0 means connected with TLS and required schema present; exit 2 means missing
schema; exit 1 means configuration/connection failure. Counts still need to be
compared with the source; schema readiness alone does not prove data completeness.

`DB_SSL_MODE=require` also verifies the certificate and hostname in this backend.
There is no insecure no-verify fallback. If CA validation fails, use the correct
project CA, not `rejectUnauthorized=false`. The pool defaults to five connections
per API process; budget total connections across all replicas and developers.

## 3. Back up the selected local database AND uploads

First run `npm run db:check` to record the intended source. Confirm the currently
mounted Docker volume; similar `design` and `desgin` names are not interchangeable.
Stop API processes and any other writers during the final snapshot and cutover.
The source PostgreSQL container must remain running for pg_dump.

Example for the source shown in this project's recovery investigation (verify it
matches the current mount before using):

```powershell
docker inspect kd-design-starter-postgres-1 --format '{{json .Mounts}}'
powershell -NoProfile -File scripts/Backup-LocalDatabase.ps1 -ExpectedVolume kd-desgin-starter_kd_pgdata -BackupRoot D:\KD-Backups -WritesStopped
```

The script refuses a different mounted volume, creates a unique backup directory,
exports a custom PostgreSQL archive, copies all `server/uploads`, and writes a
SHA-256 manifest. It does not seed, reset, delete, or switch the source database.
The dump is binary-safe on Windows PowerShell. It contains sensitive account data;
keep the folder private and copy it to an access-controlled off-machine backup.
Listing the archive is not a restore test; the manifest explicitly records that.

If Docker access is denied, run the script in the user's normal terminal with
Docker Desktop running. Do not remove Docker volumes to fix access errors.

## 4. Restore and verify before cutover

Have the migration operator use pg_restore with a compatible client version,
`--no-owner --no-privileges --single-transaction --exit-on-error`, against the
**new, empty application destination**. Review the archive TOC first: restore
application objects, not Supabase-managed auth/storage schemas or global roles.
Do not overwrite an existing target or use `--clean` against a live project.
Handle existing `public` schema entries explicitly rather than ignoring restore
errors. Use credentials from a protected environment/passfile, not command history.

Required acceptance checks:

- Restore completes with no errors; all application tables, sequences, foreign
  keys, indexes and schema_migrations entries are accounted for.
- Source and destination row counts match for every application table while writes
  are paused. Compare primary keys and application records, not just totals.
- New inserts continue beyond existing IDs. Exercise login, brand/logo display,
  product creation and the order workflow in a disposable staging project.
- Disable unintended Data API exposure and check Supabase Security Advisor.
- Use a dedicated least-privilege runtime login for production; keep schema-owner
  credentials for migrations. Test its exact permissions with all API workflows.

Only after acceptance, update DATABASE_URL and DB_SSL_* in **server/.env**, retaining
all unrelated JWT, email, CORS and AI settings. Restart dev:api and confirm both
`http://localhost:4000/api/health` and `http://localhost:5173/api/health`.
Keep Vite development requests on `/api`; do not replace them with the database URL.

Rollback before accepting new cloud writes: stop the API, restore the previous
connection settings and restart against the untouched local source. After cloud
writes occur, reconcile those writes before rollback to avoid losing them.

## 5. Files, backups and handover

Database migration alone does **not** move logos, products or avatar files.
This version still serves `/media/...` from `server/uploads`. Another machine
needs that uploads directory or a shared deployed API/media service. Moving media
to object storage requires a separate storage adapter and transfer verification.

Cloud is not a substitute for backups. Configure the chosen plan's backup and
retention features, an independent off-site export, and a documented restore test.
Supabase database backups do not include Storage object contents. Back up media
separately even after moving it to cloud storage. Do not describe a free project
as production-ready or automatically protected from deletion.

Official references (reviewed 2026-11-26):

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/kb/guides/migrate-from-postgres
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/platform/backups
- https://node-postgres.com/features/ssl
