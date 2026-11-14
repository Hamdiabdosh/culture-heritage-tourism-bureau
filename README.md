# Ethiopian Government Website Platform

Reusable government institution website: public site + CMS.

**Live stack:** React SPA (Vite) → PHP PDO API → MySQL/MariaDB. Same-origin `/api/*`.

The previous Next.js / Drizzle / Better Auth / Postgres app lives under [`legacy/next/`](legacy/next/) for reference only — it is **not** the production path.

## Local development

```bash
# API + MySQL
docker compose up -d mysql api

# SPA (npm, not pnpm — keeps the frontend outside any Next workspace)
cd frontend && npm install && npm run dev
```

Or from the repo root after `npm run install:web`:

```bash
npm run dev
```

| URL | What |
| --- | --- |
| http://127.0.0.1:5173 | Public site + CMS SPA (Vite proxies `/api` → `:8080`) |
| http://127.0.0.1:8080/api/… | PHP API directly |

Dev logins (seed): `admin@example.gov.et` / `Admin123!` (also `editor@…`).

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev:api` | Docker MySQL + PHP API |
| `npm run dev:web` | Vite only |
| `npm run build` | Production SPA build → `frontend/dist` |
| `npm run typecheck` | SPA TypeScript |
| `npm run smoke` | API + CMS smoke tests |

## Layout

```text
frontend/          Vite + React Router SPA
backend/           PHP front controller + controllers
database/mysql/    Schema + local seed
messages/          UI strings (en / am / om / ha)
scripts/           Smoke tests + CSRF helpers
docs/              Migration maps / contracts
legacy/next/       Retired Next monolith (do not deploy)
```

## Environment

- SPA: no secrets; talks same-origin `/api`.
- API: `backend/config/config.php` (see `config.example.php`). Docker overrides via `EGWP_*` env vars in `docker-compose.yml`.
- Do not commit `backend/config/config.local.php` or production credentials.

## Production (shared PHP host)

1. Import `database/mysql/001_schema.sql` (+ seed or your data).
2. Deploy `backend/` so the web root can reach `public/` as `/api` (see `backend/README.md`).
3. Build SPA: `npm run build` → upload `frontend/dist` as the site document root.
4. Configure host rewrite: SPA fallback to `index.html`; `/api/*` → PHP.
5. HTTPS + `session.secure = true` in PHP config.

## Auth & CSRF

- Cookie session (`egwp_session`, HttpOnly).
- Double-submit CSRF: cookie `egwp_csrf` + header `X-CSRF-Token` on mutating routes (except login).
- Roles: viewer / editor / admin; editors cannot publish.

## Legacy Next stack

See [`legacy/next/README.md`](legacy/next/README.md). Optional Postgres: `docker compose --profile legacy up -d postgres`.
