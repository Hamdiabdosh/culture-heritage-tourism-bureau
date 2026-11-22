# Phase 2.3 architecture report — Categories, Media & Culture/Heritage

| | |
| --- | --- |
| **Date** | 2026-11-21 (revisions 2–5: 2026-11-22) |
| **Base commit** | `bcd114e` (revision 1 of this report; revisions 2–5 uncommitted documentation) |
| **Type** | Inspection and planning. Revisions 2–5 are documentation only. No code, schema, scripts or data changed. |
| **Design** | `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md` (revision **5**) |
| **Handoff** | `docs/architecture/PHASE_2_3_IMPLEMENTATION_HANDOFF.md` |
| **Decision closure** | `docs/audits/PHASE_2_3_DECISION_CLOSURE.md` |

**Revision 2** recorded mandatory GD re-encoding, explicit media visibility, a safer backfill and restricted heritage entries.

**Revision 3** added media rights/provenance, corrected backfill classification, restricted-media protection, independent public approval, and a static-image policy.

**Revision 4** recorded REC1–REC3 and D14–D16 as recommendations/pending and split the decision register.

**Revision 5 (Stage 1 decision closure):** REC1–REC3, D1, D2, D5, D9–D16, and D13 are **approved**. D6 and D7 remain Bureau-open. D8 remains deferred. Implementation handoff published. **Coding has not started.**

The inspection findings (§2–§3) are unchanged except where noted.

## 1. Files and systems inspected

| Area | Inspected |
| --- | --- |
| Media | `backend/app/Controllers/MediaController.php`, `frontend/src/components/cms/ImageField.tsx`, `frontend/src/lib/prepare-image-upload.ts`, `backend/storage/uploads/` (7 files) |
| Serving / infra | `docker-compose.yml`, `backend/docker/Dockerfile`, `backend/docker/apache-vhost.conf`, `backend/public/{index.php,router.php,.htaccess}`, `deploy/nginx.conf`, `backend/config/config.example.php`, `.gitignore`, `docs/FULL_MIGRATION_MAP.md` (deploy layout; D13 updated in rev 5) |
| Runtime | PHP modules and upload ini values inside the `api` container (no `gd`, no `exif`, no `imagick`); MariaDB version (11.8.7) |
| Security | `backend/app/Policies/ContentPolicy.php`, `Auth.php`, `Csrf.php`, CSRF enforcement in `index.php`; search for security headers |
| Schema | `001_schema.sql`, `003_cover_image.sql`, `005`–`008` migrations; local DB contents of `news`/`services`/`documents`/`events` category, type, cover and file columns |
| Content code | `NewsController`, `ServicesController`, `DocumentsController` (URL validators), `PagesController` (`GUIDE_SLUGS`), `SitemapController`, `helpers.php` (`is_allowed_document_file_url`, translation helpers from 2.2) |
| Frontend | `App.tsx` routes and catch-all, `PublicShell.tsx` nav, `ResourcesListPage.tsx` (filter/search pattern), `use-page-head.ts`, Phase 2.2 `OrganizationPages.tsx` / `OrganizationPage.tsx` |
| Docs | `PHASE_2_CONTENT_ARCHITECTURE.md`, Phase 2.1 and 2.2 implementation reports, `backend/README.md`; earlier phase briefs for the decision register |
| Git | `git status`, `git log` |

## 2. Current implementation findings

- **Migration numbering** ends at `008` (`007`, `008` each have rollbacks). The next files are `009` and `010`. Docker init auto-loads only `001` and `002_seed_placeholder`.
- **No category model.** `news`, `services` and `documents` have a free-text `category` column; `events` has free-text `type`. Local values are VisitHarar-era and must not be converted into Bureau categories automatically.
- **No media registry.** Images are referenced by URL string. Locally, **no row references `/api/media/…`**. The 7 files in `storage/uploads` are unreferenced test uploads.
- **No rights or provenance metadata** and **no rights audit trail** yet (REC3 will add `media_rights_events`).
- **No image-processing extension** in the API image: `gd`, `exif` and `imagick` are all absent. Mandatory re-encoding requires a Dockerfile change in implementation (WS1).
- **No pagination** on list endpoints; covers often use `alt=""`.
- **Sitemap** still lists `/news` and `/services` (redirects) — outside 2.3 scope except new culture/heritage entries.
- **Auth model is sufficient:** viewer/editor/admin, publish gate, CSRF. No new roles.

## 3. Existing media security assessment

**Already sound:** editor+ CSRF uploads; finfo typing; UUID names; storage outside `backend/public` in Docker; `nosniff` on media responses; SVG/HTML/PDF excluded from image upload.

**Gaps addressed by approved architecture (not yet coded):** weak magic fallback (M1); no registry (M2); public-by-default (M3 → A2/REC1); long cache (M4 → D11); no pixel limits (M5 → D15); quota (M6 → D12); response hardening (M7); nginx body size (M8); shared-host storage (M9 → D13); EXIF only client-side (M10 → A1); arbitrary document URLs (M11 → 2.4); no rights (M12 → A5); no restricted media (M13 → A7); animated images (M14 → D14); no rights audit trail (M15 → REC3).

## 4. Proposed architecture summary

Unchanged in substance from revision 4, with decisions now closed:

- `categories` (D1, D2), `media_assets` + rights (D16), **`media_rights_events` required (REC3)**, `content_entries` + restricted heritage, `people.photo_media_id`.
- Mandatory GD re-encode; static images only (D14); D15 limits; fail closed; storage outside web root (D13).
- Visibility V1–V11 including **REC1** (no legacy public exception).
- Backfill classification; **REC2** go-live hiding + backups/recovery.
- Public `/culture` and `/heritage` APIs and pages; CMS library/picker/categories.
- Migrations `009`/`010` manual; tests as in architecture §9.3.

## 5. Important trade-offs

Same as revision 4. Notable approved costs: unverified legacy covers hide at go-live (REC2); news/services covers need admin approval (REC1); rights actions require reasons and immutable history (REC3); animated images unsupported (D14).

## 6. Outstanding questions (post-closure)

**No longer blocking Stage 2 coding:** REC1–REC3, D14–D16, D1/D2/D5/D9–D13.

**Still open (Bureau / ops — not schema blockers):**

1. **D6** — confirm footer/About-only nav for 2.3 (default in handoff).
2. **D7** — confirm or adjust entry-type vocabulary / intro copy (no fictional content).
3. Who holds rights evidence and completes the production rights file?
4. Production hosting model; live GD/exif; persistent uploads; production media inventory.
5. Who marks heritage records restricted?

*Approved register:* architecture §11.1 (P/A/REC/D closed items).  
*Bureau-open:* D6, D7.  
*Deferred:* D8.

## 7. Cross-document consistency (revision 5)

| Check | Result |
| --- | --- |
| Decision statuses | Architecture §11, handoff, and this report agree |
| GIF / limits / licence | D14–D16 approved; values unchanged |
| REC3 in `009` | Required (not optional) |
| D13 deploy layout | `FULL_MIGRATION_MAP.md` updated |
| Visibility / backfill | Unchanged and consistent |
| Implementation not started | Confirmed — docs only |

## 8. Git status

- HEAD: `bcd114e` — "Document Phase 2.3 categories, media library, and culture/heritage architecture." (in sync with `origin/main` at Stage 1 time).
- Working tree (documentation revisions 2–5, uncommitted), expected files:
  - `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md`
  - `docs/architecture/PHASE_2_3_IMPLEMENTATION_HANDOFF.md` (new)
  - `docs/audits/PHASE_2_3_ARCHITECTURE_REPORT.md`
  - `docs/audits/PHASE_2_3_DECISION_CLOSURE.md` (new)
  - `docs/FULL_MIGRATION_MAP.md`
- Not committed, not pushed. No application code, migrations, scripts or schemas created or changed; no database changes applied; no backfill run. **Stage 2 coding waits on human review of Stage 1.**
