# Pass 3 — Frontend Next.js Dependency Audit

**Date:** 2026-10-11  
**Scope:** Read-only audit of the React/Next.js monolith before PHP backend extraction.  
**Rules followed:** No code changes, no schema changes, no redesign of i18n or auth behavior.

**Stack facts (from repo):**

- Next.js `16.3.6` (App Router; `proxy.ts` is the Next 16 successor to middleware)
- React 19, `next-intl` 4.x, Better Auth + Drizzle ORM + PostgreSQL
- No Prisma, no axios, no `next/image` usage, no `pages/` router

---

## 1. Executive Summary

**Migration impact: HIGH**

Why:

1. **Almost all pages are Server Components** that call Drizzle directly (`lib/content/*`, `lib/cms/*`). There is no existing public/CMS JSON API for content — only Better Auth under `/api/auth/[...all]`.
2. **All CMS writes are Server Actions** (`'use server'` in six `actions.ts` files). Those must become PHP CMS endpoints + a React API client.
3. **Auth is Better Auth**, wired through Next handlers, `nextCookies()`, `headers()`, and `better-auth/react` on the client. Target is HTTP-only PHP session cookies — this is a full auth rewrite, not a swap of import paths.
4. **i18n is Next-coupled** (`next-intl` plugin, `getTranslations` / `getLocale` on the server, cookie via `cookies()`). UI strings and Harari (`ha`) must stay; the *transport* of locale into React must change.
5. **Routing is App Router file-based.** Dynamic routes (`[slug]`, `[id]`, catch-all auth) must be remapped to a client router (e.g. React Router). Public documents live under `/resources`, while the proposed PHP API uses `/api/documents` — URL mapping must be explicit.

Lowering factors (do not change the HIGH rating):

- No `next/image` usage (`images.unoptimized: true` already).
- No `revalidateTag` / `unstable_cache` / `fetch(... next:)` — many public pages already use `force-dynamic`.
- Presentation components (`institution-site`, CMS forms, CSS, `messages/*.json`) are largely reusable once data arrives via props/API.

---

## 2. Next.js Dependency Inventory

| Dependency | File | Usage | Migration impact | Proposed replacement |
|---|---|---|---|---|
| `next-intl` + plugin | `next.config.mjs`, `i18n/request.ts`, `app/layout.tsx` | Plugin wraps config; root loads locale/messages | HIGH | React i18n (e.g. `react-intl` / `i18next`) loading same `messages/*.json`; locale from cookie/`?lang=` client-side |
| `next-intl/server` `getTranslations` / `getLocale` / `getMessages` | Most `app/**/page.tsx`, CMS pages, `lib/cms/workflow-messages.ts`, actions | Server-side UI strings + SEO metadata | HIGH | Client `useTranslations` or load messages in React root; SEO via `react-helmet` / router meta |
| `next-intl` `useTranslations` | `components/cms-*.tsx`, `language-switcher.tsx`, `cms-shell.tsx`, `institution-site.tsx` | Client strings | MEDIUM | Same API shape via non-Next i18n library |
| `next/navigation` `redirect` | `lib/authz.ts`, `app/login/page.tsx`, all CMS `actions.ts` | Auth gates + post-mutation navigation | HIGH | React Router `navigate` / `<Navigate>`; API returns errors instead of server redirect |
| `next/navigation` `notFound` | `app/[slug]`, `about`, `news/[slug]`, `events/[slug]`, `services/[slug]`, `resources/[slug]`, CMS `[id]` pages | 404 for missing content | MEDIUM | Router 404 route / throw into error boundary |
| `next/navigation` `usePathname` / `useRouter` | `cms-shell.tsx`, `language-switcher.tsx`, `login-form.tsx` | Nav active state, locale refresh, post-login | MEDIUM | React Router hooks |
| `next/link` `Link` | CMS pages, `cms-shell`, `institution-site`, `public-detail`, `login`, `not-found`, `cms-dashboard`, `admin-site`, `cms-institution-error` | Client navigation | MEDIUM | React Router `<Link>` |
| `next/cache` `revalidatePath` | All CMS `actions.ts` | Invalidate RSC cache after writes | LOW→N/A | Drop; client refetch / query invalidation after API success |
| `next/headers` `headers` | `lib/authz.ts`, `app/login/page.tsx`, `app/cms/users/actions.ts` | Pass request cookies to Better Auth | HIGH | PHP session cookie validated on API; browser `credentials: 'include'` |
| `next/headers` `cookies` | `i18n/request.ts`, `lib/content/public-language.ts` | Read `lang` cookie for locale / page translations | MEDIUM | Client cookie read (already partially in `language-switcher.tsx`) + optional `Accept-Language` / query to PHP |
| `next/server` `NextRequest` / `NextResponse` | `proxy.ts` | CMS cookie gate + redirect to login | HIGH | SPA route guard + PHP auth on every CMS API call |
| `next` `Metadata` / `generateMetadata` / `viewport` | `app/layout.tsx`, public pages, `lib/public-metadata.ts` | SEO title/description | MEDIUM | Client document head management |
| `next` types / config | `next-env.d.ts`, `package.json` scripts | Framework | HIGH | Remove with Next; Vite (or similar) build |
| `better-auth/next-js` | `lib/auth.ts` (`nextCookies`), `app/api/auth/[...all]/route.ts` (`toNextJsHandler`) | Cookie + route adapter | CRITICAL | PHP session auth endpoints |
| `export const dynamic = 'force-dynamic'` | Public content pages | Disable static caching | N/A after leave Next | Default SPA/client fetch behavior |
| `next/image` | — | **None found** | NONE | Plain `<img>` if images added later |
| `permanentRedirect` | — | **None found** | NONE | — |
| `revalidateTag` / `unstable_cache` / `cache()` / `fetch(next:)` | — | **None found** | NONE | — |
| `setRequestLocale` | — | **None found** | NONE | — |
| `server-only` package | — | **None found** | NONE | — |

---

## 3. Server Components

**Rule used:** In the App Router, files under `app/` without `'use client'` are Server Components. Async `page.tsx` / `layout.tsx` that call `cookies()`, `headers()`, Drizzle, or `next-intl/server` are Next-specific — not merely “async React.”

| File | Why it is server-side | Can become client component? | Required change |
|---|---|---|---|
| `app/layout.tsx` | Async; `getLocale`/`getMessages`; Next metadata | Split: shell client + i18n provider | Replace with React root + i18n provider |
| `app/page.tsx` | Async; Drizzle lists + `getLocale` | Yes, after data via API | Fetch public APIs; pass props to `HomePage` |
| `app/about/page.tsx` | Async; DB + `getRequestLanguage` + `notFound` | Yes | `GET /api/pages/about` (+ lang) |
| `app/[slug]/page.tsx` | Async; DB + reserved-slug guard + `notFound` | Yes | `GET /api/pages/{slug}` |
| `app/news/page.tsx`, `app/news/[slug]/page.tsx` | Async; Drizzle | Yes | `GET /api/news`, `GET /api/news/{slug}` |
| `app/events/page.tsx`, `app/events/[slug]/page.tsx` | Async; Drizzle | Yes | `GET /api/events`… |
| `app/services/page.tsx`, `app/services/[slug]/page.tsx` | Async; Drizzle | Yes | `GET /api/services`… |
| `app/resources/page.tsx`, `app/resources/[slug]/page.tsx` | Async; Drizzle documents | Yes | `GET /api/documents`… (keep UI path `/resources`) |
| `app/contact/page.tsx` | Sync default export but uses `generateMetadata` + next-intl; no DB | Mostly already presentational | Keep UI; meta/i18n client-side |
| `app/login/page.tsx` | Async; `headers` + Better Auth session + `redirect` | Yes | `GET /api/auth/session` then navigate |
| `app/not-found.tsx` | Async; `getTranslations` | Yes | Router 404 page |
| `app/cms/layout.tsx` | Async; `requireSession` | Layout becomes client guard | Session check via API; protect routes |
| `app/cms/page.tsx` + all CMS list/detail/new pages | Async; authz + Drizzle | Yes | CMS list/get endpoints |
| `components/cms-dashboard.tsx` | No `'use client'`; uses `getLocale`/`getTranslations` — **imported into CMS overview as server UI** | Yes | Client i18n + props from API |
| `components/cms-institution-error.tsx` | Server next-intl + Link | Yes | Client i18n |
| `lib/cms/workflow-messages.ts` | Server `getTranslations` | N/A (helper) | Move strings to client or return codes from API |

**Already client (`'use client'`)** — presentation-heavy, still Next-coupled via Link/navigation/intl/actions:

`cms-shell`, `cms-*-form`, `language-switcher`, `login-form`, `institution-site`, `public-detail`, `admin-site`, `use-scroll-reveal`.

**Note:** `app/contact/page.tsx` default export is a sync Server Component wrapping `ContactPage` — Next-specific only for metadata/i18n wiring, not for DB.

---

## 4. Server Actions

All actions use FormData + role checks via `getAuthSession` / `enforcePublishingGate`, then Drizzle through `lib/content/*` or `lib/cms/users`.

| File | Action | Purpose | Current backend operation | PHP endpoint |
|---|---|---|---|---|
| `app/cms/content/actions.ts` | `createPageAction` | Create page (+ translations) | `createPage` → `pages` insert | `POST /api/cms/pages` |
| same | `updatePageAction` | Update page | `updatePage` | `PUT /api/cms/pages/{id}` |
| same | `archivePageAction` | Archive page | `archivePage` | `DELETE /api/cms/pages/{id}` *(or dedicated archive if soft-delete semantics preferred — today status→archived)* |
| `app/cms/news/actions.ts` | `createNewsAction` | Create news | `createNews` | `POST /api/cms/news` |
| same | `updateNewsAction` | Update news | `updateNews` | `PUT /api/cms/news/{id}` |
| same | `archiveNewsAction` | Archive news | `archiveNews` | `DELETE /api/cms/news/{id}` |
| `app/cms/events/actions.ts` | `createEventAction` | Create event | `createEvent` | `POST /api/cms/events` |
| same | `updateEventAction` | Update event | `updateEvent` | `PUT /api/cms/events/{id}` |
| same | `archiveEventAction` | Archive event | `archiveEvent` | `DELETE /api/cms/events/{id}` |
| `app/cms/services/actions.ts` | `createServiceAction` | Create service | `createService` | `POST /api/cms/services` |
| same | `updateServiceAction` | Update service | `updateService` | `PUT /api/cms/services/{id}` |
| same | `archiveServiceAction` | Archive service | `archiveService` | `DELETE /api/cms/services/{id}` |
| `app/cms/documents/actions.ts` | `createDocumentAction` | Create document | `createDocument` | `POST /api/cms/documents` |
| same | `updateDocumentAction` | Update document | `updateDocument` | `PUT /api/cms/documents/{id}` |
| same | `archiveDocumentAction` | Archive document | `archiveDocument` | `DELETE /api/cms/documents/{id}` |
| `app/cms/users/actions.ts` | `updateUserRoleAction` | Change role (admin) | `updateUserRole` | **Not in proposed CMS API list** → recommend `PUT /api/cms/users/{id}` (role) |
| same | `updateUserActiveAction` | Activate/deactivate; may sign out self | `updateUserActive` + session delete | recommend `PUT /api/cms/users/{id}` (active) |

**Callers:**

| Action family | Caller |
|---|---|
| Pages | `components/cms-page-form.tsx` (`useActionState` + archive form) |
| News | `components/cms-news-form.tsx` |
| Events | `components/cms-event-form.tsx` |
| Services | `components/cms-service-form.tsx` |
| Documents | `components/cms-document-form.tsx` |
| Users | `app/cms/users/page.tsx` (`action={updateUserRoleAction}` / `updateUserActiveAction`) |

**Auth behavior to preserve in PHP (do not change product rules):**

- Viewer: no modify
- Editor: modify allowed; `enforcePublishingGate` forces draft if publish requested or existing is published
- Admin: full publish/archive; user admin

---

## 5. Internationalization

### next-intl usage

- Plugin: `next.config.mjs` → `createNextIntlPlugin('./i18n/request.ts')`
- Request config: `i18n/request.ts` reads `lang` cookie via `cookies()`, loads `messages/{locale}.json`
- Locales source: `i18n/locales.ts` ← `institutionConfig.languages`
- Provider: `app/layout.tsx` → `NextIntlClientProvider`
- Server: `getTranslations`, `getLocale`, `getMessages` across public + CMS
- Client: `useTranslations` in shell, forms, language switcher, institution site

### Locale routing

- **No locale-prefixed paths** (no `/en/...`). Confirmed in `i18n/request.ts` comments.
- Preference: `lang` cookie + optional `?lang=` (`LanguageSwitcher`, `getRequestLanguage`).
- Shared slug URLs across languages.

### Translation files

| File | Keys vs `en` |
|---|---|
| `messages/en.json` | 382 leaf keys |
| `messages/am.json` | Same key set |
| `messages/om.json` | Same key set |
| `messages/ha.json` | Same key set |

**Harari (`ha`) status:**

- First-class language in `lib/institution-config.ts` (`code: 'ha'`, label Harari / ሀረሪ).
- UI catalog exists and is key-complete vs English.
- **Content quality gap:** ~92 longer UI strings in `ha.json` are still identical to English (e.g. `cms.pages.newIntro`, many `seo.*` / `about.*` strings). Support is wired; copy is partially unfinished.
- Date formatting: `lib/content/public-format.ts` maps `ha` → `en-GB` because Intl has no Harari locale (comment documents this; not Hausa).
- CMS page content translations: JSONB `pages.translations` supports `am`/`om`/`ha` via `lib/content/page-translations.ts`. English stays in `title`/`content`.
- **News, events, services, documents have no translation JSONB** in schema — only pages. Multilingual CMS for those entities is not implemented yet (flag for separate translation audit; do not redesign here).

### What can remain in React

- `messages/*.json` (asset)
- `institutionConfig.languages`
- Pure helpers: `resolveLanguageCode`, `resolvePageContent`, `toIntlLocale`, `formatPublicDate`
- Language switcher UX (cookie + query) with router swap

### What depends on Next.js

- `next-intl` plugin / `getRequestConfig`
- Server `getTranslations` in RSC + actions
- `cookies()` in `i18n/request.ts` and `public-language.ts`
- `router.refresh()` after language change (RSC refresh)

**Do not remove or simplify i18n during migration.** Replace transport only.

---

## 6. Routing

### Current App Router map

| Route | Type | Purpose | Auth |
|---|---|---|---|
| `/` | static | Homepage aggregating published content | Public |
| `/about` | static | CMS page slug `about` | Public |
| `/contact` | static | Contact (config-driven) | Public |
| `/news`, `/news/[slug]` | list + dynamic | Published news | Public |
| `/events`, `/events/[slug]` | list + dynamic | Published events | Public |
| `/services`, `/services/[slug]` | list + dynamic | Published services | Public |
| `/resources`, `/resources/[slug]` | list + dynamic | Published documents | Public |
| `/[slug]` | dynamic | Other published CMS pages; reserved slugs blocked | Public |
| `/login` | static | Auth; redirects if session | Public / bounce |
| `/cms` | static | CMS dashboard | Session (any active role) |
| `/cms/content`, `/new`, `/[id]` | list/create/detail | Pages CMS | Session; mutate editor+ |
| `/cms/news`… | same pattern | News CMS | same |
| `/cms/events`… | same | Events CMS | same |
| `/cms/services`… | same | Services CMS | same |
| `/cms/documents`… | same | Documents CMS | same |
| `/cms/users` | static | User admin | Admin only (`requireAdmin`) |
| `/api/auth/[...all]` | catch-all | Better Auth HTTP API | Better Auth |
| `proxy.ts` matcher `/cms`, `/cms/:path*` | edge/proxy | Cookie presence gate | Cookie only (optimistic) |

**Dynamic segments found:**

- `[slug]` — public content
- `[id]` — CMS entity UUID
- `[...all]` — Better Auth catch-all
- No `[[...optional]]` routes

**Reserved slugs** (`app/[slug]/page.tsx`): `about`, `api`, `cms`, `events`, `login`, `news`, `resources`, `services`.

### Proposed React routing equivalents

| Current | Future (illustrative) |
|---|---|
| `/`, `/about`, `/contact`, `/news`, … | Same path strings in React Router |
| `/news/:slug`, `/events/:slug`, … | Same |
| `/resources/:slug` | Keep public path; data from `/api/documents/:slug` |
| `/:slug` | Catch-all page route **after** static routes; same reserved list |
| `/cms/*` | Nested layout + loader/guard calling `GET /api/auth/session` |
| `/login` | Same |
| `/api/auth/*` | Remove from React app; point to PHP origin |

**Protected routes today:**

1. Optimistic: `proxy.ts` redirects to `/login?next=…` if no Better Auth session cookie.
2. Authoritative: `app/cms/layout.tsx` → `requireSession`; role checks on pages/actions (`requireAdmin`, `requireEditorOrAdmin`, `canModifyContent`).

Both must be rebuilt: client guard + PHP enforcement.

### Dead / prototype routing note

`components/admin-site.tsx` links to `/admin/...` and is **not** wired into `app/` routes. Prototype only — do not migrate as live routes. **NEEDS VERIFICATION** if anything external still references it (no in-repo imports of AdminDashboard found beyond its own file).

---

## 7. Data Access

There is **no Prisma**. ORM is Drizzle. No general-purpose `fetch`/`axios` content client.

| Current mechanism | Location | Purpose | Target PHP endpoint |
|---|---|---|---|
| Drizzle `listPublished*` / homepage aggregations | `app/page.tsx` → `lib/content/{services,news,documents,events}` | Home sections | `GET /api/services`, `/news`, `/documents`, `/events` (+ compose client-side) |
| `getPublishedPageBySlug` | `app/about`, `app/[slug]` | Public pages + lang resolution | `GET /api/pages/{slug}?lang=` |
| `listPublishedNews` / `getPublishedNewsBySlug` | `app/news/*` | Public news | `GET /api/news`, `GET /api/news/{slug}` |
| Events/services/documents published lists & by slug | `app/events/*`, `services/*`, `resources/*` | Public catalogs | Matching public GETs |
| `listPages` / `getPageById` | CMS content pages | CMS read | `GET /api/cms/pages`, `GET /api/cms/pages/{id}` |
| `listNews` / `getNewsById` | CMS news | CMS read | `GET /api/cms/news`… **(list/get-by-id not listed in brief — needed)** |
| Same pattern services/events/documents | CMS `*/page.tsx`, `*/[id]` | CMS read | CMS GETs (list + by id) |
| Server actions create/update/archive | `app/cms/*/actions.ts` | CMS write | CMS POST/PUT/DELETE |
| `listUsers` / role / active | `lib/cms/users.ts` + users page/actions | User admin | CMS users API (to be added) |
| `getActiveInstitution` / `INSTITUTION_ID` | `lib/content/institution.ts` | Scope queries | `GET /api/institution` (+ server-side env on PHP) |
| Better Auth DB adapter | `lib/auth.ts` + schema `session`/`account`/`verification` | Auth storage | PHP sessions (may keep or replace tables — **NEEDS VERIFICATION** in later pass) |
| Config (not DB) | `lib/institution-config.ts` | Branding, nav, languages | Eventually align with `GET /api/institution` or keep build-time config until then |

**Typical current path:**

```text
UI page (RSC)
  → lib/content/* or lib/cms/*
  → drizzle-orm + postgres
  → PostgreSQL
```

**Target path:**

```text
UI component (CSR)
  → React API client (credentials: include)
  → PHP endpoint
  → PostgreSQL
```

**CMS list/detail GET gaps vs brief:** Proposed public GETs are clear; CMS brief lists POST/PUT/DELETE for news/events/services/documents but list/get-by-id are only spelled out for pages. Implementation will need CMS GET parity for all entities (already used by current UI).

---

## 8. Next API Routes

| Current route | Method | Auth | Purpose | PHP replacement |
|---|---|---|---|---|
| `/api/auth/[...all]` (`app/api/auth/[...all]/route.ts`) | `GET`, `POST` (via `toNextJsHandler(auth)`) | Better Auth session cookies | Sign-in, sign-out, session, and other Better Auth endpoints | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` |

**No other** `app/api/**` or `pages/api/**` routes exist.

Better Auth exposes more than three paths under the catch-all today. Exact subpaths are framework-defined. **NEEDS VERIFICATION** which Better Auth routes are hit in production beyond email sign-in / sign-out / session (client uses `authClient.signIn.email` and `authClient.signOut`).

---

## 9. Authentication Dependencies

```text
Login (client)
  LoginForm → authClient.signIn.email
    → Better Auth HTTP (Next route /api/auth/[...all])
    → DB: session + account (+ hook checks users.active)
    → HTTP-only session cookie (nextCookies plugin)
    → router.replace(nextPath) + router.refresh()

Session creation hooks
  lib/auth.ts databaseHooks.session.create.before
    → reject inactive users (APIError FORBIDDEN)

Optimistic CMS gate
  proxy.ts → getSessionCookie(request)
    → redirect /login?next=… if missing

Authoritative CMS gate
  app/cms/layout.tsx → requireSession('/cms')
    → auth.api.getSession({ headers })
    → inactive → signOut + /login?error=account_inactive

Role checks
  getSessionRole(session.user.role)
  requireAdmin / requireEditorOrAdmin / canModifyContent / enforcePublishingGate
  (server-only; never trust client)

Protected mutations
  Server actions call getAuthSession + role gates again

Logout
  cms-shell → authClient.signOut → /login
  Also: authz signOutQuietly; login page clears inactive session;
        updateUserActiveAction may sign out self

Session storage
  PostgreSQL `session` table (+ cookie token)
```

**Next.js-specific pieces:**

| Piece | File |
|---|---|
| `toNextJsHandler` | `app/api/auth/[...all]/route.ts` |
| `nextCookies()` plugin | `lib/auth.ts` |
| `headers()` for getSession/signOut | `lib/authz.ts`, login, users actions |
| `redirect()` on auth failure | `lib/authz.ts`, login |
| `proxy.ts` cookie gate | root `proxy.ts` |
| `authClient` + `router.refresh` | `lib/auth-client.ts`, login-form, cms-shell |

**Must move to PHP:** session create/validate/destroy, password verify, inactive checks, role enforcement on CMS APIs, secure cookie flags.

**May stay conceptual on React:** login form UX, CMS shell sign-out button, client route guards (non-authoritative).

---

## 10. Migration Risk Register

| Priority | Risk | Why |
|---|---|---|
| CRITICAL | Auth rewrite Better Auth → PHP sessions | Cookie format, CSRF, password hashes, session table compatibility, inactive-user hooks |
| CRITICAL | Zero content HTTP API today | Every public/CMS page must gain a client + PHP contract before Next removal |
| CRITICAL | Publishing gate + roles | Easy to regress editor publish / last-admin protections |
| HIGH | RSC → CSR data loading | Loading/error/404 and SEO (`generateMetadata`) behavior changes |
| HIGH | i18n transport change without dropping languages | Harari + cookie/`?lang=` must keep working; pages.translations resolution must move server-side in PHP for public pages |
| HIGH | CMS users API missing from endpoint brief | UI depends on it |
| HIGH | Cross-origin cookies if React and PHP differ by host | Need shared parent domain / reverse proxy same-origin |
| MEDIUM | Public `/resources` vs API `/documents` naming | Confusion / broken links if mapped naively |
| MEDIUM | Archive via DELETE vs status=`archived` | Current code soft-archives; PHP DELETE semantics must match |
| MEDIUM | Incomplete Harari UI copy | Not a blocker for wiring; quality gap remains |
| MEDIUM | `force-dynamic` + `revalidatePath` disappear | Replace with explicit client cache strategy (or none) |
| LOW | `next/image` | Unused |
| LOW | `admin-site.tsx` prototype | Dead weight; ignore or delete later |
| LOW | Contact page has no DB | Easy win |

---

## 11. Recommended Migration Order

1. **Freeze product rules** — roles, publish gate, archive semantics, locale cookie name `lang`, reserved slugs. (No redesign.)
2. **Translation schema audit** (already flagged) — pages JSONB vs other entities — before PHP schema freeze.
3. **Decide hosting topology** — same-origin reverse proxy vs separate API host (drives cookie/`credentials` design). *Ask before coding.*
4. **Implement PHP auth** — login / logout / session; port inactive + role fields; HTTP-only cookies.
5. **Implement public read APIs** — institution, pages, news, events, services, documents (published only).
6. **Implement CMS read APIs** — list + get-by-id for all entities + users (admin).
7. **Implement CMS write APIs** — mirror server actions + publishing gate server-side.
8. **Introduce React API client** — thin fetch wrapper; no UI rewrite yet.
9. **Carve one vertical slice** — e.g. public news list/detail on new React router calling PHP; keep Next for the rest **or** feature-flag. *Prefer one slice over big-bang.*
10. **Migrate CMS forms** — replace `useActionState(serverAction)` with API + local state; keep form UX.
11. **Replace next-intl** — keep message files; wire client provider + language switcher without `router.refresh` RSC.
12. **Remove Next** — `proxy.ts`, `app/api`, server actions, Drizzle-from-frontend, Better Auth Next adapters.
13. **Hardening** — CSRF if cookie auth cross-site, permission tests, Harari smoke tests, SEO review.

**Do not start PHP controllers until steps 1–3 answers are clear enough that endpoint shapes won’t thrash.**

---

## Final Migration Estimate

```text
Frontend code that can remain mostly unchanged:
  - Presentational UI in components/institution-site.tsx, public-detail.tsx, CMS form markup/CSS
  - messages/*.json key structure (all four locales)
  - Pure helpers: page-fields, page-translations (logic), public-format, institution-config
  - Public static assets under public/

Frontend code requiring modification:
  - All 'use client' components using next/link, next/navigation, next-intl, useActionState(server actions)
  - LanguageSwitcher (drop router.refresh RSC assumption)
  - LoginForm / CmsShell auth client calls
  - Route tables once React Router (or similar) is chosen

Frontend code requiring replacement:
  - Nearly all app/**/page.tsx and layouts (RSC data + auth + metadata)
  - All app/cms/**/actions.ts
  - lib/auth.ts, lib/auth-client.ts, lib/authz.ts (Next/Better Auth coupling)
  - Direct DB access from the frontend process (lib/db, lib/content/* query functions, lib/cms/users)
  - proxy.ts, app/api/auth/[...all], next.config next-intl plugin, generateMetadata helpers typed to next

Backend functionality that must move to PHP:
  - Session auth + inactive checks + role enforcement
  - All content CRUD/archive + publishing gate
  - User role/active management + last-admin guard + session revoke
  - Published content reads + page translation resolution by lang
  - Active institution resolution (today: INSTITUTION_ID env)

Next.js functionality that can be removed:
  - App Router RSC model, Server Actions, revalidatePath, proxy cookie gate
  - next-intl Next integration, next/link, next/navigation redirects/notFound
  - Better Auth Next adapter/route handler (library may leave with auth rewrite)
  - next/image (unused), Metadata API

Major migration blockers:
  1. Auth system rewrite (Better Auth → PHP sessions)
  2. No existing content API surface
  3. Deep RSC+Drizzle coupling on every content page
  4. CMS users endpoints omitted from current API brief
  5. Translation architecture for non-page entities still unresolved (separate audit)
```

---

## Decision questions (before Pass 4 / implementation)

These three answers materially change the architecture:

1. **Will React and PHP be same-origin** (e.g. nginx serves SPA + `/api` → PHP) or separate origins?
2. **Auth storage:** greenfield PHP sessions, or reuse/adapt existing Better Auth `session` / `account` password hashes?
3. **Frontend hosting model:** pure CSR SPA (Vite), or do you still need SSR/SEO HTML for public pages?

---

*End of Pass 3 audit. No implementation performed.*
