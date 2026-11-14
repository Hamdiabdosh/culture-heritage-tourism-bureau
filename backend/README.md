# PHP API (migration target)

Plain PHP + PDO MySQL. Same-origin `/api/*` on shared hosting.

## What works now

| Endpoint | Status |
|---|---|
| `POST /api/auth/login` · `logout` · `GET session` | Live |
| `GET /api/institution` | Live |
| `GET /api/news` · `/news/{slug}` | Live |
| `GET /api/pages` · `/pages/{slug}?lang=` | Live (translation fallback) |
| `GET /api/events` · `/events/{slug}` | Live |
| `GET /api/services` · `/services/{slug}` | Live |
| `GET /api/documents` · `/documents/{slug}` | Live |
| `GET /api/sitemap.xml` | Live (published URLs; set `EGWP_PUBLIC_ORIGIN`) |
| `/api/cms/{pages,news,events,services,documents}` | Live CRUD + archive + publish gate |
| `/api/cms/users` | Live (admin only; last-admin guard) |

Dev logins (password `Admin123!`):

- `admin@example.gov.et` — can publish  
- `editor@example.gov.et` — writes forced to draft when publish requested  

List responses use `{ "items": [...] }`.  
CSRF: double-submit cookie `egwp_csrf` + header `X-CSRF-Token` on all mutating routes except `POST /api/auth/login`.

## Local Docker

```bash
docker compose up -d --build mysql api
./scripts/smoke-php-api.sh
./scripts/smoke-cms-all.sh
./scripts/smoke-cms-users.sh
```

MySQL also on host port `3307` (user/pass/db: `egwp`).

## Shared hosting

1. Import `database/mysql/001_schema.sql` (+ seed or your data).
2. Copy `config/config.example.php` → `config/config.php` with real DSN.
3. Deploy per map: `api/index.php` + sibling `app/`, `routes/`, `config/`.

## Password note

Greenfield seed uses `password_hash` / bcrypt. Migrating Better Auth scrypt hashes from Postgres is a later step — dual-verify then rehash on login.
