# Pass 4 — MySQL schema notes

**Status:** DDL draft (SQL only)  
**Date:** 2026-10-11  
**Authority:** `docs/FULL_MIGRATION_MAP.md` §2; Postgres model in `lib/db/schema.ts`  
**Files:** `database/mysql/001_schema.sql`, `database/mysql/002_seed_placeholder.sql`

---

## Type mapping decisions

| Postgres (schema.ts) | MySQL | Decision |
|---|---|---|
| `uuid` | `CHAR(36)` | App-generated UUID strings; no DB `UUID()` required |
| `text` (short) | `VARCHAR(n)` | Map lengths: emails/slugs/names per §2.2 |
| `text` (long body) | `TEXT` / `MEDIUMTEXT` | Page/news/event/service bodies → `MEDIUMTEXT` where useful |
| `boolean` | `TINYINT(1)` | `0` / `1` |
| `user_role` / `content_status` pgEnum | MySQL `ENUM(...)` | Same values |
| `jsonb` translations | `JSON NOT NULL` | Default `{}` at insert time (app); no `en` inside |
| `text[]` service arrays | `JSON NOT NULL` | Store JSON arrays `[]` / `["…"]` |
| `timestamptz` | `DATETIME(3)` | **UTC only** in DB |

Map preferred over schema.ts where they differ (VARCHAR widths, `MEDIUMTEXT` for page `content`, session shape).

---

## Session table vs Better Auth

| | Better Auth (`schema.ts`) | PHP target (`001_schema.sql`) |
|---|---|---|
| Token column | `token` TEXT UNIQUE (raw / opaque) | `token_hash` CHAR(64) UNIQUE |
| Semantics | Better Auth session cookie value | Hash of cookie token only (never store raw) |
| Other | `expires_at`, `ip_address`, `user_agent`, `user_id` CASCADE | Same + timestamps |

Do **not** import Better Auth `session` rows into this table without re-issuing PHP sessions. Table name `session` is reused; column contract is intentionally different.

`verification` is commented out in DDL (skip v1).

---

## Timezone convention

1. Session/connection: prefer `SET time_zone = '+00:00'` (also at top of `001_schema.sql`).
2. All `DATETIME(3)` columns store **UTC**.
3. Event create/update keeps current EAT wall-clock parsing in app code (port from `lib/content/events.ts`); convert to UTC before write / from UTC on read.
4. Soft archive remains `status = 'archived'` — no hard deletes for content.

---

## Apply on shared hosting (phpMyAdmin)

1. Create empty database (utf8mb4) in the host panel if needed.
2. phpMyAdmin → select DB → **Import** (or SQL tab).
3. Run `001_schema.sql` first. Expect `CREATE TABLE IF NOT EXISTS` (safe-ish re-run; does not alter existing tables).
4. Copy `002_seed_placeholder.sql`, uncomment, replace `REPLACE_*` tokens, run once. Prefer generating password hash offline (`password_hash` in PHP CLI) — never paste plaintext into SQL history if avoidable.
5. Point PHP config `INSTITUTION_ID` at the seeded institution `id`.

If Import size limits hit: paste sections table-by-table, or use host MySQL CLI if available.

---

## Deviations / notes vs map + schema.ts

| Item | Note |
|---|---|
| `pages.content` | Map: `MEDIUMTEXT`; schema.ts: unbounded `text` → MySQL `MEDIUMTEXT` |
| `news`/`events`/`services` long bodies | `MEDIUMTEXT` for parity with pages (map said TEXT; longer bodies safer) |
| JSON defaults | MySQL/MariaDB differ on `DEFAULT ('{}')` for JSON; app supplies `{}` / `[]` on INSERT |
| `ON UPDATE CURRENT_TIMESTAMP(3)` | Convenience vs Drizzle `$onUpdate`; PHP may still set `updated_at` explicitly |
| `verification` | Skipped (commented), per locked decision |

No translation columns added to news/events/services/documents.

---

## Open NEEDS VERIFICATION

1. Host PHP version and PDO MySQL (target PHP 8.1+).
2. Whether `config/` can live outside web root (or deny rules only).
3. Better Auth scrypt verify parameters in PHP (one known local password before go-live).
4. Whether production has existing Postgres data to migrate vs greenfield seed.
5. HTTPS availability (Secure cookies).
6. CSRF approach (double-submit vs synchronizer token).
7. MariaDB JSON default/`CHECK` quirks on the specific host version (10.5+ assumed).

---

*Pass 4 exit: schema accepted; empty apply + seed is Pass 5.*
