# Legacy Next.js stack (retired)

This directory is the former **Next.js + Drizzle + Better Auth + PostgreSQL** application.

It is **not** the live product path. Deploy and develop from the repo root (`frontend/` + `backend/` + MySQL).

Kept only for:

- UI/reference while finishing SPA parity
- Historical bootstrap scripts (`scripts/bootstrap-*.mjs`)
- Optional comparison against the PHP/MySQL cutover

## Run (local only, if needed)

```bash
# from repo root
docker compose --profile legacy up -d postgres

cd legacy/next
cp .env.example .env   # if present
pnpm install
pnpm db:migrate
pnpm dev
```

Do **not** point production DNS or shared hosting at this tree.
