# Pass 4 — Agent task board

Authority: `docs/FULL_MIGRATION_MAP.md`

| Agent | Lane | Owns | Must not touch | Deliverables |
|---|---|---|---|---|
| **A — Database** | Postgres → MySQL | `database/mysql/*`, `docs/PASS4_MYSQL_SCHEMA.md` | PHP controllers, React/Next UI | `001_schema.sql`, seed placeholder, schema notes |
| **B — PHP** | API contract + stubs | `backend/*`, `docs/PASS4_PHP_API_CONTRACT.md` | MySQL DDL, Next `app/` | Contract doc, front controller, stub controllers |
| **C — React** | SPA map + client stub | `docs/PASS4_REACT_SPA_MAP.md`, optional `frontend/` stub | MySQL SQL, PHP business logic, Next rewrites | Route/fate map, thin `api-client` stub |

## Integration order after agents finish

1. Review Agent A SQL against map §2  
2. Align Agent B routes with A table names  
3. Align Agent C client paths with B contract  
4. Then implement real PHP auth (Pass 7) — not before schema accept  

## Status

- Agents launched in parallel (background)
- Next.js monolith left intact
