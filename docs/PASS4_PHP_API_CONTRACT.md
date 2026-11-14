# Pass 4 — PHP API Contract

**Status:** Contract + stubs only (no business logic, no MySQL DDL)  
**Date:** 2026-10-11  
**Authority:** `docs/FULL_MIGRATION_MAP.md` §1, §3, §5; `docs/PASS3_FRONTEND_MIGRATION_AUDIT.md` (server actions → endpoints)  
**Skeleton:** `backend/`

---

## 0. Conventions

| Concern | Rule |
|---|---|
| Origin | Same-origin shared PHP hosting; SPA + `/api/*` |
| Front controller | `public_html/api/index.php` (repo: `backend/public/index.php`) |
| Content-Type | Request/response `application/json` (except empty logout body) |
| Auth cookie | HTTP-only, `Secure` (HTTPS), `SameSite=Lax`, `Path=/` |
| Credentials | Browser `fetch(..., { credentials: 'include' })` |
| Roles | `viewer` \| `editor` \| `admin` (`viewer+` = any authenticated active role) |
| Status enum | `draft` \| `published` \| `archived` |
| DELETE semantics | Soft archive → set `status` to `archived` (no hard delete) |
| Public docs API | `/api/documents` (UI path `/resources` is frontend-only) |
| IDs | UUID strings (`CHAR(36)`) |
| Timestamps | ISO-8601 UTC strings in JSON; MySQL stores `DATETIME(3)` UTC |
| Active institution | Server config / env (`INSTITUTION_ID`); scopes all content queries |

### Error shape (locked)

```json
{
  "error": {
    "code": "VALIDATION|CONFLICT|NOT_FOUND|FORBIDDEN|UNAUTHORIZED|NOT_IMPLEMENTED|METHOD_NOT_ALLOWED",
    "message": "Human-readable explanation."
  }
}
```

| HTTP | Typical `code` |
|---|---|
| 400 | `VALIDATION` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 405 | `METHOD_NOT_ALLOWED` |
| 409 | `CONFLICT` |
| 501 | `NOT_IMPLEMENTED` (stubs) |

Success responses use the shapes below; list endpoints return `{ "items": [ ... ] }` unless noted.

---

## 1. Auth

Cookie name: implementation choice (e.g. `egwp_session`); store **hash** of token in DB, not raw value. New PHP session rows (not Better Auth runtime).

### `POST /api/auth/login`

| | |
|---|---|
| Auth | Public |
| Request | `{ "email": string, "password": string }` |
| Success | `200` `{ "user": { "id", "name", "email", "role" } }` + `Set-Cookie` |
| Errors | `400` validation; `401` bad credentials / inactive; `403` if policy rejects |

Rules: no public sign-up; inactive user → login fails; on success create session row + HTTP-only cookie.

### `POST /api/auth/logout`

| | |
|---|---|
| Auth | Session (idempotent if already logged out) |
| Request | — (empty body OK) |
| Success | `200` `{ "ok": true }` + clear cookie |
| Errors | rarely needed; may return `200` even without session |

### `GET /api/auth/session`

| | |
|---|---|
| Auth | Cookie optional |
| Success | `200` `{ "user": { "id", "name", "email", "role" } }` or `{ "user": null }` |
| Side effect | Inactive user → destroy session → `{ "user": null }` |

---

## 2. Public reads (published only)

No auth. Unpublished / archived → omit from lists; by-slug → `404`.

### `GET /api/institution`

| | |
|---|---|
| Auth | Public |
| Success | `200` institution object (active row): `{ "id", "name", "shortName", "tagline", "description", "eyebrow", "address", "phone", "email", "hours" }` |

### `GET /api/pages`

| | |
|---|---|
| Auth | Public |
| Query | `lang` optional (`en`\|`am`\|`om`\|`ha`) |
| Success | `200` `{ "items": [ { "id", "slug", "title", "status", "updatedAt", ... } ] }` published only; titles may resolve via translations when `lang` set |

### `GET /api/pages/{slug}`

| | |
|---|---|
| Auth | Public |
| Query | `lang` optional |
| Success | `200` page with resolved `title`/`content` (English fallback per `resolvePageContent`) |
| Errors | `404` not found / not published |

### `GET /api/news` · `GET /api/news/{slug}`

Published news list / detail. No translation JSON.

### `GET /api/events` · `GET /api/events/{slug}`

Published events. List ordering: upcoming-first (port current logic). `eventDate` ISO-8601 UTC.

### `GET /api/services` · `GET /api/services/{slug}`

Published services. Arrays: `requiredDocuments`, `process`.

### `GET /api/documents` · `GET /api/documents/{slug}`

Published documents. UI mounts at `/resources`; API stays `/api/documents`.

---

## 3. CMS — pages

All require valid session cookie. Role column = minimum role.

| Method | Path | Role | Request | Success |
|---|---|---|---|---|
| GET | `/api/cms/pages` | viewer+ | — | `200` `{ "items": Page[] }` all statuses for institution |
| GET | `/api/cms/pages/{id}` | viewer+ | — | `200` Page |
| POST | `/api/cms/pages` | editor+ | PageBody | `201` Page |
| PUT | `/api/cms/pages/{id}` | editor+ | PageBody | `200` Page |
| DELETE | `/api/cms/pages/{id}` | editor+ | — | `200` Page (status `archived`) |

**PageBody**

```json
{
  "title": "string",
  "slug": "string",
  "content": "string|null",
  "status": "draft|published|archived",
  "translations": {
    "am": { "title": "string", "content": "string" },
    "om": { "title": "string", "content": "string" },
    "ha": { "title": "string", "content": "string" }
  }
}
```

- Never store `en` inside `translations` (English lives in `title`/`content`).
- Slug: lowercase letters, numbers, hyphens; unique per institution.
- Errors: `400` validation; `401`; `403` role/gate; `404`; `409` slug conflict.

---

## 4. CMS — news / events / services / documents

Same verb/role pattern for `{entity}` ∈ `news` | `events` | `services` | `documents`.

| Method | Path | Role |
|---|---|---|
| GET | `/api/cms/{entity}` | viewer+ |
| GET | `/api/cms/{entity}/{id}` | viewer+ |
| POST | `/api/cms/{entity}` | editor+ |
| PUT | `/api/cms/{entity}/{id}` | editor+ |
| DELETE | `/api/cms/{entity}/{id}` | editor+ (soft archive) |

### Bodies

**News**

```json
{
  "title": "string",
  "slug": "string",
  "summary": "string",
  "category": "string",
  "content": "string",
  "status": "draft|published|archived"
}
```

**Events**

```json
{
  "title": "string",
  "slug": "string",
  "summary": "string",
  "content": "string",
  "eventDate": "string",
  "location": "string",
  "type": "string",
  "status": "draft|published|archived"
}
```

`eventDate`: client sends datetime string; PHP applies current EAT wall-clock parsing rules (port from `lib/content/events.ts`); persist UTC.

**Services**

```json
{
  "title": "string",
  "slug": "string",
  "summary": "string",
  "description": "string",
  "category": "string",
  "responsibleOffice": "string",
  "eligibility": "string",
  "requiredDocuments": ["string"],
  "process": ["string"],
  "contact": "string",
  "icon": "string",
  "status": "draft|published|archived"
}
```

**Documents**

```json
{
  "title": "string",
  "slug": "string",
  "summary": "string",
  "category": "string",
  "year": "string",
  "fileUrl": "string",
  "fileType": "string",
  "fileSize": "string",
  "status": "draft|published|archived"
}
```

`fileUrl`: empty, root-relative `/...`, or `http(s)://` — reject `javascript:`, `data:`, protocol-relative.

POST → `201` entity; PUT/DELETE → `200` entity; GET list → `{ "items": [...] }`.

---

## 5. CMS — users

| Method | Path | Role | Request | Success |
|---|---|---|---|---|
| GET | `/api/cms/users` | admin | — | `200` `{ "items": [ { "id", "name", "email", "role", "active", "createdAt", "updatedAt" } ] }` |
| PUT | `/api/cms/users/{id}` | admin | `{ "role"?: "admin\|editor\|viewer", "active"?: boolean }` | `200` user object |

Rules:

- At least one of `role` / `active` required.
- Cannot remove / demote last active admin → `409` `CONFLICT` (or `403` if preferred; lock **409**).
- Deactivating user deletes their sessions.
- Self-deactivate → current session ended (`200` then client treats as logged out; subsequent calls `401`).

---

## 6. Publishing gate (every CMS write)

Applied server-side on POST/PUT (and any path that sets `status`). DELETE archive is allowed for editor+ (sets `archived`).

```text
admin  → requested status allowed as-is
editor → if requested status == published OR existing row status == published
         → force status to draft before save
viewer → 403 FORBIDDEN on all writes (POST/PUT/DELETE)
```

Unauthenticated CMS → `401 UNAUTHORIZED`. Wrong role → `403 FORBIDDEN`.

---

## 7. Reserved page slugs

Must not be treated as CMS catch-all public pages in the SPA (UI concern). API may still store a page with slug `about` (used by `/about`). Reserved for **frontend routing**, not API reject list unless product later forbids create:

`about`, `api`, `cms`, `events`, `login`, `news`, `resources`, `services`

Contract note for Agent C: public `GET /api/pages/{slug}` serves published pages including `about`; SPA must not mount catch-all `/:slug` for the reserved set above.

---

## 8. CSRF (mutating routes)

Cookie session auth is CSRF-sensitive (map risk R4 / open item §12.6).

**Contract for mutating routes** (`POST` / `PUT` / `DELETE` under `/api/auth/logout`, `/api/cms/*`, and login is less CSRF-critical but may still send token):

| Approach (v1 preference) | Double-submit cookie **or** synchronizer token |
|---|---|
| Header | `X-CSRF-Token: <token>` |
| Cookie (if double-submit) | readable CSRF cookie; value must match header |
| Failure | `403` `{ "error": { "code": "FORBIDDEN", "message": "Invalid CSRF token." } }` |

Exact approach **NEEDS VERIFICATION** with host/SPA (map §12.6). Stubs do not enforce CSRF yet; implement before production CMS writes.

`SameSite=Lax` alone is not sufficient for all cases; treat CSRF as required for CMS mutations.

---

## 9. Full endpoint index

| # | Method | Path | Auth |
|---|---|---|---|
| 1 | POST | `/api/auth/login` | Public |
| 2 | POST | `/api/auth/logout` | Session |
| 3 | GET | `/api/auth/session` | Optional cookie |
| 4 | GET | `/api/institution` | Public |
| 5 | GET | `/api/pages` | Public |
| 6 | GET | `/api/pages/{slug}` | Public |
| 7 | GET | `/api/news` | Public |
| 8 | GET | `/api/news/{slug}` | Public |
| 9 | GET | `/api/events` | Public |
| 10 | GET | `/api/events/{slug}` | Public |
| 11 | GET | `/api/services` | Public |
| 12 | GET | `/api/services/{slug}` | Public |
| 13 | GET | `/api/documents` | Public |
| 14 | GET | `/api/documents/{slug}` | Public |
| 15 | GET | `/api/cms/pages` | viewer+ |
| 16 | GET | `/api/cms/pages/{id}` | viewer+ |
| 17 | POST | `/api/cms/pages` | editor+ |
| 18 | PUT | `/api/cms/pages/{id}` | editor+ |
| 19 | DELETE | `/api/cms/pages/{id}` | editor+ |
| 20 | GET | `/api/cms/news` | viewer+ |
| 21 | GET | `/api/cms/news/{id}` | viewer+ |
| 22 | POST | `/api/cms/news` | editor+ |
| 23 | PUT | `/api/cms/news/{id}` | editor+ |
| 24 | DELETE | `/api/cms/news/{id}` | editor+ |
| 25 | GET | `/api/cms/events` | viewer+ |
| 26 | GET | `/api/cms/events/{id}` | viewer+ |
| 27 | POST | `/api/cms/events` | editor+ |
| 28 | PUT | `/api/cms/events/{id}` | editor+ |
| 29 | DELETE | `/api/cms/events/{id}` | editor+ |
| 30 | GET | `/api/cms/services` | viewer+ |
| 31 | GET | `/api/cms/services/{id}` | viewer+ |
| 32 | POST | `/api/cms/services` | editor+ |
| 33 | PUT | `/api/cms/services/{id}` | editor+ |
| 34 | DELETE | `/api/cms/services/{id}` | editor+ |
| 35 | GET | `/api/cms/documents` | viewer+ |
| 36 | GET | `/api/cms/documents/{id}` | viewer+ |
| 37 | POST | `/api/cms/documents` | editor+ |
| 38 | PUT | `/api/cms/documents/{id}` | editor+ |
| 39 | DELETE | `/api/cms/documents/{id}` | editor+ |
| 40 | GET | `/api/cms/users` | admin |
| 41 | PUT | `/api/cms/users/{id}` | admin |

**Total: 41 endpoints.**

---

## 10. Server-action → endpoint map (Pass 3)

| Server action | Endpoint |
|---|---|
| `createPageAction` | `POST /api/cms/pages` |
| `updatePageAction` | `PUT /api/cms/pages/{id}` |
| `archivePageAction` | `DELETE /api/cms/pages/{id}` |
| `createNewsAction` / update / archive | `POST`/`PUT`/`DELETE /api/cms/news…` |
| events / services / documents actions | same pattern |
| `updateUserRoleAction` / `updateUserActiveAction` | `PUT /api/cms/users/{id}` |
| `authClient.signIn.email` | `POST /api/auth/login` |
| `authClient.signOut` | `POST /api/auth/logout` |
| `auth.api.getSession` | `GET /api/auth/session` |

---

## 11. Blocked on Agent A (schema)

Implementation of controllers (post-stub) waits on Agent A MySQL DDL for:

- `institutions`, `users`, `account`, PHP `session` (or `php_sessions`), `pages`, `news`, `events`, `services`, `documents`
- ENUM values for `user_role` / `content_status`
- JSON columns for page translations and service arrays
- Password column on `account` (scrypt verify params still NEEDS VERIFICATION)

No SQL files are produced in this pass (Agent B lane).

---

*End of Pass 4 PHP API contract.*
