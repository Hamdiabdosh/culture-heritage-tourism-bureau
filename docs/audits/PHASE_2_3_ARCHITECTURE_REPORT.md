# Phase 2.3 architecture report — Categories, Media & Culture/Heritage

| | |
| --- | --- |
| **Date** | 2026-11-21 |
| **Base commit** | `385efaa` (Phase 2.2, pushed) |
| **Type** | Inspection and planning only. No code, schema or data changed. |
| **Design** | `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md` |

## 1. Files and systems inspected

| Area | Inspected |
| --- | --- |
| Media | `backend/app/Controllers/MediaController.php`, `frontend/src/components/cms/ImageField.tsx`, `frontend/src/lib/prepare-image-upload.ts`, `backend/storage/uploads/` (7 files) |
| Serving / infra | `docker-compose.yml`, `backend/docker/Dockerfile`, `backend/docker/apache-vhost.conf`, `backend/public/{index.php,router.php,.htaccess}`, `deploy/nginx.conf`, `backend/config/config.example.php`, `.gitignore`, `docs/FULL_MIGRATION_MAP.md` (deploy layout) |
| Runtime | PHP modules and upload ini values inside the `api` container; MariaDB version (11.8.7) |
| Security | `backend/app/Policies/ContentPolicy.php`, `Auth.php`, `Csrf.php`, CSRF enforcement in `index.php`; search for security headers |
| Schema | `001_schema.sql`, `003_cover_image.sql`, `005`–`008` migrations; local DB contents of `news`/`services`/`documents`/`events` category, type, cover and file columns |
| Content code | `NewsController`, `ServicesController`, `DocumentsController` (URL validators), `PagesController` (`GUIDE_SLUGS`), `SitemapController`, `helpers.php` (`is_allowed_document_file_url`, translation helpers from 2.2) |
| Frontend | `App.tsx` routes and catch-all, `PublicShell.tsx` nav, `ResourcesListPage.tsx` (filter/search pattern), `use-page-head.ts`, Phase 2.2 `OrganizationPages.tsx` / `OrganizationPage.tsx` |
| Docs | `PHASE_2_CONTENT_ARCHITECTURE.md`, Phase 2.1 and 2.2 implementation reports, `backend/README.md` |
| Git | `git status`, `git log` |

## 2. Current implementation findings

- **Migration numbering** ends at `008` (`007`, `008` each have rollbacks). The next files are `009` and `010`. Docker init auto-loads only `001` and `002_seed_placeholder`.
- **No category model.** `news`, `services` and `documents` have a free-text `category` column; `events` has free-text `type`. Local values are VisitHarar-era ("Mosques & Shrines", "Experience · Food & Markets", "Coffee" …) and must not be converted into Bureau categories automatically.
- **No media registry.** Images are referenced by URL string:
  - `news.cover_image` and `services.cover_image` hold `VARCHAR(512)` URLs (`/…` or `https://…`).
  - `documents.file_url` accepts any `http(s)` URL or root-relative path.
  - Locally, **no row references `/api/media/…`**; the 7 files in `storage/uploads` are unreferenced test uploads.
  - The one document link (`/files/visitor-etiquette-card.pdf`) points to a file that doesn't exist in `frontend/public/` (a broken legacy link, not fixed here).
- **No pagination** on any list endpoint; lists return everything and pages filter client-side (`ResourcesListPage`).
- **Covers are rendered with `alt=""`** in news, services and the home page (an accessibility gap for 2.4).
- **Sitemap** lists `/news` and `/services`, which the SPA redirects to `/stories` and `/explore` (pre-existing, outside 2.3 scope).
- **`usePageHead`** has no image parameter, so there's no `og:image`.
- **No route conflicts:** no page slug `culture`/`heritage` exists, and `GUIDE_SLUGS` = `plan`, `plan-itineraries`. New routes must go before the `/:slug` catch-all.
- **Auth model is sufficient:** viewer/editor/admin, the publish gate in `ContentPolicy`, and double-submit CSRF before routing. No new roles are needed.

## 3. Existing media security assessment

**What is already done well**

- **Upload access:** uploads require editor+ and a CSRF token.
- **Type checking:** `finfo` detects the type from content, and the stored extension comes from that detected type, not the client filename.
- **File naming:** files get UUID names. The public route checks `basename()` plus a strict regex, so path traversal is not possible.
- **Storage location:** `backend/storage/uploads` is outside the PHP document root (`backend/public`), and `router.php` only serves files that exist under `public/`. Uploads can't be executed or fetched directly in the Docker setup.
- **Response headers:** media responses send an explicit `Content-Type` from a fixed map and `X-Content-Type-Options: nosniff`.
- **Excluded types:** SVG, HTML and PDF are not accepted.

**Actual weaknesses**

| # | Finding | Impact |
| --- | --- | --- |
| M1 | **Magic-byte fallback weakens type checking.** If `finfo` returns a non-image type, the code accepts the file anyway when its first 3–12 bytes look like JPEG/PNG/GIF/WebP. No decode check (`getimagesize`) is done. | Polyglot files (image header + HTML/JS/PHP payload) are accepted. Neutralised today only by `nosniff` and the fixed Content-Type. |
| M2 | **No registry.** Files have no owner, institution, uploader, alt text or status. | Can't scope by institution, audit who uploaded what, archive, or find orphans. Every upload is public forever. |
| M3 | **Everything is public, immediately.** A cover attached to a draft is reachable by URL. | Pre-publication leakage if a URL is shared (UUIDs make guessing impractical). |
| M4 | **1-year `immutable` caching.** | A wrongly uploaded image can't be effectively withdrawn from caches. |
| M5 | **No pixel-dimension limit**; only bytes (5 MB app, 8 MB PHP). | Decompression-bomb images reach browsers and any future server processing. |
| M6 | **No quota or rate limit** on uploads, and no orphan cleanup. | An editor account (or stolen session) can fill the disk. |
| M7 | **No CSP / sandbox / `Content-Disposition` on media responses**, and no security headers anywhere (API or `deploy/nginx.conf`). | Defence in depth missing; matters once PDFs or any document type arrive. |
| M8 | **`deploy/nginx.conf` has no `client_max_body_size`** (nginx default 1 MB). | Uploads over 1 MB fail with 413 behind the `web` profile even though PHP allows 8 MB. A functional bug, not a vulnerability. |
| M9 | **Shared-hosting layout puts `storage/` inside `public_html/`** (`docs/FULL_MIGRATION_MAP.md`), with no deny rule shipped. | On such a host, uploads would be directly web-served, bypassing the controller, and future private documents would be public. |
| M10 | **EXIF metadata (including GPS) is only stripped client-side** (canvas re-encode in `prepare-image-upload.ts`). The server accepts originals from any other client. | Location metadata of heritage sites or people can leak. No GD/Imagick is installed in the API image to re-encode server-side. |
| M11 | **`documents.file_url` accepts arbitrary external `http://` URLs.** | Mixed content and off-site links presented as official Bureau documents. Addressed by the registry in 2.4. |

There was no evidence of executable uploads or traversal; the existing design is sound at its core. The gaps are registry, visibility, validation depth and deployment hardening.

## 4. Proposed architecture summary

- **`categories`:**
  - One table with a `scope` enum covering culture, heritage, news, events, documents, services and general.
  - Slugs are unique per `(institution, scope)`, with translated names.
  - Uses an `active` flag. Editors create categories inactive and admins activate them.
  - Deactivating keeps references; no hard delete.
  - One category per item.
- **`media_assets`:**
  - A registry holding verified MIME, size, sha256, dimensions, alt/caption/credit with translations, `public`/`cms_only` visibility, `active`/`archived` status, and the uploader.
  - Files stay outside the web root. Public files are served via `/api/media/{key}` only after a registry check; private files via an authenticated CMS route.
  - Archiving is blocked while published content uses the asset.
  - A backfill CLI registers existing files.
- **`content_entries`:**
  - One table for culture and heritage, with a `domain` that is fixed after create and an `entry_type` validated against a PHP vocabulary.
  - Optional category (scope must match the domain), department and cover image.
  - Location and period labels, featured flag and order, the existing publish gate, `published_at`, and JSON translations.
- **`people.photo_media_id`:** completes the 2.2 deferral.
- **APIs:**
  - Public: `/api/categories`, `/api/culture[/{slug}]`, `/api/heritage[/{slug}]`, with type/category/search filters and `limit`/`offset` pagination.
  - CMS: CRUD for categories, media and content entries using existing policies.
- **CMS:** Culture and Heritage sections sharing one editor, a Media library, a reusable media picker, and a Categories screen.
- **Public pages:** `/culture`, `/heritage` and their detail pages, with empty states (no seeded content), SEO, sitemap entries, and footer/About links. The primary nav change waits for 2.7.
- **Migrations:** `009_categories_media.sql`, `010_content_entries.sql`, both with rollbacks, plus disposable-DB migration tests and a smoke test with hostile upload cases.

## 5. Important trade-offs

| Choice | Gain | Cost |
| --- | --- | --- |
| One category per item | Simple FK, simple filters and UI | Items can't appear under two categories; `entry_type` covers the second axis |
| `entry_type` in PHP, not ENUM/table | Vocabulary changes need no migration | DB doesn't enforce it; covered by validation and tests |
| Explicit visibility instead of derived | No reference counting; predictable | Editors must think about public vs CMS-only; the UI defaults images to public in content flows |
| Registry-required serving | Real access control, archiving and scoping | Requires a backfill before deploy; mis-ordering breaks existing covers |
| Strict headers vs GD re-encode | Headers need no new extension | Payload bytes remain stored; only re-encode removes them and strips EXIF (D3) |
| Single cover, no gallery | Smaller 2.3 | Heritage sites with many photos wait for an additive gallery table |
| Server-side `LIKE` search | Works across translations, no new infra | Not relevance-ranked; FULLTEXT later if volume grows |
| Culture/Heritage as two CMS mounts of one component | Clear for editors, one codebase | Two nav items instead of one |

## 6. Outstanding questions

1. Approve decisions D1–D13 in §11 of the architecture document. The ones that most change implementation are **D3** (GD), **D5** (gallery) and **D6** (navigation timing).
2. Should the Bureau confirm or adjust the entry-type vocabulary (D7), and the culture/heritage intro copy? No content will be invented.
3. Where will production be hosted (VPS/Docker vs shared hosting)? This determines how storage placement (M9 / D13) is applied and whether GD is available.
4. Do existing production uploads exist? If so, the backfill must be run (and verified) before the new media controller is deployed.
5. Should heritage records that the Bureau considers sensitive (exact locations of vulnerable sites or objects) be restricted? The design supports `cms_only` media and optional location text, but there is no per-entry "restricted" flag.
6. Who at the Bureau holds image rights and credits? The `credit` field exists, but a rights/licence policy is a Bureau decision.

## 7. Git status

- HEAD: `385efaa` — "Add Phase 2.2 departments and leadership across schema, API, CMS, and /organization page." (in sync with `origin/main` after the last push).
- Working tree before this task: clean.
- This task adds two untracked files only:
  - `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md`
  - `docs/audits/PHASE_2_3_ARCHITECTURE_REPORT.md`
- Not committed, not pushed. No migrations applied; no data changed. Phase 2.3 implementation, 2.4 and 2.5 have not been started.
