# Harari Culture, Heritage & Tourism Bureau

Official **institutional website + CMS** for the Harari Culture, Heritage & Tourism Bureau.

**Stack:** Vite + React SPA → PHP PDO JSON API → MySQL/MariaDB (same-origin `/api/*`).

**Repo:** https://github.com/Hamdiabdosh/culture-heritage-tourism-bureau

> This product is the Bureau’s institutional site — not VisitHarar or a tourism booking platform. See [`PRODUCT.md`](PRODUCT.md) and [`docs/IMPLEMENTATION_ROADMAP_V1.md`](docs/IMPLEMENTATION_ROADMAP_V1.md).

> The retired Next.js / Drizzle / Better Auth / Postgres app under [`legacy/next/`](legacy/next/) is reference only — not the live path.

## Features

**Public site (Phase 1 institutional framing)**

- Home, About the Bureau, Contact, Privacy
- News & announcements, Events, Publications / resources
- Institution profile from the API; UI strings in `en` / `am` / `om` / `ha`
- Additional legacy visitor routes may still exist in code for compatibility; they are not primary navigation

**CMS** (`/cms`, `/login`)

- Dashboard; institution settings
- CRUD for news, pages, services, events, documents
- Media uploads; user roles (viewer / editor / admin)
- Cookie session + double-submit CSRF; editors cannot publish

## Local development

Requires Node ≥ 20 and Docker.

```bash
# Install SPA deps (once)
npm run install:web

# MySQL + PHP API
docker compose up -d mysql api

# First-time / empty DB: load seed (optional but needed for content + admin login)
docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/002_seed_dev.sql
# Then optional follow-ups: 003–006 under database/mysql/

# SPA
cd frontend && npm run dev
```

Or from the repo root:

```bash
npm run install:web
npm run dev          # starts Docker mysql+api, then Vite
```

### Local URLs (this machine)

Host ports are remapped in `frontend/vite.config.ts` and `docker-compose.override.yml` because `5173` / `8080` are often taken:

| Service | URL |
| --- | --- |
| SPA (Vite) | http://127.0.0.1:5174/ |
| PHP API | http://127.0.0.1:8081/api/… |
| MySQL | `localhost:3307` |

Vite proxies `/api` → `http://127.0.0.1:8081`.

Dev logins (after seed): `admin@example.gov.et` / `Admin123!` (also `editor@…`).

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Docker MySQL + API, then Vite |
| `npm run dev:api` | Docker MySQL + API only |
| `npm run dev:web` | Vite only |
| `npm run build` | Production SPA → `frontend/dist` |
| `npm run typecheck` | SPA TypeScript |
| `npm run smoke` | API + CMS smoke tests |

## Layout

```text
frontend/          Vite + React Router SPA
backend/           PHP front controller + controllers
database/mysql/    Schema + seeds
messages/          UI catalogs (en / am / om / ha)
deploy/            nginx example for static SPA + /api
scripts/           Smoke tests + CSRF helpers
docs/              Roadmap, audits, migration maps
legacy/next/       Retired Next monolith (do not deploy)
```

## Environment

- SPA: no secrets; same-origin `/api`.
- API: `backend/config/config.php` (see `config.example.php`). Docker sets `EGWP_*` in `docker-compose.yml`.
- Do not commit `backend/config/config.local.php` or production credentials.

## Production (shared PHP host)

1. Import `database/mysql/001_schema.sql` (+ your data/seed).
2. Deploy `backend/` so `/api` hits `public/` (see `backend/README.md`).
3. `npm run build` → upload `frontend/dist` as the site root.
4. SPA fallback to `index.html`; `/api/*` → PHP (`deploy/nginx.conf` as a starting point).
5. HTTPS + `session.secure = true` in PHP config.
