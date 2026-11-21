# Phase 2 — Architecture Report  
## Institutional Content Architecture (Planning Only)

| Field | Value |
| --- | --- |
| **Date** | 21 November 2026 |
| **Mode** | Planning / inspection only — **no application or schema changes** |
| **Architecture doc** | [`docs/architecture/PHASE_2_CONTENT_ARCHITECTURE.md`](../architecture/PHASE_2_CONTENT_ARCHITECTURE.md) |
| **Git HEAD** | `7a36129` (Phase 1 on `main`) |

---

## 1. Files inspected

| Area | Paths |
| --- | --- |
| Roadmap / audits | `docs/IMPLEMENTATION_ROADMAP_V1.md`, `docs/audits/PHASE_0_BASELINE_AUDIT.md`, `docs/audits/PHASE_1_IMPLEMENTATION_REPORT.md` |
| Product / agents | `PRODUCT.md`, `README.md`, `AGENTS.md` |
| Schema / SQL | `database/mysql/001_schema.sql` … `006_*.sql`, `003_cover_image.sql` |
| API | `backend/routes/api.php`, `InstitutionController`, `PagesController`, `NewsController`, `EventsController`, `ServicesController`, `DocumentsController`, `MediaController`, `ContentPolicy`, `Auth.php` |
| Frontend | `App.tsx`, `PublicShell.tsx`, `HomePage.tsx`, `AboutPage.tsx`, CMS pages under `pages/cms/`, `content-kind.ts`, `site-template.ts`, `api-client.ts` |
| i18n | `messages/en.json` (and presence of am/om/ha), `i18n.tsx` pattern from prior audits |

---

## 2. Existing functionality discovered

### Working and reusable

- Cookie auth, CSRF, editor publish gate.
- Full CMS CRUD for **news, events, services, documents** (metadata).
- Institution contact/name settings (`GET/PUT institution`).
- Image upload pipeline (`MediaController`) with MIME/size guards.
- Pages translation JSON + `?lang=` resolution (template for other entities).
- Draft / published / archived lifecycle.
- Phase 1 institutional chrome (nav, fallbacks, homepage framing).

### Gaps vs Bureau institutional needs

| Need | Current state |
| --- | --- |
| Mission / vision / history / values | **Missing** on `institutions`; About is static message copy |
| Org chart / directorates / leadership | **Missing** tables & APIs |
| Culture & Heritage archive | **Missing**; tourism `services` heuristic is not a substitute |
| News kinds (announcement vs press) | Free-text `category` only |
| Event end dates / kinds | Partial (`event_date`, free-text `type`) |
| Secure PDF/document binary storage | **Missing** (`file_url` string) |
| Translations on news/events/docs/services | **Missing** |
| Freeform CMS pages | **Blocked** (`PagesController` VisitHarar guide-slot policy) |
| Migration runner | **Missing** (manual numbered SQL) |
| DB institution identity | Likely still VisitHarar seed until CMS update |

### Confirmed constraints from code

- `PagesController::cmsCreate` always 403 with guide-slot message.
- `GUIDE_SLUGS = ['plan','plan-itineraries']`.
- Services public UX historically split by category prefix `Experience` (`content-kind.ts`).
- Documents validate `fileUrl` via allowlist helper — not a file store.

---

## 3. Architecture recommendations (summary)

1. **Extend** `institutions` for profile narrative fields + translations.
2. **Add** `departments` + `people` for organization/leadership (data supplied later by Bureau).
3. **Add** one `content_entries` table with `domain` ∈ {culture, heritage} instead of many micro-tables.
4. **Add** `categories` + `media_assets` for shared taxonomy and file registry.
5. **Extend** news, events, documents, services with `kind`, optional `department_id`, `translations`, and media FKs.
6. **Discriminator** on services (`bureau_service` vs legacy attraction/experience) — preserve VisitHarar rows.
7. **Unlock** page create; archive VisitHarar plan pages — do not delete history.
8. **Public routes:** `/organization`, `/culture`, `/heritage`, `/services` (bureau), keep news/events/publications/contact.
9. **Migrations:** additive `007`–`011` SQL files; backup-first; rollbacks drop only new objects.
10. Defer RBAC/audit log to Phase 4; translation depth UX to Phase 3 (schema hooks in Phase 2).

Full detail, ER diagram, and field lists: **architecture doc §3–11**.

---

## 4. Important risks

| Risk | Severity | Note |
| --- | --- | --- |
| Blind seed overwrite of `institutions` | High | Use CMS + verified copy; backup row first |
| Deleting VisitHarar content | High | Forbidden — archive/reclassify only |
| Shipping Culture nav before content model | Medium | Wait for implementation of entries API |
| Manual SQL drift across environments | Medium | Document apply order; smoke after migrate |
| Treating attractions as “public services” | Medium | Require `kind` filter |
| PDF upload without hardening | Medium | Prefer Phase 2 metadata + Phase 4 binary hardening unless approved early |
| Scope creep into governance | Medium | Keep approval/audit out of Phase 2 build |

---

## 5. Proposed implementation phases (post-approval)

| Slice | Deliverable |
| --- | --- |
| **2.1** | Institution profile schema + API/CMS fields |
| **2.2** | Departments + people + `/organization` |
| **2.3** | Categories, media registry, content_entries + culture/heritage |
| **2.4** | Extend news/events/documents/services |
| **2.5** | Unlock pages; archive guide slots |
| **2.6** | Controlled Bureau identity data update |
| **2.7** | Enable remaining primary nav items |
| **2.8** | Updated smokes + Phase 2 implementation report |

---

## 6. Questions requiring a decision

See architecture doc **§13**. Highest priority:

1. Confirm **single `content_entries` table** for Culture + Heritage.
2. About = **institution fields**, **CMS pages**, or both?
3. Rename `/stories` → `/news`?
4. Include **PDF binary upload** in Phase 2 implementation or later?
5. Timing/owner for **live institution row** Bureau rename.
6. Retention policy for **legacy attraction/experience** rows.

---

## 7. Working tree / git note

- Planning artifacts created only:
  - `docs/architecture/PHASE_2_CONTENT_ARCHITECTURE.md`
  - `docs/audits/PHASE_2_ARCHITECTURE_REPORT.md`
- **No** application code, schema, seed, or dependency changes.
- **No** commit/push performed in this task.
- Pre-existing clean `main` at `7a36129` preserved aside from these new untracked docs.

---

## 8. Completion status

| Criterion | Status |
| --- | --- |
| Architecture based on actual repo | Yes |
| Domains A–H addressed | Yes |
| ER + schema + i18n + CMS/API + routes + migration + security | Yes |
| Implementation deferred pending approval | Yes |

**Stop here.** Do not begin Phase 2 implementation until explicit approval of the architecture decisions above.

---

*End of Phase 2 architecture report.*
