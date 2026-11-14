# Pass 4 — React SPA Migration Map (Agent C)

**Status:** Design + thin API stub only — Next.js app untouched  
**Date:** 2026-10-11  
**Authority:** `docs/FULL_MIGRATION_MAP.md` (§4 routes, §6 i18n, §7 fate, §8 data paths), `docs/PASS3_FRONTEND_MIGRATION_AUDIT.md`  
**Out of lane:** MySQL DDL (Agent A), PHP controllers (Agent B), deleting/rewriting Next

---

## 0. Locked choices (frontend)

| Item | Choice |
|---|---|
| App | Vite + React Router CSR SPA |
| Fetch | Same-origin `fetch` with `credentials: 'include'` |
| Messages | Keep `messages/{en,am,om,ha}.json` |
| Documents UI | `/resources` → `GET /api/documents` |
| UI redesign | None |
| Skip | `components/admin-site.tsx` |
| Target folder | `frontend/` (preferred over `web/`) |

---

## 1. Proposed `frontend/` folder layout

Scaffold today is docs-heavy + thin client only. Full Vite tree below is the **target** once Pass 10 opens.

```text
frontend/
├── README.md                          ← scaffold note (this pass)
├── package.json                       ← intended deps listed; do not install yet
├── index.html                         ← (Pass 10)
├── vite.config.ts                     ← (Pass 10) proxy /api → PHP in local dev
├── public/                            ← copy static assets from repo public/
├── messages/                          ← symlink or copy of messages/{en,am,om,ha}.json
└── src/
    ├── main.tsx                       ← createRoot + RouterProvider + i18n
    ├── App.tsx                        ← route tree
    ├── styles/
    │   ├── globals.css                ← from app/globals.css
    │   └── cms.css                    ← from app/cms/cms.css
    ├── lib/
    │   ├── api-client.ts              ← THIS PASS (stub)
    │   ├── auth.ts                    ← login/logout/session helpers
    │   ├── i18n.ts                    ← load messages + lang cookie / ?lang=
    │   ├── public-format.ts           ← port from lib/content/public-format.ts
    │   ├── page-fields.ts             ← port pure helpers
    │   ├── page-translations.ts       ← client helpers only (resolve stays PHP for pages)
    │   └── institution-config.ts      ← until GET /api/institution is enough
    ├── components/
    │   ├── brand/built-by-raafat.tsx
    │   ├── institution-site.tsx       ← keep presentation; swap Link/intl
    │   ├── public-detail.tsx
    │   ├── language-switcher.tsx
    │   ├── login-form.tsx
    │   ├── cms-shell.tsx
    │   ├── cms-dashboard.tsx
    │   ├── cms-*-form.tsx
    │   └── ui/
    ├── layouts/
    │   ├── PublicLayout.tsx           ← header/footer shell if extracted
    │   └── CmsLayout.tsx              ← session guard + CmsShell
    └── pages/                         ← thin route modules (fetch + map props)
        ├── HomePage.tsx
        ├── AboutPage.tsx
        ├── ContactPage.tsx
        ├── NewsListPage.tsx
        ├── NewsDetailPage.tsx
        ├── EventsListPage.tsx
        ├── EventsDetailPage.tsx
        ├── ServicesListPage.tsx
        ├── ServicesDetailPage.tsx
        ├── ResourcesListPage.tsx
        ├── ResourcesDetailPage.tsx
        ├── CmsPagePage.tsx            ← /:slug catch-all CMS pages
        ├── LoginPage.tsx
        ├── NotFoundPage.tsx
        └── cms/
            ├── DashboardPage.tsx
            ├── pages/                 ← content list/new/edit
            ├── news/
            ├── events/
            ├── services/
            ├── documents/
            └── users/
```

**ponytail:** Do not invent a component library. Port existing `components/*` and swap Next imports.

---

## 2. Route table

**Total UI routes: 30** (+ shared `*` 404).  
CMS entity pattern = list + new + `:id` for five entities.

### 2.1 Public (13)

| # | UI path | Future page module | Reuse (presentation) | API calls |
|---|---|---|---|---|
| 1 | `/` | `pages/HomePage.tsx` | `HomePage` from `institution-site` | `GET /api/institution`, `/api/news`, `/api/services`, `/api/events`, `/api/documents` (compose client-side) |
| 2 | `/about` | `pages/AboutPage.tsx` | `AboutPage` | `GET /api/pages/about?lang=` |
| 3 | `/contact` | `pages/ContactPage.tsx` | `ContactPage` | Optional `GET /api/institution`; else `institution-config` |
| 4 | `/news` | `pages/NewsListPage.tsx` | `NewsPage` | `GET /api/news` |
| 5 | `/news/:slug` | `pages/NewsDetailPage.tsx` | `ArticlePage` | `GET /api/news/:slug` |
| 6 | `/events` | `pages/EventsListPage.tsx` | `EventsPage` | `GET /api/events` |
| 7 | `/events/:slug` | `pages/EventsDetailPage.tsx` | `EventDetailPage` | `GET /api/events/:slug` |
| 8 | `/services` | `pages/ServicesListPage.tsx` | `DirectoryPage` | `GET /api/services` |
| 9 | `/services/:slug` | `pages/ServicesDetailPage.tsx` | `ServiceDetailPage` | `GET /api/services/:slug` |
| 10 | `/resources` | `pages/ResourcesListPage.tsx` | `ResourcesPage` | `GET /api/documents` |
| 11 | `/resources/:slug` | `pages/ResourcesDetailPage.tsx` | `ResourceDetailPage` | `GET /api/documents/:slug` |
| 12 | `/:slug` | `pages/CmsPagePage.tsx` | `AboutPage`-style / detail body | `GET /api/pages/:slug?lang=` after static routes; reserved: `about,api,cms,events,login,news,resources,services` |
| 13 | `/login` | `pages/LoginPage.tsx` | `LoginForm` | `GET /api/auth/session` (bounce if user); `POST /api/auth/login` |

### 2.2 CMS (17)

| # | UI path | Future page module | Reuse | API calls | Guard |
|---|---|---|---|---|---|
| 14 | `/cms` | `cms/DashboardPage.tsx` | `CmsDashboard` (make client) | Optional aggregates later; counts from list GETs ok | session |
| 15 | `/cms/content` | `cms/pages/ListPage.tsx` | list markup from `app/cms/content/page.tsx` | `GET /api/cms/pages` | session |
| 16 | `/cms/content/new` | `cms/pages/NewPage.tsx` | `PageEditorForm` | `POST /api/cms/pages` | editor+ |
| 17 | `/cms/content/:id` | `cms/pages/EditPage.tsx` | `PageEditorForm` / `PageViewer` | `GET` + `PUT` + `DELETE /api/cms/pages/:id` | session; write editor+ |
| 18 | `/cms/news` | `cms/news/ListPage.tsx` | current list UI | `GET /api/cms/news` | session |
| 19 | `/cms/news/new` | `cms/news/NewPage.tsx` | `NewsEditorForm` | `POST /api/cms/news` | editor+ |
| 20 | `/cms/news/:id` | `cms/news/EditPage.tsx` | `NewsEditorForm` / `NewsViewer` | `GET`/`PUT`/`DELETE /api/cms/news/:id` | session; write editor+ |
| 21 | `/cms/events` | `cms/events/ListPage.tsx` | current list UI | `GET /api/cms/events` | session |
| 22 | `/cms/events/new` | `cms/events/NewPage.tsx` | `EventEditorForm` | `POST /api/cms/events` | editor+ |
| 23 | `/cms/events/:id` | `cms/events/EditPage.tsx` | `EventEditorForm` / `EventViewer` | `GET`/`PUT`/`DELETE /api/cms/events/:id` | session; write editor+ |
| 24 | `/cms/services` | `cms/services/ListPage.tsx` | current list UI | `GET /api/cms/services` | session |
| 25 | `/cms/services/new` | `cms/services/NewPage.tsx` | `ServiceEditorForm` | `POST /api/cms/services` | editor+ |
| 26 | `/cms/services/:id` | `cms/services/EditPage.tsx` | `ServiceEditorForm` / `ServiceViewer` | `GET`/`PUT`/`DELETE /api/cms/services/:id` | session; write editor+ |
| 27 | `/cms/documents` | `cms/documents/ListPage.tsx` | current list UI | `GET /api/cms/documents` | session |
| 28 | `/cms/documents/new` | `cms/documents/NewPage.tsx` | `DocumentEditorForm` | `POST /api/cms/documents` | editor+ |
| 29 | `/cms/documents/:id` | `cms/documents/EditPage.tsx` | `DocumentEditorForm` / `DocumentViewer` | `GET`/`PUT`/`DELETE /api/cms/documents/:id` | session; write editor+ |
| 30 | `/cms/users` | `cms/users/UsersPage.tsx` | users table UI | `GET /api/cms/users`, `PUT /api/cms/users/:id` | admin |

**404:** `pages/NotFoundPage.tsx` — reuse `NotFoundContent` / listing empty patterns; React Router `path="*"`.

**Client guard:** CMS layout calls `GET /api/auth/session`; if `user == null` → navigate `/login?next=`.  
**Server guard:** PHP on every CMS API (authoritative).

### 2.3 React Router sketch (Pass 10)

```tsx
// illustrative — do not implement until PHP public news responds
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/contact" element={<ContactPage />} />
  <Route path="/news" element={<NewsListPage />} />
  <Route path="/news/:slug" element={<NewsDetailPage />} />
  <Route path="/events" element={<EventsListPage />} />
  <Route path="/events/:slug" element={<EventsDetailPage />} />
  <Route path="/services" element={<ServicesListPage />} />
  <Route path="/services/:slug" element={<ServicesDetailPage />} />
  <Route path="/resources" element={<ResourcesListPage />} />
  <Route path="/resources/:slug" element={<ResourcesDetailPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/cms" element={<CmsLayout />}>
    <Route index element={<DashboardPage />} />
    <Route path="content" element={<PagesList />} />
    <Route path="content/new" element={<PagesNew />} />
    <Route path="content/:id" element={<PagesEdit />} />
    <Route path="news" … />
    <Route path="events" … />
    <Route path="services" … />
    <Route path="documents" … />
    <Route path="users" element={<UsersPage />} />
  </Route>
  <Route path="/:slug" element={<CmsPagePage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

---

## 3. File fate table

Legend: **Keep** = copy/port presentation with minimal edits · **Modify** = keep file, swap Next/auth/actions · **Replace** = drop from SPA process (logic moves to PHP or new client module) · **Skip** = do not migrate

### 3.1 `app/`

| Path | Fate | Notes |
|---|---|---|
| `app/layout.tsx` | Replace | → `main.tsx` + i18n provider |
| `app/page.tsx` | Replace | → `pages/HomePage.tsx` fetch compose |
| `app/about/page.tsx` | Replace | thin fetch wrapper |
| `app/contact/page.tsx` | Replace | thin; mostly already presentational |
| `app/news/page.tsx`, `app/news/[slug]/page.tsx` | Replace | **first vertical slice** |
| `app/events/**`, `app/services/**`, `app/resources/**` | Replace | same pattern as news |
| `app/[slug]/page.tsx` | Replace | catch-all after static routes |
| `app/login/page.tsx` | Replace | session bounce + `LoginForm` |
| `app/not-found.tsx` | Replace | router 404 |
| `app/cms/layout.tsx` | Replace | `CmsLayout` + session guard |
| `app/cms/page.tsx` + entity `page.tsx` / `new` / `[id]` | Replace | CMS pages under `pages/cms/*` |
| `app/cms/*/actions.ts` (6 files) | Replace | PHP CMS APIs; forms call `apiClient` |
| `app/api/auth/[...all]/route.ts` | Replace | PHP `/api/auth/*` |
| `app/globals.css`, `app/cms/cms.css` | Keep | copy into `frontend/src/styles/` |

### 3.2 `components/`

| Path | Fate | Notes |
|---|---|---|
| `institution-site.tsx` | Modify | `next/link` → RR `Link`; `useTranslations` → SPA i18n |
| `public-detail.tsx` | Modify | same Link swap |
| `language-switcher.tsx` | Modify | drop `router.refresh()`; set `lang` cookie + soft remount/navigate |
| `login-form.tsx` | Modify | `authClient` → `api.auth.login`; RR navigate |
| `cms-shell.tsx` | Modify | Link/nav/signOut → RR + `api.auth.logout` |
| `cms-*-form.tsx` (5) | Modify | `useActionState(serverAction)` → API + local state |
| `cms-dashboard.tsx` | Modify | drop server `getTranslations`; client props/API |
| `cms-institution-error.tsx` | Modify | client i18n |
| `use-scroll-reveal.ts` | Keep | already client |
| `ui/button.tsx` | Keep | if still used |
| `admin-site.tsx` | **Skip** | prototype; not in live routes |
| `src/components/brand/built-by-raafat.tsx` | Keep | credit on footer / CMS / login |

### 3.3 `lib/`

| Path | Fate | Notes |
|---|---|---|
| `lib/institution-config.ts` | Keep | until institution API covers branding |
| `lib/content/public-format.ts` | Keep | date/locale helpers (no DB) |
| `lib/content/page-fields.ts` | Keep | slug/status validation on client forms |
| `lib/content/page-translations.ts` | Keep (helpers) | public resolution moves to PHP |
| `lib/utils.ts`, `lib/platform-config.ts` | Keep | if still needed |
| `lib/public-metadata.ts` | Replace | SPA head (`document.title` / react-helmet-async later) |
| `lib/content/public-language.ts` | Replace | client cookie/`?lang=` in `lib/i18n.ts` |
| `lib/content/{news,events,services,documents,pages,institution}.ts` | Replace | PHP + `api-client` |
| `lib/cms/users.ts`, `lib/cms/workflow-messages.ts` | Replace | PHP users API; strings via messages |
| `lib/db/*` | Replace | gone from frontend process |
| `lib/auth.ts`, `lib/auth-client.ts`, `lib/authz.ts` | Replace | PHP sessions + thin `lib/auth.ts` client |

### 3.4 Other Next-coupled

| Path | Fate |
|---|---|
| `i18n/request.ts`, next-intl plugin in `next.config.mjs` | Replace → SPA i18n bootstrap |
| `i18n/locales.ts` | Keep idea → import from `institution-config.languages` |
| `messages/*.json` | Keep (copy/symlink into SPA) |
| `proxy.ts` | Replace → SPA CMS guard + host `.htaccess` |
| `next.config.mjs`, `next-env.d.ts` | Drop at cutover |

### 3.5 Fate summary (counts)

| Fate | Approx. key items |
|---|---|
| Keep | CSS, messages×4, pure helpers, BuiltByRaafat, scroll reveal, institution-config |
| Modify | ~12 presentation/client components (shell, forms, site, switcher, login) |
| Replace | ~40 `app/**` pages/layouts/actions + auth/db/content query modules + proxy/i18n Next glue |
| Skip | `admin-site.tsx` |

---

## 4. i18n migration plan

| Stay | Change |
|---|---|
| `messages/{en,am,om,ha}.json` | Load in SPA root (not next-intl) |
| Codes `en`/`am`/`om`/`ha` from `institution-config` | — |
| Cookie name `lang` + optional `?lang=` | Client sets cookie; no RSC `router.refresh()` |
| Page content translations JSON | Resolve in **PHP** on `GET /api/pages/*?lang=` |
| Harari incomplete copy | Keep wired; content work separate |
| News/events/services/documents DB translations | Out of scope |

**Transport steps (Pass 10):**

1. Pick a small client lib (`i18next` or lightweight custom `useT` over JSON) — same key paths as today (`news.title`, `cms.*`, …).
2. On boot: read `?lang=` → write cookie → else read cookie → else `en`.
3. Import `messages/${locale}.json`; provide via React context.
4. Port `LanguageSwitcher`: set cookie, update URL search param, re-render (no Next refresh).
5. Public page fetches pass `?lang=` to PHP for translated titles/bodies.
6. Drop `next-intl` plugin, `i18n/request.ts`, server `getTranslations` / `getLocale`.

**SEO note (accept for CSR):** set `document.title` from message keys or API titles; sitemap remains static/host concern (map risk R5).

---

## 5. Auth client plan

```text
login(email, password)
  → POST /api/auth/login { email, password }  credentials: 'include'
  → { user: { id, name, email, role } } + Set-Cookie
  → navigate(next || '/cms')

session()
  → GET /api/auth/session  credentials: 'include'
  → { user } | { user: null }

logout()
  → POST /api/auth/logout  credentials: 'include'
  → navigate('/login')
```

| Concern | Plan |
|---|---|
| Replace | `authClient.signIn.email` / `signOut` / Better Auth catch-all |
| Cookie | HttpOnly PHP session; browser never reads token; always `credentials: 'include'` |
| CMS layout | Call `session()` once; redirect `/login?next=` if null |
| Role UI | Hide edit/admin affordances from `user.role`; PHP still enforces |
| Inactive | Login fails / session returns null; show existing inactive messaging if API sends code |
| CSRF | Wait for Agent B preference (map open item #6); mutating CMS calls will attach token when defined |
| No sign-up | Do not add registration UI |

**Client module shape (Pass 10+):** `frontend/src/lib/auth.ts` wrapping `apiClient` — not Better Auth.

---

## 6. First vertical slice: public news

**Goal:** `/news` + `/news/:slug` in the future SPA match current UI, fed by PHP.

### Concrete steps (ordered)

1. **Agent B contract ready:** `GET /api/news` and `GET /api/news/{slug}` return published JSON (error shape per map §3.7). Confirm field names (see stub types in `frontend/src/lib/api-client.ts`).
2. **Scaffold Vite app** in `frontend/` (Pass 10) — only then run install; not this pass.
3. **Wire routes** for news list/detail only; public shell header/footer from `institution-site`.
4. **Map API → props** (mirror current RSC mappers):
   - List → `PublicNewsCard`: `id, slug, title, summary, category, date` (`date` = formatted `publishedAt ?? createdAt` via ported `formatPublicDate`).
   - Detail → `ArticlePage` props: `title, category, date, summary, content`.
5. **404:** missing slug → NotFound route (no `next/navigation` `notFound()`).
6. **i18n:** news chrome strings from `messages/*.json`; content remains English fields.
7. **Parity check:** side-by-side with Next `/news` against same MySQL seed.
8. **Only then** expand to events/services/resources/home.

**Do not** start CMS news forms in the first slice.

---

## 7. What NOT to do until PHP stubs respond

| Do not | Why |
|---|---|
| Delete or rewrite Next `app/**` / actions | Next remains comparison monolith |
| Wire SPA into Next or share Next bundler | Separate static deploy |
| `npm`/`pnpm` install full Vite app yet | Docs + stub only this pass |
| Invent API shapes that conflict with Agent B | Consume map §3; stub types are placeholders |
| Redesign UI / add news translations | Locked out of scope |
| Migrate `admin-site.tsx` | Prototype |
| Depend on Better Auth cookies from SPA | PHP session cookies only |
| Cross-origin fetch without credentials plan | Same-origin locked |
| Build CMS forms against mock localStorage | Wait for CMS APIs + publish gate |
| Assume DELETE hard-deletes | DELETE = soft archive |

**Unblock order dependency:** Agent A schema → Agent B auth + public GETs (news first) → Agent C vertical slice implementation.

---

## 8. Thin stub delivered this pass

| File | Purpose |
|---|---|
| `frontend/src/lib/api-client.ts` | Typed `fetch` helper (`credentials: 'include'`) + News list/detail placeholder types |
| `frontend/README.md` | Scaffold disclaimer — not wired to Next |
| `frontend/package.json` | Intended deps listed; **no install run** |

---

## 9. Dependency on Agent B (PHP contract)

SPA work after this map needs Agent B to expose (minimum for news slice):

| Method | Path | Notes |
|---|---|---|
| GET | `/api/news` | Published only; JSON array or `{ items: [...] }` — **align with stub** |
| GET | `/api/news/{slug}` | Published; 404 → `{ error: { code: "NOT_FOUND", ... } }` |
| GET | `/api/auth/session` | Needed before any CMS UI |
| POST | `/api/auth/login` / `logout` | Before login form cutover |

Later: full public §3.2 + CMS §3.3–3.5 including users. CSRF header name once chosen.

---

## 10. Exit criteria (Pass 4 Agent C)

```text
[x] Folder layout proposed for frontend/
[x] Route table: 30 UI paths → components → APIs
[x] File fate for app/ / components/ / lib/
[x] i18n plan (drop next-intl; keep JSON; lang cookie)
[x] Auth client plan
[x] Public news vertical slice steps
[x] Explicit NOT-TO-DO until PHP responds
[x] Optional thin api-client stub + README (no Next integration, no install)
```

---

*End of Pass 4 React SPA map. Implementation of routes/Vite shell waits for PHP public news stubs (program Pass 10–11).*
