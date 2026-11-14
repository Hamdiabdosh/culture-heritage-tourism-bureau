# Full Migration Map

**Status:** Design map only — no implementation  
**Date:** 2026-10-11  
**Depends on:** Pass 3 frontend audit (`docs/PASS3_FRONTEND_MIGRATION_AUDIT.md`)

---

## 0. Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Topology | Same-origin (shared hosting) |
| 2 | Frontend | React CSR SPA (Vite + React Router) |
| 3 | Backend | PHP API |
| 4 | Database | **MySQL/MariaDB** (port from PostgreSQL) |
| 5 | Auth | Reuse `users` + credential rows; **new PHP sessions** (not Better Auth runtime) |
| 6 | Roles / publish gate / archive | Unchanged |
| 7 | i18n | Keep `en` / `am` / `om` / `ha`; cookie `lang` + `?lang=`; no locale URL prefixes |
| 8 | Public documents UI path | `/resources` (API: `/api/documents`) |
| 9 | Production Node | No — static SPA upload only |

**Three migrations in one program:**

```text
A. Database   PostgreSQL → MySQL
B. Backend    Next/Drizzle/Better Auth → PHP
C. Frontend   RSC + Server Actions → SPA + API client
```

---

## 1. Target system map

```text
┌─────────────────────────────────────────────────────────────┐
│  Shared PHP hosting (one origin)                            │
│                                                             │
│  /                  React SPA (static build)                │
│  /assets/*          JS/CSS                                  │
│  /api/*             PHP front controller → Controllers      │
│  /files/*           Optional uploaded/public files          │
│                                                             │
│           PHP ──PDO──► MySQL                                │
└─────────────────────────────────────────────────────────────┘

Local/dev (until cutover):
  Next monolith + Postgres may keep running for comparison.
  Do not point production PHP at Postgres.
```

### Suggested deploy layout (shared host)

```text
public_html/                 (or httpdocs/)
├── index.html               ← SPA entry
├── assets/                  ← Vite build
├── .htaccess                ← SPA fallback + /api rewrite
├── api/
│   └── index.php            ← PHP front controller
├── app/                     ← outside web root if host allows; else above api with deny
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Policies/
│   └── Middleware/
├── routes/
│   └── api.php
├── config/                  ← DB credentials (deny web access)
└── storage/
```

If the host cannot place PHP outside the web root, put `config/` behind deny rules. **NEEDS VERIFICATION** per host.

---

## 2. MySQL schema map (from `lib/db/schema.ts`)

### 2.1 Type conversion rules

| PostgreSQL (current) | MySQL target | Notes |
|---|---|---|
| `uuid` PK / FK | `CHAR(36)` NOT NULL | Keep UUID strings; app generates UUIDs |
| `text` | `TEXT` or `VARCHAR(n)` | Emails/slugs → VARCHAR; long body → TEXT |
| `boolean` | `TINYINT(1)` | `0/1` |
| `pgEnum user_role` | `ENUM('admin','editor','viewer')` | Same values |
| `pgEnum content_status` | `ENUM('draft','published','archived')` | Same values |
| `jsonb` | `JSON` NOT NULL | Page translations object |
| `text[]` | `JSON` NOT NULL | Service arrays as JSON string arrays |
| `timestamptz` | `DATETIME(3)` | Store UTC; document convention. Events use EAT wall-clock semantics in app code today |
| `uniqueIndex(institution_id, slug)` | `UNIQUE(institution_id, slug)` | Preserve |
| `ON DELETE CASCADE` | Same | Preserve |

**Timezone convention (lock):** store UTC in MySQL `DATETIME(3)`. Event create/update keeps current EAT wall-clock parsing rules in PHP (port from `lib/content/events.ts`).

### 2.2 Tables

#### `institutions`

| Column | MySQL | Notes |
|---|---|---|
| `id` | CHAR(36) PK | |
| `name` | VARCHAR(255) NOT NULL | |
| `short_name` | VARCHAR(64) NOT NULL | |
| `tagline` | TEXT NULL | |
| `description` | TEXT NULL | |
| `eyebrow` | VARCHAR(255) NULL | |
| `address` | TEXT NULL | |
| `phone` | VARCHAR(64) NULL | |
| `email` | VARCHAR(255) NULL | |
| `hours` | VARCHAR(255) NULL | |
| `created_at` | DATETIME(3) NOT NULL | |
| `updated_at` | DATETIME(3) NOT NULL | |

**Config bridge:** today `INSTITUTION_ID` env selects active row; PHP uses same idea (`config` / env). Public branding may still use `institution-config.ts` until API returns institution payload.

#### `users` (keep — application identity)

| Column | MySQL | Notes |
|---|---|---|
| `id` | CHAR(36) PK | |
| `name` | VARCHAR(255) NOT NULL | |
| `email` | VARCHAR(255) NOT NULL UNIQUE | |
| `email_verified` | TINYINT(1) NOT NULL DEFAULT 0 | |
| `image` | TEXT NULL | Unused heavily today |
| `role` | ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer' | |
| `active` | TINYINT(1) NOT NULL DEFAULT 1 | |
| `created_at` / `updated_at` | DATETIME(3) | |

#### `account` (keep for password migration)

| Column | MySQL | Notes |
|---|---|---|
| `id` | CHAR(36) PK | |
| `account_id` | VARCHAR(255) NOT NULL | Better Auth field; usually email for credential provider |
| `provider_id` | VARCHAR(64) NOT NULL | e.g. `credential` |
| `user_id` | CHAR(36) NOT NULL FK → users CASCADE | |
| `password` | TEXT NULL | Better Auth **scrypt** today |
| OAuth token fields | TEXT / DATETIME NULL | Keep columns for data port; PHP email/password may ignore |
| timestamps | DATETIME(3) | |

**Password strategy (locked intent):**

```text
Login:
  1) Load account.password for user
  2) Verify with Better Auth–compatible scrypt if format matches
     OR password_verify() if already rehashed
  3) On success with legacy scrypt: optionally rehash to password_hash() (PASSWORD_DEFAULT)
  4) Create PHP session
```

Exact scrypt parameters: **NEEDS VERIFICATION** against one known local password before go-live.

#### `session` — replace semantics

| Approach | Choice |
|---|---|
| Keep Better Auth session rows as-is | No |
| New PHP sessions table | Yes (can reuse table name `session` with compatible columns, or `php_sessions`) |

Recommended columns:

| Column | MySQL |
|---|---|
| `id` | CHAR(36) PK |
| `user_id` | CHAR(36) FK CASCADE |
| `token_hash` | CHAR(64) UNIQUE | Store hash of cookie token, not raw |
| `expires_at` | DATETIME(3) |
| `ip_address` | VARCHAR(64) NULL |
| `user_agent` | VARCHAR(512) NULL |
| `created_at` / `updated_at` | DATETIME(3) |

Cookie: HTTP-only, Secure (HTTPS), SameSite=Lax, path=/

#### `verification`

| Decision | Drop for v1 PHP unless password-reset is required |
|---|---|
| Data port | Optional; unused if no email verification / reset flow |

CMS accounts are provisioned out-of-band today (`disableSignUp: true`). No public registration in v1 PHP.

#### `pages`

| Column | MySQL |
|---|---|
| `id` | CHAR(36) PK |
| `institution_id` | CHAR(36) FK CASCADE |
| `slug` | VARCHAR(255) NOT NULL |
| `title` | VARCHAR(500) NOT NULL | English |
| `content` | MEDIUMTEXT NULL | English |
| `translations` | JSON NOT NULL | `{"am":{"title","content"},"om":...,"ha":...}` — never store `en` |
| `status` | ENUM(...) DEFAULT 'draft' |
| timestamps | DATETIME(3) |
| UNIQUE | (`institution_id`, `slug`) |

#### `news`

| Column | MySQL |
|---|---|
| `id`, `institution_id`, `slug`, `title` | as above |
| `summary`, `content`, `category` | TEXT / VARCHAR |
| `status` | ENUM |
| `published_at` | DATETIME(3) NULL |
| UNIQUE | (`institution_id`, `slug`) |

**No translation JSON today** — English-only content fields. Do not invent multilingual columns in this map.

#### `services`

| Column | MySQL |
|---|---|
| scalar fields | VARCHAR/TEXT as current |
| `required_documents` | JSON NOT NULL DEFAULT `[]` |
| `process` | JSON NOT NULL DEFAULT `[]` |
| `icon` | VARCHAR(32) DEFAULT 'file' |
| `status` | ENUM |
| UNIQUE | (`institution_id`, `slug`) |

#### `events`

| Column | MySQL |
|---|---|
| `event_date` | DATETIME(3) NOT NULL | Absolute instant (UTC storage) |
| other fields | mirror current |
| UNIQUE | (`institution_id`, `slug`) |

#### `documents`

| Column | MySQL |
|---|---|
| `file_url`, `file_type`, `file_size`, `year`, `category` | VARCHAR/TEXT |
| `status` | ENUM |
| UNIQUE | (`institution_id`, `slug`) |

`file_url` rules stay: empty, root-relative `/...`, or http(s) — reject `javascript:`, `data:`, protocol-relative.

### 2.3 Tables summary

| Table | Port? | Change |
|---|---|---|
| `institutions` | Yes | Types only |
| `users` | Yes | Types only |
| `account` | Yes | Keep for password; ignore OAuth in v1 |
| `session` | Yes | **New PHP session semantics** |
| `verification` | Optional | Skip v1 unless reset needed |
| `pages` | Yes | jsonb→JSON |
| `news` | Yes | Types only |
| `services` | Yes | arrays→JSON |
| `events` | Yes | Types + timezone convention |
| `documents` | Yes | Types only |

---

## 3. API map

All JSON. CMS routes require valid PHP session cookie + role checks. Public routes are read-only published content.

### 3.1 Auth

| Method | Path | Auth | Body | Response | Replaces |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ user: { id, name, email, role } }` + Set-Cookie | `authClient.signIn.email` |
| POST | `/api/auth/logout` | Session | — | `{ ok: true }` clear cookie | `authClient.signOut` |
| GET | `/api/auth/session` | Cookie optional | — | `{ user }` or `{ user: null }` | `auth.api.getSession` / layout checks |

Rules to preserve:

- Inactive user → no session; login fails or session cleared
- No public sign-up

### 3.2 Public reads

| Method | Path | Query | Notes |
|---|---|---|---|
| GET | `/api/institution` | — | Active institution (+ optional public contact fields) |
| GET | `/api/pages` | `?lang=` | Published only; resolve translations server-side for list titles if needed |
| GET | `/api/pages/{slug}` | `?lang=` | Published; English fallback (current `resolvePageContent`) |
| GET | `/api/news` | — | Published |
| GET | `/api/news/{slug}` | — | Published |
| GET | `/api/events` | — | Published (ordering: current upcoming-first logic) |
| GET | `/api/events/{slug}` | — | Published |
| GET | `/api/services` | — | Published |
| GET | `/api/services/{slug}` | — | Published |
| GET | `/api/documents` | — | Published |
| GET | `/api/documents/{slug}` | — | Published |

Reserved page slugs (must not be served as CMS catch-all pages in UI):  
`about`, `api`, `cms`, `events`, `login`, `news`, `resources`, `services`

### 3.3 CMS — pages

| Method | Path | Roles | Replaces |
|---|---|---|---|
| GET | `/api/cms/pages` | viewer+ | `listPages` |
| GET | `/api/cms/pages/{id}` | viewer+ | `getPageById` |
| POST | `/api/cms/pages` | editor+ | `createPageAction` |
| PUT | `/api/cms/pages/{id}` | editor+ | `updatePageAction` |
| DELETE | `/api/cms/pages/{id}` | editor+ | `archivePageAction` (soft → `archived`) |

Body (create/update): `{ title, slug, content, status, translations }`

### 3.4 CMS — news / events / services / documents

Same pattern each:

| Method | Path | Roles |
|---|---|---|
| GET | `/api/cms/{entity}` | viewer+ |
| GET | `/api/cms/{entity}/{id}` | viewer+ |
| POST | `/api/cms/{entity}` | editor+ |
| PUT | `/api/cms/{entity}/{id}` | editor+ |
| DELETE | `/api/cms/{entity}/{id}` | editor+ (archive) |

`{entity}` ∈ `news` | `events` | `services` | `documents`

**Bodies** (from current validators):

| Entity | Fields |
|---|---|
| news | `title, slug, summary, category, content, status` |
| events | `title, slug, summary, content, eventDate, location, type, status` |
| services | `title, slug, summary, description, category, responsibleOffice, eligibility, requiredDocuments[], process[], contact, icon, status` |
| documents | `title, slug, summary, category, year, fileUrl, fileType, fileSize, status` |

### 3.5 CMS — users (added — required by current UI)

| Method | Path | Roles | Replaces |
|---|---|---|---|
| GET | `/api/cms/users` | admin | `listUsers` |
| PUT | `/api/cms/users/{id}` | admin | role and/or active | `updateUserRoleAction` / `updateUserActiveAction` |

Rules:

- Cannot remove last active admin
- Deactivating user deletes their sessions
- Self-deactivate → session ended

### 3.6 Publishing gate (server-side, every write)

```text
admin  → requested status allowed
editor → if requested == published OR existing == published → force draft
viewer → 403 on all writes
```

Archive: status → `archived` (DELETE in API = soft archive, matching today).

### 3.7 Error shape (proposed)

```json
{ "error": { "code": "VALIDATION|CONFLICT|NOT_FOUND|FORBIDDEN|UNAUTHORIZED", "message": "..." } }
```

HTTP: 400 / 409 / 404 / 403 / 401.

---

## 4. Frontend route map

### 4.1 Public (React Router)

| UI path | Data |
|---|---|
| `/` | Compose institution + news + services + events + documents |
| `/about` | `GET /api/pages/about?lang=` |
| `/contact` | Config / institution API (no DB page required today) |
| `/news` | `GET /api/news` |
| `/news/:slug` | `GET /api/news/:slug` |
| `/events` | `GET /api/events` |
| `/events/:slug` | `GET /api/events/:slug` |
| `/services` | `GET /api/services` |
| `/services/:slug` | `GET /api/services/:slug` |
| `/resources` | `GET /api/documents` |
| `/resources/:slug` | `GET /api/documents/:slug` |
| `/:slug` | `GET /api/pages/:slug?lang=` after static routes; respect reserved list |
| `/login` | Auth form → `POST /api/auth/login` |

### 4.2 CMS

| UI path | Data | Guard |
|---|---|---|
| `/cms` | Dashboard aggregates (optional; can be client-only counts later) | session |
| `/cms/content` | `GET /api/cms/pages` | session |
| `/cms/content/new` | create form | editor+ |
| `/cms/content/:id` | `GET /api/cms/pages/:id` | session; edit editor+ |
| `/cms/news`… | same pattern | |
| `/cms/events`… | same | |
| `/cms/services`… | same | |
| `/cms/documents`… | same | |
| `/cms/users` | `GET /api/cms/users` | admin |

Client guard: redirect to `/login?next=` if `GET /api/auth/session` has no user.  
Server guard: PHP still enforces on every CMS API call.

### 4.3 SPA hosting rewrite

```text
/api/*     → api/index.php
/*         → index.html   (if not a real file)
```

---

## 5. Auth flow map (target)

```text
LOGIN
  LoginForm
    → POST /api/auth/login (credentials: include)
    → PHP verifies password (account.password)
    → checks users.active
    → inserts session row + Set-Cookie (HttpOnly)
    → client navigates to /cms or ?next=

SESSION CHECK
  any CMS route / API
    → read cookie → hash → lookup session → join users
    → inactive → destroy session → 401

ROLE
  viewer: CMS read
  editor: CMS read + write (draft gate)
  admin: + publish + users

LOGOUT
  → POST /api/auth/logout → delete session row → clear cookie
```

---

## 6. i18n map

| Concern | Stay | Change |
|---|---|---|
| `messages/{en,am,om,ha}.json` | Yes | Load in SPA (not next-intl) |
| Language codes in `institution-config` | Yes | — |
| Cookie `lang` + `?lang=` | Yes | Client sets cookie; no `router.refresh()` RSC |
| Page content translations JSON | Yes | Resolve in **PHP** on public page GET |
| Harari incomplete UI copy | Keep wired | Content work separate |
| News/events/services/documents translations | Not in DB today | **Out of scope** until translation audit |

---

## 7. Code fate map (frontend)

### Keep mostly (presentation)

- `components/institution-site.tsx`, `public-detail.tsx`
- CMS form UI structure (`cms-*-form.tsx`) — swap actions → API
- `components/cms-shell.tsx` — swap Link/nav/auth client
- `messages/*.json`, CSS (`app/globals.css`, `app/cms/cms.css`)
- Pure helpers: `page-fields`, `page-translations` (client-side helpers), `public-format`, `institution-config`
- `src/components/brand/built-by-raafat.tsx`

### Modify

- All `next/link` → React Router `Link`
- `useRouter` / `usePathname` → React Router
- `useTranslations` → non-Next i18n
- Forms: `useActionState(serverAction)` → API client + local state
- Login / logout → PHP auth endpoints

### Replace / remove from frontend process

| Current | Fate |
|---|---|
| `app/**/page.tsx` RSC data loaders | React routes + fetch |
| `app/cms/**/actions.ts` | PHP CMS APIs |
| `lib/db/*`, Drizzle calls from app | Gone from frontend |
| `lib/auth.ts`, `auth-client`, `authz` Next pieces | PHP + thin client session helper |
| `app/api/auth/[...all]` | PHP `/api/auth/*` |
| `proxy.ts` | SPA guard + `.htaccess` |
| `next-intl` plugin / `i18n/request.ts` | SPA i18n bootstrap |
| `components/admin-site.tsx` | Do not migrate (prototype) |

---

## 8. Data path map (before → after)

```text
BEFORE
  app/news/page.tsx (RSC)
    → listPublishedNews()
    → drizzle → PostgreSQL

AFTER
  routes/NewsPage.tsx (CSR)
    → apiClient.get('/api/news')
    → PHP NewsController
    → PDO → MySQL
```

```text
BEFORE
  cms-news-form → createNewsAction → createNews() → Postgres

AFTER
  cms-news-form → apiClient.post('/api/cms/news', body)
    → PHP (session + publish gate) → MySQL
```

---

## 9. Risk map

| ID | Priority | Risk | Mitigation |
|---|---|---|---|
| R1 | CRITICAL | Password hash incompatibility (scrypt) | Verify one hash in PHP early; dual-verify + rehash plan |
| R2 | CRITICAL | Shared host PHP/MySQL limits | Confirm PHP 8.1+, PDO mysql, rewrite, JSON, uploads |
| R3 | HIGH | Soft-delete vs HTTP DELETE confusion | Document: DELETE = archive |
| R4 | HIGH | CSRF on cookie auth | Same-site + CSRF token for mutating CMS routes |
| R5 | HIGH | SEO with CSR | Meta tags in SPA; sitemap.xml; accept limitation or later prerender |
| R6 | MEDIUM | Event timezone EAT | Port parser tests from `events.ts` |
| R7 | MEDIUM | Page translations fallback bugs | Port `resolvePageContent` tests/selfcheck |
| R8 | MEDIUM | Incomplete Harari strings | Not a blocker for wiring |
| R9 | LOW | Prototype admin-site | Ignore |

---

## 10. Delivery sequence (full program)

| Pass | Deliverable | Exit criteria |
|---|---|---|
| **3** | Frontend Next audit | Done — `PASS3_FRONTEND_MIGRATION_AUDIT.md` |
| **4** | This map + MySQL DDL draft | Schema accepted; no feature redesign |
| **5** | MySQL migrations applied (empty) + seed institution/admin | Tables exist on target MySQL |
| **6** | Data port script Postgres→MySQL (if existing data) | Row counts + spot checks |
| **7** | PHP auth (login/logout/session) | Cookie session works on host |
| **8** | Public read APIs | curl/json for all public GETs |
| **9** | CMS read/write APIs + users | Role/publish gate tests |
| **10** | React SPA shell + i18n + router | Static build served beside API |
| **11** | Vertical slice: public news | Feature-complete vs current news UI |
| **12** | Remaining public pages | Parity |
| **13** | CMS UI on API | Parity with forms/users |
| **14** | Cutover + remove Next/Drizzle/Better Auth from prod path | Host serves SPA+PHP only |

**Do not open Cursor for Pass 7+ until Pass 4–5 schema is agreed.**

---

## 11. Out of scope (explicit)

- Redesigning roles or publish workflow  
- Adding translations to news/events/services/documents  
- Media library / file upload system (documents use URL fields today)  
- Public registration / OAuth  
- Keeping Better Auth or Next in production  
- Migrating `components/admin-site.tsx`  

---

## 12. Open items (NEEDS VERIFICATION)

1. Host PHP version and PDO MySQL  
2. Whether `config/` can live outside web root  
3. Better Auth scrypt verify parameters in PHP  
4. Whether production has existing Postgres data to migrate (vs greenfield MySQL seed)  
5. HTTPS availability (required for Secure cookies in prod)  
6. CSRF approach preference (double-submit cookie vs synchronizer token)  

---

## 13. One-page checklist

```text
[x] MySQL schema matches map (§2)
[x] Auth endpoints (§3.1) + publish gate (§3.6)
[x] Public GETs (§3.2)
[x] CMS CRUD + users (§3.3–3.5)
[x] SPA routes (§4) + /resources ↔ documents
[x] i18n four locales + page JSON translations in PHP
[x] Cut Next from live path (repo: `legacy/next/`; deploy SPA+PHP)
[ ] Static deploy + /api rewrite (§1) on shared host
```

---

*End of full migration map. Next: accept/adjust this map, then Pass 4 MySQL DDL (still design/SQL only until you say implement).*
