# Agent notes — live stack

This repository’s **live path** is:

- `frontend/` — Vite + React Router SPA
- `backend/` — PHP PDO JSON API
- `database/mysql/` — MySQL/MariaDB schema + seed

Do **not** treat the root as a Next.js app. The retired monolith is under `legacy/next/` (Next, Drizzle, Better Auth, Postgres). Do not revive it for new features unless explicitly asked.

UI message catalogs remain at repo-root `messages/*.json` (imported by the SPA).

Prefer: no Next APIs, no Drizzle, no Better Auth on the production path.
