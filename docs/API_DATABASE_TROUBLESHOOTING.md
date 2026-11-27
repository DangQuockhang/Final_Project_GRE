# API and database connection checks

Run these commands from the repository root. They do not initialize or seed data.

```powershell
npm run db:check
```

This prints the configured database host, port and name (never its password), missing required tables/columns, and counts of products, orders and users when those tables exist. It runs in a read-only transaction. Exit code 1 means the check failed or the schema is incomplete; do not treat this as permission to create a new database.

`GET /api/health` returns 200 only when PostgreSQL is reachable and the required schema checks pass. An empty or older schema returns 503 / `DATABASE_SCHEMA_NOT_READY`. An unreachable database returns 503 / `DATABASE_UNAVAILABLE`. This is a readiness check, not proof that all historical records are present. Use counts and a verified backup to confirm the intended data source.

## Run on the computer or a phone

Terminal 1:

```powershell
npm run dev:api
```

Terminal 2:

```powershell
npm run dev:store
```

Local development now sends API and uploaded image requests through Vite (`/api` and `/media`) to `127.0.0.1:4000`. A stale `VITE_API_URL` in your private `.env` no longer changes this development connection. The API must still be running on the computer. Open `http://localhost:5173` on the computer; on a phone on the same Wi-Fi, use the Network address printed by Vite. Allow the development server on your private network when Windows asks. Do not disable the firewall.

Production builds retain their configured `VITE_API_URL`. To intentionally test a remote API in development, configure its URL and run:

```powershell
npm run dev -w @kd/store -- --mode remote
```

`npm run dev:store:lan` remains available. CORS/authentication and Decart origin checks are unchanged: add the exact phone-visible store origin to `ALLOWED_ORIGINS` in `server/.env` for try-on, then restart the API. Do not put API keys in Vite variables. HTTP over a LAN is for UI preview; camera access on a phone requires a trusted HTTPS origin. The separate 3D studio still needs its own reachable URL and running server.

## If the original database appears missing

1. Do not run `db:seed`, delete Docker volumes, or run `docker compose down -v`.
2. List containers and volumes without changing them:

```powershell
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker volume ls
```

3. Inspect the database container's mounts. The Compose project name (often derived from the folder name) changes the volume prefix. A spelling change in the project directory can therefore start a different, empty database while the old volume remains intact.
4. Preserve the original volume. Inspect a separate copy with the same PostgreSQL major version; do not attach two running PostgreSQL containers to one data volume. If a recovery container is stopped, inspect its logs and start that copy before querying it.
5. Check record counts on the copy. Seeing tables alone does not confirm that this is the latest database.
6. Export a `pg_dump -Fc` backup to a file inside the recovery container and use `docker cp` to copy it outside Docker. Do not redirect a binary dump through Windows PowerShell. Verify the archive and perform a test restore into a separate disposable database before switching the application.
7. Back up `server/uploads` separately. Uploaded pictures are not contained in PostgreSQL or Git.
8. Only after confirming and backing up the correct database, review and apply the project's migrations to a recovery copy. Older databases can contain products while still lacking newer account, collection or membership tables. Never automatically seed a recovered store.

Changing `VITE_API_URL` or `ALLOWED_ORIGINS` does not delete PostgreSQL data. Git pull transfers source code, not your local database or private `.env` files.
