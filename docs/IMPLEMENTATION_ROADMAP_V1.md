# Culture, Heritage & Tourism Bureau
## Cursor Implementation Roadmap – V1

**Planning ready**  
**Existing repository**  
**Implementation not started**

| | |
| --- | --- |
| **Project** | Official Harari Culture, Heritage & Tourism Bureau Website |
| **Repository** | Hamdiabdosh/culture-heritage-tourism-bureau |
| **Roadmap date** | 21 November 2026 |

---

## 1. Implementation strategy

We will evolve the existing application, not rebuild it.

The guiding principles:

- Preserve the working React + Vite, PHP PDO and MySQL architecture.
- Preserve existing authentication, API and deployment infrastructure.
- Reuse working CMS functionality wherever possible.
- Correct the VisitHarar identity and replace tourism-first information architecture.
- Build institutional content management before polishing the public website.
- Implement multilingual content as a first-class feature.
- Require testing and an audit after every major phase.

### Execution workflow

1. **ChatGPT – Requirements & Project Management**  
   Define scope, acceptance criteria and implementation instructions.

2. **Cursor – Implementation**  
   Inspect, implement, test and report.

3. **ChatGPT – Independent Audit**  
   Review actual changes, security, architecture and test evidence.

4. **Approve → Commit → Next Phase**

We will not give Cursor the entire roadmap as one giant implementation task. Each phase gets a separate, scoped prompt. Otherwise, Cursor may enthusiastically redesign half the application while forgetting the database migration. A surprisingly common form of productivity.

---

## 2. Implementation phases

### 01 — Product identity and foundation

**Highest priority**

- Update `PRODUCT.md` and project documentation.
- Remove VisitHarar-specific branding and product assumptions.
- Establish official Bureau branding and institutional identity.
- Replace tourism-first navigation with institutional navigation.
- Review existing routes and identify reusable components.
- Review seed data and deployment configuration before changing them.

**Deliverable:** A correctly identified Bureau application with an approved information architecture.  
**Acceptance:** No unintended VisitHarar branding or tourism-first navigation remains.

### 02 — Institutional content architecture

- Create institutional profile content.
- Add history, mission and vision.
- Add leadership and organizational structure.
- Define Culture and Heritage content categories.
- Support historical sites, cultural practices, arts and traditions.
- Reuse news, events, publications and services where appropriate.
- Introduce necessary database migrations and API endpoints.

**Deliverable:** A proper institutional content model and functional CMS.  
**Acceptance:** Authorized staff can manage institutional information without developer intervention.

### 03 — Multilingual content management

- Support English, Amharic, Afaan Oromo and Harari.
- Extend translations to news, events, documents and institutional content.
- Establish fallback behavior for untranslated content.
- Implement language-aware URLs or equivalent reliable routing.
- Test RTL layout and typography.
- Ensure language switching preserves the current page where possible.

**Deliverable:** A genuinely multilingual website and CMS.  
**Acceptance:** Public content and administrative workflows support the four languages consistently.

### 04 — CMS administration and governance

- Review and improve user management.
- Introduce configurable permissions where justified.
- Define contributor, editor and approver workflows.
- Add content review and approval states.
- Implement append-only audit logs.
- Improve media and document management.
- Protect sensitive administrative operations.

**Deliverable:** An institutional CMS with accountability and controlled publishing.  
**Acceptance:** Every sensitive administrative action is authorized and auditable.

### 05 — Public website UI/UX

- Institutional homepage.
- About the Bureau.
- Culture and heritage pages.
- News and announcements.
- Events and publications.
- Public services.
- Contact and office information.
- Responsive design and accessibility.

**Deliverable:** A professional public-facing institutional website.  
**Acceptance:** Bureau stakeholders can navigate, understand and access the institution's information easily.

### 06 — Quality assurance and production release

- Database migration verification.
- API and authorization testing.
- Multilingual content testing.
- Responsive and accessibility testing.
- SEO, metadata and sitemap verification.
- Performance and security audit.
- Backup and recovery verification.
- Production deployment and acceptance testing.

**Deliverable:** V1 production release.  
**Acceptance:** All release-critical requirements pass with documented evidence.

---

## 3. Phase dependencies

The implementation order is deliberate.

```text
01 Product Identity & Foundation
        ↓
02 Institutional Content Architecture
        ↓
   ┌────┴────┐
   ↓         ↓
03 Multilingual   04 CMS Governance
   Content
   └────┬────┘
        ↓
05 Public Website UI/UX
        ↓
06 QA & Production Release
        ↓
   V1 Acceptance
```

Phases 3 and 4 can overlap after Phase 2, but both must be completed before final UI integration and acceptance.

---

## 4. Engineering rules for Cursor

These rules apply to every implementation phase.

| Area | Rule |
| --- | --- |
| Architecture | Preserve existing stack |
| Database | Additive, versioned migrations |
| Existing data | Never delete production data to simplify migration |
| API | Maintain consistent validation and error handling |
| Security | Enforce permissions server-side |
| Frontend | Reuse existing design system and components |
| Translations | No hardcoded user-facing strings |
| Testing | Run relevant tests after each change |
| Git | No automatic commits or pushes without approval |
| Documentation | Update relevant technical documentation |
| Scope | Do not implement unrelated features |

**Important:** Cursor must inspect the actual code before implementation. The earlier audit identified potential issues, but it was not a substitute for executing the project and verifying its runtime behavior.

---

## 5. Phase completion protocol

Every phase must produce a completion report containing:

- What was implemented.
- Files created, modified and removed.
- Database migrations and schema changes.
- API changes.
- Security implications.
- Tests executed and actual results.
- Known issues and remaining work.
- Git status and commit information.

A phase is not complete simply because Cursor says it is complete.

---

## 6. Release scope: what belongs in V1?

To prevent scope creep, these are our boundaries.

| Feature | V1 decision |
| --- | --- |
| Official institutional website | Include |
| Four-language support | Include |
| Institutional CMS | Include |
| User roles and permissions | Include |
| Content approval and audit | Include |
| Culture and heritage archive | Include |
| Advanced tourism booking | Exclude |
| Online payments | Exclude |
| Hotel and tour reservations | Exclude |
| Complex visitor management | Exclude |
| Native mobile application | Exclude |

PWA readiness can remain, but a separate mobile application is not a V1 requirement.

---

## 7. Project tracking

### Implementation tracker

Update each phase as work progresses.

| Phase | Status | Notes |
| --- | --- | --- |
| Baseline inspection | Not started | Verify build, tests, deployment configuration and existing database state. |
| 01. Product identity | Not started | Official Bureau branding, documentation and navigation. |
| 02. Content architecture | Not started | Institutional entities, database and CMS APIs. |
| 03. Multilingual | Not started | Four-language content and RTL. |
| 04. CMS governance | Not started | Permissions, approval and audit. |
| 05. Public website | Not started | Institutional frontend and UX. |
| 06. QA and release | Not started | Testing, security, deployment and acceptance. |

Status values: **Pending** · **Working** · **Done**

---

## 8. Immediate next action

Before Phase 1, I recommend a short baseline inspection with Cursor:

- Confirm the current Git branch and working tree.
- Run the existing frontend production build.
- Run available PHP checks and CMS smoke tests.
- Inspect the current database schema and migration state.
- Identify broken or outdated tests.
- Record the baseline without modifying application code.
