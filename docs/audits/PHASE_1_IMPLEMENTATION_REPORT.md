# Phase 1 — Implementation Report  
## Product Identity & Institutional Foundation

| Field | Value |
| --- | --- |
| **Project** | Harari Culture, Heritage & Tourism Bureau — official institutional website |
| **Repository** | https://github.com/Hamdiabdosh/culture-heritage-tourism-bureau |
| **Date** | 21 November 2026 |
| **Baseline** | `docs/audits/PHASE_0_BASELINE_AUDIT.md` |
| **Roadmap** | `docs/IMPLEMENTATION_ROADMAP_V1.md` |
| **Git commit / push** | **Not performed** (per Phase 1 rules) |

---

## 1. Summary of changes

Phase 1 reframes the active public product as the **Harari Culture, Heritage & Tourism Bureau** institutional website:

- Product and agent documentation rewritten away from VisitHarar visitor-discovery positioning.
- Shared branding fallbacks and browser title updated.
- VisitHarar logo usage replaced with a **text wordmark** (`CHTB`) — no invented seal.
- Primary navigation and footer links switched to institutional IA using **existing working routes only**.
- Homepage and About copy reframed for institutional information (no invented leadership/stats).
- Message catalogs updated for identity/nav/home/about/CMS auth (EN + Amharic for critical keys; OM/HA use English-safe fallbacks where not translated).
- JSON-LD type changed from tourist centre to `GovernmentOrganization`.

**Preserved:** CMS routes/CRUD, auth/CSRF/roles, APIs, database schema, seeds, institution DB record, fixed guide-page policy in `PagesController`, legacy visitor routes (still reachable by URL, not primary nav).

---

## 2. Files changed and why

| File | Why |
| --- | --- |
| `PRODUCT.md` | Bureau institutional product definition, V1 scope/exclusions |
| `AGENTS.md` | Agents must treat product as Bureau site, not VisitHarar |
| `README.md` | Align project description and feature list with Phase 1 IA |
| `frontend/index.html` | Document title/description; remove VisitHarar favicon |
| `frontend/src/lib/site-template.ts` | Bureau fallback name/shortName/eyebrow |
| `frontend/src/components/brand/brand-logo.tsx` | Text wordmark instead of VisitHarar logo asset |
| `frontend/src/components/PublicShell.tsx` | Institutional primary + footer navigation |
| `frontend/src/pages/HomePage.tsx` | Institutional hero, pillars, news, quick links; remove tourism grids |
| `frontend/src/pages/AboutPage.tsx` | Comment only (copy via messages) |
| `frontend/src/lib/json-ld.ts` | `GovernmentOrganization` schema.org type |
| `messages/en.json` | Identity, nav, home, about, news labels, CMS auth |
| `messages/am.json` | Same keys + Amharic for critical identity strings |
| `messages/om.json` | Same keys; English fallback for new/changed identity strings |
| `messages/ha.json` | Same keys; English fallback for new/changed identity strings |
| `docs/audits/PHASE_1_IMPLEMENTATION_REPORT.md` | This report |

**Pre-existing (preserved, not authored solely in this phase):**  
`docs/IMPLEMENTATION_ROADMAP_V1.md`, `docs/audits/PHASE_0_BASELINE_AUDIT.md`

**Not modified (intentionally):** database SQL/seeds, `PagesController` guide-slot policy, backend APIs, CMS entity editors, Docker/deploy configs, `visit-harar-logo.webp` asset (retained on disk, unused by `BrandLogo`).

---

## 3. Before / after — public identity and navigation

### Identity

| | Before | After |
| --- | --- | --- |
| Fallback name | VisitHarar | Harari Culture, Heritage & Tourism Bureau |
| Fallback short | Harar | CHTB |
| Eyebrow | Tourism Commission | Harari People Regional State |
| Logo | `/brand/visit-harar-logo.webp` | Text wordmark `CHTB` |
| HTML title | VisitHarar | Harari Culture, Heritage & Tourism Bureau |
| JSON-LD | TouristInformationCenter | GovernmentOrganization |

**Note:** Live API institution record may still return Visit Harar seeded values until Phase 2 / content ops update CMS settings. Fallbacks and UI chrome are Bureau-framed; CMS Site settings can overwrite displayed name when edited.

### Navigation (primary)

| Before | After | Route |
| --- | --- | --- |
| Discover / Explore / Experiences / Plan / Stories / Map / Contact | Home / About the Bureau / News & announcements / Events / Publications / Contact | `/`, `/about`, `/stories`, `/events`, `/resources`, `/contact` |

**Intentionally omitted from nav (no dead links / wrong content):** Culture & Heritage, Public Services (await Phase 2 content architecture). Legacy `/explore`, `/experiences`, `/plan`, `/map` remain in the router for compatibility but are not primary chrome.

---

## 4. Routes

| Action | Routes |
| --- | --- |
| Reused as primary | `/`, `/about`, `/stories` (news), `/events`, `/resources`, `/contact`, `/privacy`, `/login`, `/cms/*` |
| Hidden from primary nav (still in `App.tsx`) | `/explore`, `/experiences`, `/plan`, `/plan/itineraries`, `/map`, legacy redirects |
| Added | None |
| Removed from router | None |

---

## 5. Localization

- Architecture preserved (`i18n.tsx`, four catalogs, cookie/`?lang=`).
- EN updated for Phase 1 identity surfaces.
- AM: critical nav/home/about/seo/footer/CMS auth strings translated.
- OM/HA: same key structure updated; many new identity strings remain **English fallbacks** — **outstanding Phase 3 work**.
- No RTL layout overhaul (Ethiopic/Latin LTR); fonts already include Noto Sans Ethiopic.
- Did not delete unused tourism keys still referenced by legacy pages.

---

## 6. Brand assets

- **No official Bureau logo** found in-repo suitable for institutional use (`visit-harar-logo.webp` is VisitHarar Jugol mark).
- **Used:** text wordmark in `brand-logo.tsx`.
- VisitHarar webp **kept on disk** (not deleted).

---

## 7. Preservation confirmation

| Area | Status |
| --- | --- |
| CMS routes / CRUD | Unchanged |
| Auth, sessions, CSRF, roles | Unchanged (smoke news/users PASS) |
| News/events/services/documents/media APIs | Unchanged |
| Institution settings API | Unchanged |
| DB schema / seeds / records | Unchanged |
| `PagesController` fixed guide-page policy | Unchanged |
| Deploy / Docker / env | Unchanged |

---

## 8. Commands executed and results

| Command | Result |
| --- | --- |
| `cd frontend && npx tsc --noEmit` | **PASS** (exit 0) |
| `cd frontend && npm run build` | **PASS** (exit 0) |
| `bash scripts/smoke-cms-news.sh http://127.0.0.1:8081` | **PASS** |
| `bash scripts/smoke-cms-users.sh http://127.0.0.1:8081` | **PASS** |
| `GET /api/auth/login` + `/auth/session` | **PASS** (admin session) |
| `smoke-php-api.sh` / `smoke-cms-all.sh` | **Not re-fixed** — pre-existing Phase 0 failures (NPSO expectation; pages create disabled) |

No new regressions observed in CMS auth/news/users smokes.

---

## 9. Known issues and risks

1. **DB institution seed** may still display “Visit Harar” when API is up — update via CMS settings or Phase 2 content work; Phase 1 did not rewrite seeds.
2. **Legacy visitor pages** still exist and can be bookmarked; not primary nav.
3. **OM/HA identity strings** largely English — Phase 3.
4. **Culture & Heritage / Public Services** not in nav until content model exists.
5. Homepage hero still uses existing `/hero/*` photography — atmospheric only; not claimed as official Bureau branding.
6. Root `npm run typecheck` remains broken (Phase 0 debt).

---

## 10. Recommended next step — Phase 2

Issue a **Phase 2–only** prompt for institutional content architecture:

- Org structure / leadership (without inventing names).
- Culture & Heritage content categories and routes.
- Safe unlock/replacement of fixed guide-page policy.
- Controlled seed/CMS update of institution profile to Bureau identity.
- Additive migrations as required.

Do **not** start Phase 2 until this Phase 1 report is approved and changes are committed by maintainers.

---

## 11. Git status (end of Phase 1 work)

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD | `3703aca` — `Remap local Vite and API ports when 5173/8080 are occupied.` |
| Remote sync | Even with `origin/main` at start; **local uncommitted Phase 1 changes** |
| Commit/push | **None** |

### Working tree (complete changed-file list at report time)

**Modified:**  
`AGENTS.md`, `PRODUCT.md`, `README.md`, `frontend/index.html`, `frontend/src/components/PublicShell.tsx`, `frontend/src/components/brand/brand-logo.tsx`, `frontend/src/lib/json-ld.ts`, `frontend/src/lib/site-template.ts`, `frontend/src/pages/AboutPage.tsx`, `frontend/src/pages/HomePage.tsx`, `messages/am.json`, `messages/en.json`, `messages/ha.json`, `messages/om.json`

**Untracked:**  
`docs/IMPLEMENTATION_ROADMAP_V1.md`, `docs/audits/` (includes `PHASE_0_BASELINE_AUDIT.md`, this `PHASE_1_IMPLEMENTATION_REPORT.md`)

---

*Phase 1 implementation complete pending human review. Waiting for approval before commit and before Phase 2.*
