# Phase 2.2 implementation report — Departments & Leadership

| | |
| --- | --- |
| **Date** | 2026-11-21 |
| **Base commit** | `c595921` (Phase 2.1) |
| **State** | Implemented and verified locally. **Not committed, not pushed.** Migration applied to the local dev DB only. |
| **Next phase** | 2.3 not started — waiting for review. |

## 1. Summary

The Bureau can now manage departments and leadership profiles in the CMS. Published records appear on a new public `/organization` page in all four languages. No departments or people are seeded: both tables are empty until the Bureau enters verified data, and the public page shows a "details coming soon" state with a contact link until then.

Out of scope and untouched: culture/heritage modules, `content_entries`, categories, `media_assets`, news/events/services/documents changes, PDF upload, page policy, audit log, RBAC, institution identity, and legacy VisitHarar content.

## 2. Database — `database/mysql/008_org_structure.sql`

Two new tables, both scoped by `institution_id` with CHAR(36) UUID keys, `status ENUM('draft','published','archived')`, `sort_order`, and a `translations` JSON column checked to be an object.

| Table | Key columns | Constraints |
| --- | --- | --- |
| `departments` | `slug`, `name`, `summary`, `description` | UNIQUE `(institution_id, slug)`; FK → `institutions` CASCADE |
| `people` | `department_id` NULL, `slug`, `full_name`, `title`, `bio`, `email`, `phone`, `is_leadership` | UNIQUE `(institution_id, slug)`; composite FK `(institution_id, department_id)` → `departments(institution_id, id)` **ON DELETE RESTRICT** |

The composite FK means the database itself refuses to link a person to another institution's department, and refuses a hard delete of a department that people still reference. The migration uses `IF NOT EXISTS` and is safe to re-run. Rollback: `008_org_structure.rollback.sql` drops only these two tables (back up first).

**Deferred:** `photo_media_id`. Photos arrive with `media_assets` in 2.3; adding a `photo_url` column now would create a second path to migrate later.

## 3. API

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/departments?lang=` | Public, published only, ordered by `sort_order`, name |
| GET | `/api/departments/{slug}?lang=` | Public, published only |
| GET | `/api/leadership?lang=` | Public, published + `is_leadership`, ordered |
| GET | `/api/people/{slug}?lang=` | Public, published only |
| GET | `/api/cms/departments`, `/api/cms/departments/{id}` | viewer+ |
| POST / PUT | `/api/cms/departments[/{id}]` | editor+, CSRF |
| DELETE | `/api/cms/departments/{id}` | editor+, CSRF — soft archive |
| GET | `/api/cms/people`, `/api/cms/people/{id}` | viewer+ |
| POST / PUT | `/api/cms/people[/{id}]` | editor+, CSRF |
| DELETE | `/api/cms/people/{id}` | editor+, CSRF — soft archive |

Rules:

- **Publish gate unchanged:** an editor's "published" becomes draft, and an editor editing published content returns it to draft (same `ContentPolicy::enforcePublishingGate` as other content).
- Public responses omit `id`, `status`, `institution_id` and the raw translations. Each item carries `language` and `usedFallback` (true if any non-empty English field had no translation in the requested language).
- A person's department appears publicly only when that department is published.
- Archiving a department returns **409** while non-archived people reference it. Linking a person to an archived department returns 400.
- Duplicate slug → 409. Input is validated and stripped of HTML/control characters, with length limits. Email is checked with `filter_var` and phone with a character allowlist. Translations accept only `am`/`om`/`ha` and known fields.
- `full_name` is not translated (names are shown as entered); `title` and `bio` are. Department name, summary and description are translated.
- `/organization` was added to the sitemap.

## 4. CMS

A new **Organization** group in the CMS sidebar contains **Departments** (`/cms/departments`) and **Leadership** (`/cms/people`). Each has a list page and a create/edit page (`OrganizationPages.tsx`) with:

- an auto-generated slug (until edited by hand), status, and display order
- for people: a department picker (non-archived departments) and a "Show in leadership list" checkbox
- Amharic, Afaan Oromo and Harari translation fields
- an unsaved-changes guard, an Archive button with confirmation, and visible API errors (for example the 409 archive rule)
- a read-only view for viewers

These are dedicated pages rather than the generic `EntityEditPage`, so the fixed guide-page logic there is untouched.

## 5. Public page — `/organization`

Leadership cards (department, name, title, bio, email, phone) followed by department cards (name, summary, description). The page refetches when the language changes, shows a notice when some text falls back to English, and has loading, error and empty states. Links were added to the primary nav (after About), the mobile menu and the footer. SEO uses `usePageHead` with a new `seo.organizationDescription`.

**Header fix:** with seven primary links, the desktop nav overflowed between 800px and about 1100px. The header now switches to the menu button below 1100px (`app.css`); the rest of the layout keeps its 800px breakpoint.

## 6. Localization

New keys in all four catalogs: `navigation.organization`, `seo.organizationDescription`, `organization.*`, `cms.navigation.{organization,departments,leadership}`, `cms.org.*`. The catalog diff is additions only (the 12 removed lines are existing last keys gaining a trailing comma).

- `en`, `am` and `om` are translated.
- **`ha` uses the English strings**, matching the current state of the Harari catalog. A native speaker needs to review them.
- These are UI labels only. Department and person content is translated per record in the CMS.

## 7. Security

- All CMS writes require a session, the editor role, and a CSRF token (enforced before routing).
- Viewers can read the CMS but cannot write (403).
- Every query is scoped to `Db::institutionId()`. Another institution's records return 404 in the CMS, and linking to them returns 400. The composite FK enforces the same rule at the DB level.
- Drafts and archived records never appear in public responses, including as a person's department.
- All values are bound with prepared statements, and text is plain text (React escapes it on output).

## 8. Test results (local, 2026-11-21)

| Check | Result |
| --- | --- |
| PHP lint (`app/`, `routes/`, `public/` in the `api` container) | ✅ 0 failures |
| `cd frontend && npx tsc --noEmit` | ✅ |
| `cd frontend && npm run build` | ✅ |
| `python3 scripts/smoke-org-structure.py` (new) | ✅ 86/86 — auth, CSRF, viewer 403, validation, duplicates, publish gate, public visibility, ordering, locale fallback, hidden fields, cross-institution isolation, archive 409 rule |
| `bash scripts/test-migration-008.sh` (new, disposable DB) | ✅ apply, re-apply, constraint rejections (cross-institution link, referenced delete, duplicate slug, bad status, non-object and malformed JSON), rollback leaves 007 intact |
| `bash scripts/smoke-institution-profile.sh` (2.1 regression) | ✅ |
| `bash scripts/smoke-cms-news.sh http://127.0.0.1:8081` | ✅ |
| `bash scripts/smoke-cms-users.sh http://127.0.0.1:8081` | ✅ |
| `bash scripts/smoke-php-api.sh http://127.0.0.1:8081` | ❌ **pre-existing** — expects `"shortName":"NPSO"`; the local DB has `Harar` |
| `bash scripts/smoke-cms-all.sh http://127.0.0.1:8081` | ❌ **pre-existing** — tries to create a freeform page; `PagesController` (unchanged since the initial commit) returns 403 by fixed guide-page policy |
| Browser check (admin) | ✅ empty state, then CMS create of a department and a leader, then cards on `/organization` in English and Amharic with the fallback notice |

The old smoke scripts default to port 8080; the local API is on 8081, so pass the base URL. The two failing scripts were not modified. All test records were removed afterwards: the dev DB has 0 departments, 0 people, 1 institution and 2 users.

## 9. Limitations and deferred items

- Person photos wait for `media_assets` (2.3).
- There are no public detail pages; the `/{slug}` endpoints exist for later use.
- No viewer account is seeded; the smoke test creates a temporary one.
- Root `npm run typecheck` prints tsc help instead of type-checking (pre-existing); use `cd frontend && npx tsc --noEmit`.
- Harari UI strings need native review.
- The site header still shows the existing institution data ("Visit Harar") from the DB. Changing it is the separate identity step (2.6).

## 10. Migration instructions

**Existing database** (back up first):

```bash
docker compose exec -T mysql mariadb -uegwp -pegwp egwp < database/mysql/008_org_structure.sql
```

**Fresh Docker database:** init only auto-loads `001` and `002_seed_placeholder`. Apply `007_institution_profile_fields.sql`, then `008_org_structure.sql`, manually in that order.

**Rollback:** `008_org_structure.rollback.sql` (drops both tables and their data).

Not applied to any production database.

## 11. Git status

HEAD is `c595921`. Nothing committed or pushed. There were no unrelated working-tree changes.

Modified: `backend/app/Controllers/SitemapController.php`, `backend/app/helpers.php`, `backend/routes/api.php`, `docs/architecture/PHASE_2_CONTENT_ARCHITECTURE.md`, `frontend/src/App.tsx`, `frontend/src/components/PublicShell.tsx`, `frontend/src/components/cms/CmsLayout.tsx`, `frontend/src/lib/api-client.ts`, `frontend/src/styles/app.css`, `frontend/src/styles/cms.css`, `messages/{am,en,ha,om}.json`.

New: `backend/app/Controllers/DepartmentsController.php`, `backend/app/Controllers/PeopleController.php`, `database/mysql/008_org_structure.sql`, `database/mysql/008_org_structure.rollback.sql`, `frontend/src/pages/OrganizationPage.tsx`, `frontend/src/pages/cms/OrganizationPages.tsx`, `scripts/smoke-org-structure.py`, `scripts/test-migration-008.sh`, `docs/audits/PHASE_2_2_IMPLEMENTATION_REPORT.md`.
