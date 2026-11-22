# Phase 2.3 — Decision closure report (Stage 1)

| | |
| --- | --- |
| **Date** | 2026-11-22 |
| **HEAD verified** | `bcd114e` |
| **Scope** | Documentation only — no application code, migrations, backfill, or deploy |
| **Architecture** | `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md` revision **5** |
| **Handoff** | `docs/architecture/PHASE_2_3_IMPLEMENTATION_HANDOFF.md` |

## 1. Purpose

Close open Phase 2.3 architecture decisions so implementation can proceed from a single authoritative register, without redesigning Revision 4 technical design.

## 2. Decisions closed in this stage

| ID | Resolution |
| --- | --- |
| REC1 | **Approved** — remove legacy public-media exceptions; all media needs rights + admin approval |
| REC2 | **Approved** — hide unverified covers at go-live; inventory + DB/storage backups + tested recovery |
| REC3 | **Approved** — append-only `media_rights_events` with reasons and DB trigger protection |
| D14 | **Approved** — static JPEG/PNG/WebP/GIF; reject animated; GD re-encode |
| D15 | **Approved** — 24 MP / 8,000 px edge / 2,560 px stored max |
| D16 | **Approved** — exact proposed licence ENUM (unchanged values) |
| D1, D2, D5, D9, D10, D11, D12 | **Approved** as previously documented recommendations (no new values) |
| D13 | **Approved / enforced** — storage outside public web root; `FULL_MIGRATION_MAP.md` updated |

## 3. Remains open

| ID | Status | Implementation default |
| --- | --- | --- |
| D6 | Bureau confirmation | Footer + About links only in 2.3 |
| D7 | Bureau confirmation | Documented entry-type vocabulary; labels via i18n |

## 4. Deferred

| ID | Status |
| --- | --- |
| D8 | Separate future slice — no migration runner in 2.3 |

## 5. Prior approvals retained

P1–P7 and A1–A8 remain approved and unchanged in substance. P5’s “no general audit log” stands; REC3 is the rights-only carve-out.

## 6. Documents updated

| File | Change |
| --- | --- |
| `docs/architecture/PHASE_2_3_CONTENT_MEDIA_ARCHITECTURE.md` | Revision 5 — register closed; pending language removed for approved items |
| `docs/architecture/PHASE_2_3_IMPLEMENTATION_HANDOFF.md` | **Created** — implementation contract |
| `docs/audits/PHASE_2_3_ARCHITECTURE_REPORT.md` | Revision 5 — closure + handoff pointer |
| `docs/FULL_MIGRATION_MAP.md` | D13 shared-host storage layout corrected |
| This file | Decision-closure record |

## 7. Consistency verification

| Check | Result |
| --- | --- |
| REC1–REC3 marked approved in architecture §11 and handoff | Yes |
| D14–D16 approved; ENUM values unchanged | Yes |
| D6/D7 open; D8 deferred | Yes |
| REC3 table required in `009` (no optional path) | Yes |
| D13 reflected in architecture + migration map | Yes |
| No application code changed | Yes |

## 8. Stage 1 gate

**Do not begin Stage 2 coding until this report and the handoff have been human-reviewed.**

After approval: start Workstream 1 (GD + storage security) per the handoff sequence.
