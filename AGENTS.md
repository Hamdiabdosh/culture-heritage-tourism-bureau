# Agent notes — live stack

**Product:** Official institutional website of the Harari Culture, Heritage & Tourism Bureau (see `PRODUCT.md`). This is **not** VisitHarar and must not be framed as a tourism booking or visitor-discovery product.

This repository’s **live path** is:

- `frontend/` — Vite + React Router SPA
- `backend/` — PHP PDO JSON API
- `database/mysql/` — MySQL/MariaDB schema + seed

Do **not** treat the root as a Next.js app. The retired monolith is under `legacy/next/` (Next, Drizzle, Better Auth, Postgres). Do not revive it for new features unless explicitly asked.

UI message catalogs remain at repo-root `messages/*.json` (imported by the SPA).

Prefer: no Next APIs, no Drizzle, no Better Auth on the production path.

**Roadmap:** `docs/IMPLEMENTATION_ROADMAP_V1.md`. Implement one phase at a time; do not auto-start the next phase.

**Note:** Legacy VisitHarar-oriented seeds, research docs under `docs/content/`, and some CMS guide-page policies may still exist. Do not wipe historical data or change fixed guide-page rules unless the active phase explicitly allows it.
