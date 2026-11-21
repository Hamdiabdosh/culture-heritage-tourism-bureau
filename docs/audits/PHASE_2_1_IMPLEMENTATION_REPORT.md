# Phase 2.1 — Implementation Report  
## Institutional Profile Foundation

| Field | Value |
| --- | --- |
| **Date** | 21 November 2026 |
| **Scope** | Institution profile fields end-to-end (SQL → API → CMS → About) |
| **Planning baseline** | `e51990f945f9d943bf6077babab95b313ec28c7d` |
| **Commit status** | **Not committed** (awaiting review per task) |
| **Production** | Migrations **not** applied to production |

---

## 1. Summary

Phase 2.1 extends the existing `institutions` row with nullable mission, vision, history, values, objectives, and profile translations. Public `GET /api/institution` and CMS `PUT /api/cms/institution` expose them. The CMS Site settings form is sectioned for profile editing. The About page renders CMS profile sections only when data exists; no fictional Bureau facts were invented or prepopulated.

Existing identity values (`Visit Harar` / `Harar` in local DB) were left unchanged.

---

## 2. Files changed

### New

| Path | Role |
| --- | --- |
| `database/mysql/007_institution_profile_fields.sql` | Additive migration |
| `database/mysql/007_institution_profile_fields.rollback.sql` | Documented rollback |
| `scripts/smoke-institution-profile.sh` | API/auth/validation/persistence smoke |
| `docs/audits/PHASE_2_1_IMPLEMENTATION_REPORT.md` | This report |

### Modified

| Path | Role |
| --- | --- |
| `backend/app/Controllers/InstitutionController.php` | Profile shape, validation, strip_tags, CMS update |
| `frontend/src/lib/api-client.ts` | `Institution` / `InstitutionInput` types |
| `frontend/src/pages/cms/InstitutionSettingsPage.tsx` | Sectioned CMS form + unsaved guard |
| `frontend/src/pages/AboutPage.tsx` | Conditional profile sections + locale overrides |
| `frontend/src/styles/cms.css` | Fieldset styles |
| `frontend/src/styles/app.css` | About profile typography |
| `messages/{en,am,om,ha}.json` | CMS + About labels |
| `docs/architecture/PHASE_2_CONTENT_ARCHITECTURE.md` | Approved decisions + sequence + status |
| `docs/audits/PHASE_2_ARCHITECTURE_REPORT.md` | Commit + decisions alignment |

---

## 3. Migration details

**File:** `database/mysql/007_institution_profile_fields.sql`

| Column | Type | Notes |
| --- | --- | --- |
| `mission` | `TEXT NULL` | Plain text |
| `vision` | `TEXT NULL` | Plain text |
| `history` | `MEDIUMTEXT NULL` | Longer narrative |
| `values_json` | `JSON NULL` | Array of strings |
| `objectives_json` | `JSON NULL` | Array of strings |
| `profile_translations` | `JSON NULL` | `{ am\|om\|ha: { mission, vision, history, values, objectives } }` |

**Apply (local/staging only):**

```bash
docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/007_institution_profile_fields.sql
```

**Rollback:** `007_institution_profile_fields.rollback.sql` drops only these six columns.

**Fresh Docker volumes:** still only auto-load `001` + `002_seed_placeholder` via `docker-entrypoint-initdb.d`. Like `003`–`006`, `007` is applied manually to existing DBs (no migration runner in this slice).

**Verified locally:** columns present; existing institution `id` / `name` / `short_name` unchanged; profile fields null/empty after apply.

---

## 4. API changes

| Endpoint | Change |
| --- | --- |
| `GET /api/institution` | Adds `mission`, `vision`, `history`, `values[]`, `objectives[]`, `profileTranslations{}` |
| `PUT /api/cms/institution` | Accepts same fields; requires editor+ + CSRF; never accepts client `id` |

Validation highlights:

- Required: `name`, `shortName`
- `values` / `objectives`: JSON array of strings only
- `profileTranslations`: keys `am` \| `om` \| `ha` only; known field keys only
- All text run through `strip_tags` + control-char scrub + length caps
- Empty profile translations encode as `{}` (not `[]`)

Authorization: `ContentPolicy::requireEditor()` unchanged. Unauthenticated PUT → 403. Editor and admin can update.

---

## 5. CMS changes

`/cms/settings` form sections:

1. Institutional identity (existing)
2. Mission and vision
3. History
4. Core values (one item per line)
5. Institutional objectives (one item per line)
6. Translations (am / om / ha)

Behaviors: loading/saving states, validation error display, success message, `beforeunload` when dirty, viewer read-only message preserved. No new permissions model. Placeholders remind editors to leave blank until confirmed — no invented content.

---

## 6. Public website changes

`AboutPage`:

- Keeps existing Phase 1 message bodies (`about.body1`–`body3`)
- Appends mission / vision / history / values / objectives **only when non-empty**
- Locale `am`/`om`/`ha` prefers `profileTranslations[locale]` with English-field fallback
- Institution fetch failure still yields sidebar fallbacks via `siteTemplate`; page does not crash
- Contact sidebar unchanged

---

## 7. Security review

| Check | Result |
| --- | --- |
| CMS write authz | Editor+ only; unauth PUT 403 (smoke) |
| CSRF | Existing double-submit cookie + `X-CSRF-Token` on PUT |
| Public fields | Same institution public shape + new profile fields only |
| HTML injection | `strip_tags` on write; React text nodes on About (no `dangerouslySetInnerHTML`) |
| SQL | Parameterized PDO statements; institution id from `Db::institutionId()` |
| Institution scoping | Single configured institution id; client cannot change id |
| Sessions | Untouched |

---

## 8. Tests and results

| Check | Result |
| --- | --- |
| `scripts/smoke-institution-profile.sh http://127.0.0.1:8081` | **PASS** — public shape, authz, invalid lang/values, strip_tags, persistence, restore, editor update |
| `cd frontend && npx tsc --noEmit` | **PASS** |
| `cd frontend && npm run build` | **PASS** (`tsc --noEmit && vite build`) |
| Docker `php -l` on `app/**/*.php` | **PASS** (host PHP binary unavailable; linted inside `api` container) |
| Root `npm run typecheck` | **FAIL / broken script** — `npm --prefix frontend exec -- tsc --noEmit` prints `tsc` help instead of typechecking (pre-existing script quirk). Equivalent check via frontend `tsc`/`build` passed. |
| `scripts/smoke-php-api.sh` | **FAIL (pre-existing)** — expects `"shortName":"NPSO"`; local DB is VisitHarar/`Harar`. Not introduced by 2.1. |
| Viewer-deny path | **SKIP** — seed has admin + editor only (no viewer user). Unauth deny covered. |
| Production migration | **Not run** (by design) |

Local stack used: API `:8081`, MySQL `:3307`, Vite `:5174`. About route HTTP 200 on Vite.

---

## 9. Known issues / follow-ups

1. Local DB institution identity remains VisitHarar — intentional until Phase 2.6 after Bureau verification.
2. Docker init does not auto-apply `007` on fresh volumes (same pattern as `003`–`006`).
3. Root `npm run typecheck` / legacy smoke NPSO expectation remain out of 2.1 scope.
4. Not committed / not pushed — review first.
5. Later slices (2.2+) intentionally deferred: departments, leadership, culture/heritage modules, `/news`, PDF uploads, freeform pages, audit log.

---

## 10. Git status (at report time)

```
HEAD: e51990f945f9d943bf6077babab95b313ec28c7d
Branch: main...origin/main

Modified:
  backend/app/Controllers/InstitutionController.php
  docs/architecture/PHASE_2_CONTENT_ARCHITECTURE.md
  docs/audits/PHASE_2_ARCHITECTURE_REPORT.md
  frontend/src/lib/api-client.ts
  frontend/src/pages/AboutPage.tsx
  frontend/src/pages/cms/InstitutionSettingsPage.tsx
  frontend/src/styles/app.css
  frontend/src/styles/cms.css
  messages/am.json messages/en.json messages/ha.json messages/om.json

Untracked:
  database/mysql/007_institution_profile_fields.sql
  database/mysql/007_institution_profile_fields.rollback.sql
  scripts/smoke-institution-profile.sh
  docs/audits/PHASE_2_1_IMPLEMENTATION_REPORT.md
```

No commit or push performed.

---

## 11. Completion condition

Profile fields work end-to-end on the local disposable stack: migration applied, API returns/updates fields, CMS form saves them, About hides empty sections and shows saved content, existing identity preserved, smoke + frontend build verified. Ready for human review and commit when approved.
