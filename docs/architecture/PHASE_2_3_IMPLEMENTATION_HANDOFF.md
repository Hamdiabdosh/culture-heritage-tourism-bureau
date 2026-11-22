# Phase 2.3 — Implementation handoff

| | |
| --- | --- |
| **Status** | Stage 1 complete; **WS1 implemented locally** (awaiting review). WS2+ not started. |
| **Date** | 2026-11-22 |
| **Base commit** | `bcd114e` (verify before coding) |
| **Authoritative design** | `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md` (revision 5) |
| **Findings / audit** | `docs/audits/PHASE_2_3_ARCHITECTURE_REPORT.md` |
| **Parent plan** | `docs/architecture/PHASE_2_CONTENT_ARCHITECTURE.md` |

This handoff is the implementation contract for Phase 2.3. Do not redesign approved architecture. Do not start 2.4 or 2.5. Do not commit or push without explicit authorization. Do not run production migrations, backfill, or deploys.

---

## 1. Approved decisions (implement as written)

### Prior approvals (unchanged)

| ID | Summary |
| --- | --- |
| P1–P7 | Shared `content_entries`; translations JSON; PDF deferred; preserve legacy; no general RBAC/audit/approval product; manual `009`/`010`; public `/culture` and `/heritage` routes |
| A1–A8 | GD re-encode + fail closed; `cms_only` default + servable predicate; safer backfill; restricted heritage; rights/provenance; backfill classification; RM1–RM7; independent public media approval |

### Decision closure 2026-11-22

| ID | Decision |
| --- | --- |
| **REC1** | No legacy public-media exceptions. News/services `ImageField` uploads are `cms_only` until admin rights approval. |
| **REC2** | Unverified legacy covers stay hidden at go-live. Production inventory, coordinated DB + `storage/` backups, and tested recovery are mandatory before migrate/backfill. |
| **REC3** | Append-only `media_rights_events` with required reason; DB triggers reject UPDATE/DELETE. |
| **D1** | One category per item (nullable FK). |
| **D2** | Editors create inactive categories; only admins activate. |
| **D5** | Gallery later — not in 2.3. |
| **D9** | `domain` immutable after create. |
| **D10** | Alt text required for public approval. |
| **D11** | Public media cache `max-age=86400`. |
| **D12** | 100 uploads/user/day; 500 MB free-disk floor. |
| **D13** | Storage outside public web root (shared-host: above `public_html`). |
| **D14** | Static JPEG/PNG/WebP/GIF only; reject animated formats; GD re-encode. |
| **D15** | ≤ 24 MP, ≤ 8,000 px/edge before decode; stored longest edge ≤ 2,560 px. |
| **D16** | Licence ENUM exactly: `unknown`, `bureau_owned`, `permission_granted`, `cc0`, `cc_by`, `cc_by_sa`, `public_domain`. |

### Still open (non-blocking for schema)

| ID | Default during implementation |
| --- | --- |
| **D6** | Footer + About links only; no new primary-nav items |
| **D7** | Ship documented entry-type vocabulary; Bureau may adjust labels via i18n |

### Deferred

| ID | Notes |
| --- | --- |
| **D8** | `schema_migrations` + apply script — separate future slice |

---

## 2. Implementation dependencies

| Dependency | Requirement | Notes |
| --- | --- | --- |
| PHP GD + JPEG/PNG/WebP + GIF encode/decode | Required | Missing in current `backend/docker/Dockerfile` and live local API |
| PHP `exif` | Required | Orientation before strip |
| MariaDB 10.2+ CHECK / triggers | Required | Local is 11.8.7 |
| `uploads_dir` outside doc root | Required (D13) | Docker path already OK; shared-host layout updated in `FULL_MIGRATION_MAP.md` |
| nginx `client_max_body_size 10m` | Required for `web` profile | Currently absent → 1 MB default |
| Manual migration apply | Process | No runner (P6 / D8) |
| Existing auth | Reuse | `ContentPolicy` viewer/editor/admin + CSRF |
| Phase 2.1 / 2.2 | Applied | `007`, `008` must exist before `009`/`010` |

---

## 3. Workstreams and acceptance criteria

Implement in controlled increments. Each workstream must be independently verifiable.

### WS1 — Image processing and storage security

**Done when:**

- Dockerfile installs `gd` (jpeg/webp) + `exif`; codecs verified in container (`gd_info`, encode/decode functions).
- Upload pipeline: finfo + `getimagesize` + static-image checks + GD re-encode; animated → 400; GD missing → 503; no raw-byte store path.
- D15 limits enforced before decode; route memory limit documented.
- Quarantine + deny-all under `storage/`; not web-reachable.
- nginx body size set for `web` profile.

### WS2 — Database architecture

**Done when:**

- `009_categories_media.sql` + rollback: `categories`, `media_assets` (rights + CHECKs), `media_rights_events` + append-only triggers, `people.photo_media_id`.
- `010_content_entries.sql` + rollback: `content_entries` with heritage `visibility`.
- Re-apply safe (`IF NOT EXISTS`); rollback tested on disposable DB.
- No migration runner introduced.

### WS3 — Media management and rights

**Done when:**

- Registry CRUD; approve-public / mark-not-permitted / revoke / withdraw / unlock.
- Every rights admin action writes `media_rights_events` with reason; UPDATE/DELETE on events fail.
- Public file route uses servable predicate only; CMS file route `private, no-store`.
- Public cache 1 day; security headers (nosniff, CSP sandbox, Content-Disposition).
- REC1: `ImageField` uploads remain `cms_only` until approved.

### WS4 — Content architecture and CMS

**Done when:**

- Categories CMS (D2 activation gate).
- Shared content-entry editor for Culture and Heritage domains.
- Media library + picker; person photos via `photo_media_id`.
- Restricted heritage rules R1–R7 and RM1–RM7 enforced.
- Existing publish gate / CSRF / roles unchanged (no new RBAC).

### WS5 — Public website

**Done when:**

- Public APIs `/api/categories`, `/api/culture[/{slug}]`, `/api/heritage[/{slug}]` with pagination/search; restricted excluded.
- Pages `/culture`, `/culture/:slug`, `/heritage`, `/heritage/:slug` (routes before catch-all).
- Empty states (no seeded fiction); SEO/`og:image` only from servable covers.
- Footer/About links per D6 default; existing routes still work.

### WS6 — Backfill and migration safety

**Done when:**

- CLI dry-run by default; report with reference/rights/classification/live_impact.
- `--apply` only with matching rights file + admin reviewer; originals copied first.
- Never auto-publishes draft/restricted/unverified.
- **Not run against production** in this phase.

---

## 4. Migration ordering

```
007 → 008 → 009 → 010 → check-media-env.php → backfill dry run
  → rights review of report → backfill --apply → deploy MediaController / SPA
```

- Backfill **before** deploying the new public media gate (or covers break for verified files that still use old serving assumptions — follow architecture §9.1).
- REC2: full DB dump + `storage/` copy **before** `009`/`010` or `--apply` on any non-disposable environment.
- Rollback: `010` then `009`; files/quarantine/re-keys are **not** undone by SQL.

---

## 5. Testing requirements

| Suite | Purpose |
| --- | --- |
| `scripts/test-migration-009-010.sh` | Constraints, CHECKs, RESTRICT, rollback |
| `scripts/smoke-content-media.py` | Hostile uploads, animation, EXIF, visibility, rights events, restricted locks, cross-institution |
| Backfill fixtures | Every §9.2 classification; dry-run no-op; draft+approve_public stays `cms_only` |
| Existing smokes | Org structure / institution / CMS regressions (pass URL `http://127.0.0.1:8081` if needed) |
| `cd frontend && npx tsc --noEmit` | Typecheck |
| `cd frontend && npm run build` | Production SPA build |
| `docker compose exec -T api php -l …` | PHP lint on touched files |

Do not claim success for a test that was not executed. Do not bypass a failed security check.

---

## 6. Production deployment gates

Do **not** treat local verification as production readiness. Production requires:

1. Hosting model known (Docker/VPS vs shared) and D13 path verified.
2. Live PHP: GD + codecs + exif present; capabilities endpoint green.
3. Persistent uploads across redeploy.
4. nginx/proxy body size ≥ 10m.
5. Production media/cover inventory (local uploads are **not** production).
6. Coordinated DB + storage backups; restore tested (REC2).
7. Rights file completed for any cover that must stay public.
8. Dry-run report reviewed; `--apply` only after approval.
9. New MediaController deployed in the architecture-specified order.
10. Spot-check public pages listed under `live_impact`.

---

## 7. Explicit non-goals (2.3)

- PDF binary upload (designed only).
- News/events/services/documents schema rewrite (2.4).
- Freeform pages (2.5).
- General CMS audit log / approval workflow / new roles.
- Migration runner (D8).
- Seeding fictional culture/heritage content.
- Production migrate, backfill, deploy, commit, or push without authorization.

---

## 8. Recommended implementation sequence

1. **WS1** Dockerfile + upload security (unblocks everything media-related).
2. **WS2** migrations `009`/`010` + rollback tests.
3. **WS3** media APIs + rights events + serving rules.
4. **WS4** CMS categories, content entries, picker, person photos.
5. **WS5** public APIs and pages.
6. **WS6** backfill CLI + local fixture verification.
7. Full smoke + typecheck + build; Stage 5 report.

Report progress and test results after each workstream.

---

## 9. Stage 1 exit criteria

- [x] HEAD verified `bcd114e`
- [x] Decisions recorded in architecture §11 (revision 5)
- [x] Architecture report updated for closure
- [x] D13 reflected in `FULL_MIGRATION_MAP.md`
- [x] This handoff published
- [ ] **Human review of Stage 1 docs** ← required before Stage 2 coding

**Next action after review approval:** begin Stage 2 Workstream 1 (GD + storage security).
