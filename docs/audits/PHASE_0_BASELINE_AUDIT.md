# Phase 0 — Baseline Repository Inspection & Readiness Audit

| Field | Value |
| --- | --- |
| **Project** | Harari Culture, Heritage & Tourism Bureau — official institutional website |
| **Repository** | https://github.com/Hamdiabdosh/culture-heritage-tourism-bureau |
| **Local path** | `/mnt/data/Projects/Culture, Heritage and Tourism Bureau` |
| **Audit date** | 21 November 2026 |
| **Mode** | Inspection only (no application code or schema changes) |
| **Auditor** | Cursor agent (Phase 0 baseline) |

**Status legend:** `IMPLEMENTED` · `PARTIALLY IMPLEMENTED` · `MISSING` · `BROKEN` · `NOT VERIFIED`

Findings are tagged **[source]** (static code/docs) or **[runtime]** (executed checks).

---

## 1. Executive summary

The repository is a **working government-institution CMS platform** (React 19 / Vite 6 / React Router 7 → PHP 8.3 PDO API → MariaDB) with authentication, CSRF, draft/publish gating, media uploads, and four UI locale catalogs. It is **product-aligned to VisitHarar / Tourism Commission visitor IA**, not yet to the Bureau institutional website.

**Phase 1 readiness verdict: READY WITH CONDITIONS.**

The stack, auth, CMS CRUD patterns, Docker deploy path, and frontend production build are solid enough to begin Phase 1 (product identity & institutional foundation). Phase 1 must treat VisitHarar branding, tourism-first navigation, fixed guide-page restrictions, and VisitHarar seed content as **intentional current state to reverse carefully** — not as defects to ignore.

**Do not begin Phase 1 until this audit is approved.**

---

## 2. Repository and Git status

### [runtime] Git

| Item | Value |
| --- | --- |
| Branch | `main` (tracks `origin/main`) |
| Ahead/behind | Even with remote at inspection time |
| HEAD | `3703acafc512126b4fbb27f18686f23919178288` |
| HEAD message | `Remap local Vite and API ports when 5173/8080 are occupied.` |
| Prior commit | `6e62871` — `Initial public snapshot of the government website platform.` |

### [runtime] Working tree (preserved; not cleaned)

| State | Path |
| --- | --- |
| Modified | `README.md` (Bureau-oriented rewrite; uncommitted) |
| Untracked | `docs/IMPLEMENTATION_ROADMAP_V1.md` |
| Untracked (this audit) | `docs/audits/PHASE_0_BASELINE_AUDIT.md` |

No discard/reset/clean was performed.

### [source] Structure and entry points

| Role | Path | Status |
| --- | --- | --- |
| Active frontend | `frontend/` (`src/main.tsx`, `src/App.tsx`) | `IMPLEMENTED` |
| Active backend | `backend/public/index.php` + `routes/api.php` | `IMPLEMENTED` |
| Active DB | `database/mysql/` | `IMPLEMENTED` |
| UI messages | `messages/{en,am,om,ha}.json` | `IMPLEMENTED` |
| Deploy sample | `deploy/nginx.conf`, `docker-compose.yml` | `IMPLEMENTED` |
| Legacy (retired) | `legacy/next/` | Present; **not** production (`AGENTS.md`) |
| Agent notes | `AGENTS.md`, `CLAUDE.md` | Live stack = Vite/PHP/MySQL |

### [source] Documentation conflicts

| Doc | Issue |
| --- | --- |
| `PRODUCT.md` | VisitHarar visitor product — conflicts with Bureau scope |
| `README.md` (working tree) | Updated toward Bureau platform; still describes current tourism-capable stack |
| `docs/PASS4_*`, `FULL_MIGRATION_MAP.md` | Migration-era / stub language; live code is past stubs |
| `docs/content/visitharar-*` | Tourism research packs — VisitHarar content, not Bureau org site |
| `docs/IMPLEMENTATION_ROADMAP_V1.md` | New V1 roadmap (uncommitted) — authoritative for forward plan |

---

## 3. Confirmed technology stack

| Layer | Technology | Evidence |
| --- | --- | --- |
| Frontend | React `^19`, Vite `^6`, React Router `^7`, TypeScript `^5.7` | `frontend/package.json` **[source]**; Vite 6.4.4 build **[runtime]** |
| Backend | PHP 8.3 CLI, PDO MySQL, no Composer | Docker image `php:8.3-cli` **[source]**; `PHP 8.3.35` in container **[runtime]** |
| Database | MariaDB 11.8 / MySQL-compatible schema | `docker-compose.yml` **[source]** |
| Auth | Cookie session + `password_verify` | `backend/app/Auth.php` **[source]** |
| Local ports (this machine) | SPA `5174`, API `8081`, MySQL `3307` | `vite.config.ts`, `docker-compose.override.yml` **[source]** |

Root package: `ethiopian-government-website-platform@0.2.0` — generic EGWP naming still present **[source]**.

---

## 4. Frontend inspection

### Configuration & deps

| Check | Status | Notes |
| --- | --- | --- |
| `node_modules` present | `IMPLEMENTED` **[runtime]** | Install not required for this audit |
| Scripts | `dev` / `build` / `preview` only | **No** `lint` or unit `test` scripts **[source]** |
| Root `npm run typecheck` | `BROKEN` **[runtime]** | Prints `tsc` help / fails — `npm --prefix frontend exec -- tsc --noEmit` does not bind project cwd correctly |
| Frontend `npx tsc --noEmit` | Pass **[runtime]** | exit 0 |
| `npm run build` (frontend) | Pass **[runtime]** | `tsc --noEmit && vite build`; ~100 modules; exit 0 |
| Warning | npm `ignore-workspace` unknown project config | Non-blocking **[runtime]** |

### Routes & UI architecture **[source]**

- Public: home, about, contact, privacy, explore, experiences, stories, plan, itineraries, map teaser, events, resources (`App.tsx`).
- CMS: `/cms/*` dashboard, news, content/pages, services, events, documents, settings, users (`CmsLayout.tsx`).
- Components: `PublicShell`, `HeroMedia`, `LanguageSwitcher`, CMS editors under `components/cms/`.
- Design: custom CSS (`styles/app.css`, `cms.css`) — no component library dependency.

### Translation infrastructure **[source]**

- `LocaleProvider` + catalogs via `@messages` (`i18n.tsx`).
- Locales: `en`, `am`, `om`, `ha`; cookie + `?lang=`.
- UI catalogs exist; Harari/Amharic/Oromo completeness is partial (many strings identical to English) — deep multilingual work is Phase 3, not Phase 1 blocker.

### VisitHarar / tourism UI assumptions **[source]**

- Nav: Explore / Experiences / Plan / Stories / Map (`PublicShell.tsx`).
- Fallbacks: `VisitHarar`, Tourism Commission (`site-template.ts`).
- About page: static Visit Harar copy (`AboutPage.tsx`).
- Hero slides: code-configured, not CMS (`site-template.ts`).
- Brand asset: `frontend/public/brand/visit-harar-logo.webp`.

---

## 5. Backend inspection

### Entry & routing **[source]**

- Front controller: `backend/public/index.php` (CSRF touch + mutate enforce; route table).
- ~46 routes in `backend/routes/api.php` (auth, public entities, CMS CRUD, media, users).
- No Composer / PHPUnit; plain PHP controllers under `backend/app/Controllers/`.

### Auth / session / CSRF / authz **[source]**

| Capability | Status | Location |
| --- | --- | --- |
| Login / logout / session | `IMPLEMENTED` | `AuthController`, `Auth.php` |
| HttpOnly session cookie (hashed token) | `IMPLEMENTED` | `Auth.php` |
| CSRF double-submit | `IMPLEMENTED` | `Csrf.php`, `index.php` (login exempt) |
| Roles admin/editor/viewer | `IMPLEMENTED` | `users.role` ENUM; `ContentPolicy` |
| Editor cannot publish | `IMPLEMENTED` | `enforcePublishingGate` |
| Admin-only user management | `PARTIALLY IMPLEMENTED` | List + update role/active only; **no create user** |
| JSON errors | `IMPLEMENTED` | `helpers.php` |

### Uploads **[source]**

- `POST /cms/media`: editor required; ≤5MB; JPEG/PNG/WebP/GIF; finfo + magic bytes; UUID filenames (`MediaController.php`).
- Serve: `GET /api/media/{file}` with basename + regex guard.

### PHP syntax **[runtime]**

- Host `php`: not installed → host lint `NOT VERIFIED`.
- Container: `php -l` on 21 files → **all OK** (PHP 8.3.35).

---

## 6. Database schema and migration assessment

### Process (documented) **[source]**

- **Not** a formal migration runner (no Flyway/Phinx/Laravel migrations).
- Numbered SQL files under `database/mysql/`:
  - `001_schema.sql` — base tables (auto-applied on fresh Docker volume).
  - `002_seed_placeholder.sql` — commented template (compose mounts this).
  - `002_seed_dev.sql` — **gitignored** local seed with password hashes (present on this machine).
  - `003_cover_image.sql` — `ALTER` add `cover_image` to `news`/`services`.
  - `004`–`006` — VisitHarar content / guide slots / plan JSON.
- Fresh clones get schema + empty placeholder unless operators manually apply seeds/alters.
- **Risk:** `003+` are **not** in `docker-entrypoint-initdb.d` — order is manual; easy to drift.

### Tables **[source]** (+ **[runtime]** confirmed on local Docker)

`institutions`, `users`, `account`, `session`, `pages`, `news`, `services`, `events`, `documents`.

Local live DB also has `cover_image` on `news`/`services` (003 applied previously).

### Relationships / constraints **[source]**

- FKs: `account`/`session` → `users`; content tables → `institutions`.
- Unique `(institution_id, slug)` on content tables.
- Roles: `ENUM('admin','editor','viewer')`.
- Content status: `ENUM('draft','published','archived')`.
- Translations JSON: **`pages` only**.

### Institution config **[source]** + **[runtime]**

- API binds to `EGWP_INSTITUTION_ID` / `config.php` `institution_id`.
- Local institution returns Visit Harar / Tourism Commission branding **[runtime]** (`GET /api/institution` → 200).

### Safe application process

| Question | Answer |
| --- | --- |
| Documented for shared host? | Partial (`README.md` import steps) |
| Additive versioned runner? | `MISSING` |
| Destructive resets in Phase 0? | Not executed (per rules) |
| Production DB touched? | No |

---

## 7. CMS capability matrix

| Module | Frontend | API | DB | CRUD | Authz | Tests | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Pages** | `PARTIALLY` — guide/plan editors | `PARTIALLY` — create **disabled** for freeform pages | `IMPLEMENTED` + translations JSON | Read/Update/Archive; Create forbidden | Editor + publish gate | smoke-cms-all expects create → **fails** | VisitHarar fixed slugs `plan`, `plan-itineraries` (`PagesController::GUIDE_SLUGS`) |
| **News** | `IMPLEMENTED` | `IMPLEMENTED` | `IMPLEMENTED` (+ cover) | Full CMS CRUD + public | Editor + publish gate | smoke-cms-news **PASS** | No content translations; public IA label “Stories” |
| **Events** | `IMPLEMENTED` | `IMPLEMENTED` | `IMPLEMENTED` | Full | Editor + publish gate | Covered by smoke-cms-all (blocked before events) | No translations |
| **Services** | `IMPLEMENTED` | `IMPLEMENTED` | `IMPLEMENTED` (+ cover) | Full | Editor + publish gate | Same | Used as attractions/experiences |
| **Documents** | `IMPLEMENTED` | `IMPLEMENTED` | `IMPLEMENTED` | Full metadata CRUD | Editor + publish gate | Same | `file_url` string only; no binary PDF pipeline |
| **Media** | `PARTIALLY` — image field upload | `IMPLEMENTED` upload + serve | Filesystem `storage/uploads` | Upload + public GET | Editor upload | No dedicated smoke | Images only; no library UI |
| **Users** | `IMPLEMENTED` list/role/active | `PARTIALLY` GET/PUT only | `IMPLEMENTED` | No create/invite/password reset | Admin | smoke-cms-users **PASS** | |
| **Publishing** | Status UI | `enforcePublishingGate` | status ENUM | draft/published/archived | Editors → draft | news smoke verifies | No review queue / audit log |
| **Institution** | Settings page | GET public + PUT CMS | `institutions` | Update profile fields | Editor (update) | API GET used in smokes | |

**UI-only vs real:** CMS screens for news/events/services/documents/users call real APIs **[source]**. Homepage hero is **UI/code-only**, not CMS **[source]**.

---

## 8. Authentication and security assessment

| Area | Status | Notes |
| --- | --- | --- |
| Session auth | `IMPLEMENTED` | Cookie + SHA-256 token hash |
| CSRF | `IMPLEMENTED` | Double-submit; verified via news smoke **[runtime]** |
| Server-side RBAC | `IMPLEMENTED` | Controllers call `ContentPolicy` |
| Publish restriction | `IMPLEMENTED` | Editors cannot publish |
| Last-admin protection | `IMPLEMENTED` | Users smoke **[runtime]** |
| Audit log | `MISSING` | No append-only audit table |
| Configurable permissions | `MISSING` | Fixed 3 roles |
| Review/approval states | `MISSING` | Beyond draft/published/archived |
| Upload hardening | `IMPLEMENTED` | MIME/size/path checks |
| Secrets in report | Avoided | No credential values copied here |
| Dev seed passwords | Risk (ops) | Documented in README; `002_seed_dev.sql` gitignored |

---

## 9. Testing results

| Command | Executed? | Result | Limitations |
| --- | --- | --- | --- |
| `cd frontend && npx tsc --noEmit` | Yes | **PASS** (0) | |
| `cd frontend && npm run build` | Yes | **PASS** (0) | Emits `frontend/dist/` (build artifact; app source unchanged) |
| `npm run typecheck` (root) | Yes | **FAIL** | Script wiring; use frontend `tsc` instead |
| `docker compose exec api … php -l` (21 files) | Yes | **PASS** | Host PHP absent |
| `docker compose config -q` | Yes | **PASS** (0) | |
| `bash scripts/smoke-php-api.sh http://127.0.0.1:8081` | Yes | **FAIL** | Expects `"shortName":"NPSO"`; live seed is Visit Harar |
| `bash scripts/smoke-cms-all.sh …8081` | Yes | **FAIL** | `POST /cms/pages` → 403: *“New pages are disabled…”* (VisitHarar guide-slot policy) |
| `bash scripts/smoke-cms-news.sh …8081` | Yes | **PASS** | Auth, publish gate, CSRF rejection covered |
| `bash scripts/smoke-cms-users.sh …8081` | Yes | **PASS** | |
| Frontend unit/E2E / PHPUnit | No | `MISSING` / not run | No such scripts/frameworks in active stack |
| Production deploy | No | `NOT VERIFIED` | Inspection only |

**Do not treat the suite as green overall.**

---

## 10. Deployment assessment

| Item | Status | Evidence |
| --- | --- | --- |
| API Dockerfile | `IMPLEMENTED` | `backend/docker/Dockerfile` (php:8.3-cli + pdo_mysql) |
| Compose MySQL + API (+ optional nginx `web`) | `IMPLEMENTED` | `docker-compose.yml` |
| Local port override | `IMPLEMENTED` | `docker-compose.override.yml` → host `8081` |
| Nginx SPA + `/api` proxy | `IMPLEMENTED` | `deploy/nginx.conf` |
| Env / config | `PARTIALLY` | `EGWP_*` in compose; `config.example.php`; real `config.php` gitignored |
| Upload volume | `PARTIALLY` | Bind-mount backend; uploads gitignored |
| SSL | Assumed at edge | `session.secure: true` in example; Docker sets secure `0` for local |
| Backup/recovery docs | `MISSING` | No dedicated runbook found |
| Production instructions | `PARTIALLY` | `README.md` shared-host steps |
| CI | `MISSING` | No `.github/workflows` |

Local stack at audit time: MySQL healthy on `3307`, API on `8081` **[runtime]**.

---

## 11. Critical blockers

**Hard blockers for production Bureau release (not all block starting Phase 1):**

1. Product/IA still VisitHarar (identity, nav, about, seeds, logo).
2. Freeform CMS pages disabled — institutional About/org pages need policy change in later phases.
3. No org-structure content model.
4. No audit log / approval workflow (Phases 3–4 scope).
5. Stale smoke tests (NPSO assertion; pages-create assumption).

**Phase 1 start blockers:** None that prevent *beginning* identity/docs/nav work, provided VisitHarar content and fixed-page policy are handled deliberately and seed/deploy files are reviewed before rewrite.

---

## 12. Technical debt

- Root typecheck script broken.
- Pass 4 migration docs outdated vs live code.
- Sitemap paths `/news/`, `/services/` vs SPA `/stories`, `/explore`.
- `002_seed_dev.sql` gitignored → public clones lack runnable admin seed.
- `003+` SQL not auto-applied on new volumes.
- npm `ignore-workspace` warning.
- Package names still `ethiopian-gov-website-*`.
- `api-client.ts` comments still mention stubs/Pass 10.
- No lint/unit test harness on active stack.
- Harari UI strings largely English clones (Phase 3).

---

## 13. Phase 1 readiness verdict

### Verdict: **READY WITH CONDITIONS**

Phase 1 goal (from roadmap): product identity & institutional foundation — docs, Bureau branding, replace tourism-first navigation, review routes/seeds/deploy **without** schema redesign.

### Conditions / smallest safe Phase 1 change set

1. Rewrite `PRODUCT.md` (+ align `README`/`AGENTS` product language) for Bureau office site.
2. Replace VisitHarar fallbacks in `site-template.ts`, logo/brand components, `index.html` titles as needed.
3. Replace public nav in `PublicShell.tsx` with institutional IA (About, News, Culture/Heritage placeholders or existing routes remapped carefully — **avoid deleting CMS entities**).
4. Soften homepage tourism framing (`HomePage.tsx`, message catalogs keys used by home/about/nav) — prefer message-key updates over hardcoded English.
5. **Review but do not wipe** seeds (`002_seed_dev`, `004`–`006`) or `PagesController` guide-slot lock until Phase 2 content model is designed.
6. Update smoke expectations only if Phase 1 changes institution shortName (optional; can defer to Phase 6).
7. Do **not** in Phase 1: new DB tables, approval workflows, multilingual content columns, booking features.

### Reusable assets to keep

Auth/CSRF/RBAC, CMS CRUD for news/events/services/documents, media upload, i18n switcher, Docker/nginx path, institution settings API, design tokens/CSS, BuiltByRaafat credit pattern.

---

## 14. Recommended implementation sequence

Per `docs/IMPLEMENTATION_ROADMAP_V1.md`:

0. **Phase 0 (this audit)** — complete when approved.  
1. **Phase 1** — Product identity & foundation (scoped prompt only).  
2. **Phase 2** — Institutional content architecture + migrations.  
3. **Phases 3 & 4** (may overlap) — Multilingual depth; CMS governance.  
4. **Phase 5** — Public institutional UI/UX polish.  
5. **Phase 6** — QA & production release (fix smoke tests as part of this).

**Next step after approval:** issue a **Phase 1–only** Cursor prompt. Do not feed the entire roadmap as one implementation task.

---

## Appendix A — Local runtime context (non-production)

| Service | Endpoint | Status at audit |
| --- | --- | --- |
| Vite SPA (when started) | http://127.0.0.1:5174/ | Configured; not required for this audit’s pass criteria |
| PHP API | http://127.0.0.1:8081/api/… | Up; institution GET 200 |
| MySQL | localhost:3307 | Healthy |

## Appendix B — Files created by this audit

| Path | Action |
| --- | --- |
| `docs/audits/PHASE_0_BASELINE_AUDIT.md` | **Created** (only permitted modification) |

Pre-existing working tree changes (`README.md`, `docs/IMPLEMENTATION_ROADMAP_V1.md`) were **preserved**.

---

*End of Phase 0 baseline audit.*
