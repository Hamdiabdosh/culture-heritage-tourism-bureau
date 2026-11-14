# Frontend SPA (Vite)

React Router CSR app talking to the PHP API. Kept **outside** the Next.js pnpm workspace (use **npm** here).

## Local

```bash
# terminal 1 — API
docker compose up -d mysql api

# terminal 2 — SPA
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173** — Vite proxies `/api` → `http://127.0.0.1:8080`.

UI strings: `../messages/{en,am,om,ha}.json` via `LocaleProvider` (`lang` cookie + `?lang=`).  
Page body translations: `GET /api/pages/:slug?lang=`.  
Mutating API calls send `X-CSRF-Token` from the `egwp_csrf` cookie.

### Production-like nginx (gzip + cache)

```bash
cd frontend && npm run build
cd .. && docker compose --profile web up -d --build mysql api web
```

Open **http://127.0.0.1:8088** — nginx serves `dist/`, gzips text assets, long-caches `/assets/*`, proxies `/api` and `/sitemap.xml`.  
`robots.txt` ships from `public/robots.txt`. Privacy page: `/privacy`.

After deploy, spot-check TTFB with `curl -o /dev/null -s -w '%{time_starttransfer}\n' http://127.0.0.1:8088/` (target under 0.6s on a warm host).

### Adopting for another office

This SPA is a **template**. Per-office identity and content come from the MySQL/CMS API (`GET /api/institution`, news, services, …).

| What | Where |
|---|---|
| Name, tagline, contact | CMS / `institution` table (API) |
| Hero slideshow | Replace files in `public/hero/` and edit `src/lib/site-template.ts` |
| UI copy / languages | `messages/*.json` |
| Colours / type | `src/styles/app.css` CSS variables |

Do not hardcode a specific ministry name in components — read it from the API.

### Working routes

| Path | What |
|---|---|
| `/` | Home (services, news, featured event) |
| `/about` | CMS page `about` + office sidebar |
| `/contact` | Institution contact details |
| `/privacy` | Privacy policy |
| `/news` · `/news/:slug` | News |
| `/services` · `/services/:slug` | Services |
| `/events` · `/events/:slug` | Events |
| `/resources` · `/resources/:slug` | Documents (UI path `/resources`) |
| `/:slug` | Other published CMS pages |
| `/login` | Session login |
| `/cms` | CMS shell + overview (session) |
| `/cms/news` · `/new` · `/:id` | News CRUD |
| `/cms/content` · `/services` · `/events` · `/documents` | Entity list / create / edit+archive |
| `/cms/users` | Admin user roles / activation |

Dev logins: `admin@example.gov.et` / `Admin123!` (also `editor@…`).

Retired Next monolith: `../legacy/next/` (not part of this app).
