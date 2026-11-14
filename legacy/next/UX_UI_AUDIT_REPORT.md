# Government Website UI/UX Audit

---

## 1. Executive Summary

This audit evaluates the **Ethiopian Government Website Platform** (`Hamdiabdosh/gov-website-template`), deployed locally representing the **National Public Service Office (NPSO)** of the Federal Democratic Republic of Ethiopia. The assessment was performed from the perspective of external citizens (desktop, mobile, accessibility) and internal public servants (CMS editors and administrators).

### Overall Experience
The platform establishes a dignified, sober, and unmistakably official presence. Its aesthetic choices—deep Ethiopian federal green (`#173c34`), warm cream background (`#f7f7f2`), restrained gold accents (`#d9a441`), and classic Georgia serif typography—instill immediate institutional trust. Content hierarchy is clear, performance is snappy, and the motion system is calm, deliberate, and accessible.

However, several critical gaps break the public-service experience:
1. **No CMS Sign-Out Mechanism:** There is no "Log Out" or "Sign Out" button anywhere in the CMS interface, stranding public servants on shared office computers.
2. **Missing Service Detail Fields:** The public service detail page silently drops critical citizen-facing data entered in the CMS (eligibility, required documents, responsible office, and contact details).
3. **Mobile Navigation Black Hole:** The mobile header hides the "Contact" link entirely, and the mobile navigation drawer omits both "Contact" and "Events", leaving mobile citizens unable to find contact information without scrolling to the footer.
4. **Orphaned Events Section:** The `/events` route has no permanent entry point in the primary navigation or footer, making it undiscoverable when no event is featured.
5. **Multilingual Disconnect:** Switching languages sets a cookie and query parameter, but the static UI (navigation, headings, buttons, footer), services, news, events, and documents remain 100% in English. Furthermore, the `<html>` tag remains hardcoded to `lang="en"`, and no Ethiopic system/web fonts are specified.
6. **Unbranded 404 Dead End:** Mistyped or broken links hit Next.js’s raw unstyled developer error fallback (`NEXT_HTTP_ERROR_FALLBACK;404`) with zero recovery navigation.

### General Maturity Level
**Early Production-Ready Core / High-Fidelity Template.** The foundations are solid, clean, and appropriately restrained. Addressing a small, focused set of usability and information architecture fixes will elevate it to an exemplary public-service standard without requiring architectural changes or feature creep.

---

## 2. What Works Well (Preserve & Protect)

* **Institutional Dignity & Visual Restraint:** The visual language avoids generic templates and corporate software tropes. The color palette (dark green, muted sage, cream, gold) conveys public authority, sober governance, and calm reliability.
* **Calm Motion System:** Entrance animations (`.motion-enter`) and scroll reveals (`.reveal`) are subtle, unobtrusive, and respect user focus. When `prefers-reduced-motion: reduce` is activated, animations and transitions cleanly collapse to static presentation.
* **Skip-to-Main-Content Implementation:** The keyboard accessibility skip link (`#main-content`) is implemented, hidden off-screen until focused, and functional.
* **Direct Content Slicing on About Page:** The narrative tone of the mandate, public value commitment, and priority pillars effectively communicates the organization's purpose within seconds.
* **Clear Role-Based Access Control Structure:** The CMS cleanly separates Admin, Editor, and Viewer privileges, disabling mutation controls for viewers and protecting the last active administrator from accidental lockout.
* **Lightweight Performance:** Server components and minimal client-side JavaScript ensure rapid page loads and near-instant navigation without heavy layout shifts.

---

## 3. Critical Findings (P0 / P1 Only)

### [CRIT-01] No Sign-Out Button in CMS Interface
* **Severity:** **P0** (Security & Essential Usability)
* **Location:** CMS Topbar & Sidebar (`components/cms-shell.tsx`)
* **Impact:** Once signed in at `/login`, a government worker using a shared office workstation has **no way to log out**. The topbar displays user initials and role name, but provides no menu, dropdown, or sign-out action. The session remains active until cookie expiration or terminal intervention.

### [CRIT-02] Public Service Detail Page Drops Essential Citizen Data
* **Severity:** **P1** (Core Public Service Delivery)
* **Location:** Public Route (`app/services/[slug]/page.tsx`) & Component (`components/institution-site.tsx`)
* **Impact:** The CMS allows editors to input **Responsible Office**, **Eligibility**, **Required Documents**, and **Contact**. However, `app/services/[slug]/page.tsx` only passes `title`, `summary`, `description`, `category`, and `process` to `ServiceDetailPage`. Citizens visiting a service page never see what documents they must bring, whether they are eligible, or whom to contact.

### [CRIT-03] Mobile Header Hides "Contact" and Mobile Drawer Omits Both "Contact" and "Events"
* **Severity:** **P1** (Mobile Usability & Information Access)
* **Location:** Responsive CSS (`app/globals.css:56`) & Config (`lib/institution-config.ts:48`)
* **Impact:** At viewports $\le 800\text{px}$, `.utility-links a` is set to `display: none`, removing the "Contact" link from the top bar. The hamburger menu pulls navigation items from `institutionConfig.navigation` which only lists `Home`, `About us`, `Services`, `News & updates`, and `Resources`. A mobile citizen cannot find the Contact page or the Events calendar in the navigation.

### [CRIT-04] Raw Unbranded 404 Fallback Page
* **Severity:** **P1** (User Recovery & Official Trust)
* **Location:** Route Root (`app/not-found.tsx` is completely missing)
* **Impact:** Requesting any nonexistent URL (e.g. `/services/old-slug` or mistyped URL) displays the unstyled developer-style `NEXT_HTTP_ERROR_FALLBACK;404` (`404 | This page could not be found.`). There is no header, no institution branding, no return button, and no recovery navigation.

### [CRIT-05] Complete Orphan of Events Section
* **Severity:** **P1** (Information Architecture)
* **Location:** Header Navigation, Footer (`components/institution-site.tsx`), and Homepage
* **Impact:** The `/events` route is not linked in the main desktop navigation, mobile drawer, or footer. On the homepage, if no event is currently featured, the section reads "No upcoming published events yet" with no link to the full calendar. The entire Events section is unreachable without manually modifying the URL.

---

## 4. UX Findings Table

| ID | Area | Finding | User Impact | Severity | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UX-01** | CMS Auth | No sign-out / logout action anywhere in CMS | User cannot terminate session on shared computers | **P0** | `components/cms-shell.tsx:184-189` |
| **UX-02** | Services | Service detail page omits required documents, eligibility, and responsible office | Citizen visits government website to find requirements before visiting an office, but information is missing | **P1** | `app/services/[slug]/page.tsx:22-32` |
| **UX-03** | Mobile Nav | "Contact" is hidden on mobile header and omitted from mobile menu drawer | Mobile citizens looking for office contact details cannot find them in the menu | **P1** | `app/globals.css:56` & `lib/institution-config.ts:48` |
| **UX-04** | Error State | Missing `not-found.tsx` causes raw Next.js 404 | Dead-end screen with no institutional identity or recovery path | **P1** | HTTP GET `/non-existent-page` |
| **UX-05** | Nav / IA | Events section is orphaned from all menus | Citizens cannot browse past or upcoming events unless an event is featured on the homepage | **P1** | `lib/institution-config.ts:48` |
| **UX-06** | Multilingual | Static UI and structured modules (News, Services, Events, Docs) do not translate | Citizen selecting Amharic or Afan Oromo still sees 95% English UI | **P1** | `components/institution-site.tsx:48` |
| **UX-07** | SEO / Titles | Root `<title>` fallback is "Government Website Platform" on most subpages | Citizen browser tabs and bookmarks show developer platform name instead of page/institution name | **P2** | `app/layout.tsx:5` & subpage audits |
| **UX-08** | Accessibility | Focus ring color (`#d9a441`) on white backgrounds has 2.25:1 contrast ratio | Low-vision keyboard users struggle to see focus location (fails WCAG 1.4.11 3:1 requirement) | **P2** | `app/globals.css:230` |
| **UX-09** | Services | Services directory filter buttons are completely non-functional dummy buttons | Citizen clicks "Applications and forms" or "Guidance" and nothing happens | **P2** | `components/institution-site.tsx:597-602` |
| **UX-10** | Services | Directory empty state says "No published services match your search" before user searches | Confusing feedback when visiting an empty directory without typing | **P2** | `components/institution-site.tsx:610` |
| **UX-11** | Contact UX | Working hours are missing on `/contact` page (only exist in `/about` sidebar) | Citizens visiting the contact page cannot see office hours | **P2** | `components/institution-site.tsx:723-745` |
| **UX-12** | Contact UX | Phone and email are duplicated immediately below each other as text and buttons | Visual clutter and redundant controls on contact page | **P3** | `components/institution-site.tsx:744-765` |
| **UX-13** | CMS UX | Dashboard greets admin as "Welcome, CMS" | First name extraction takes first word of "CMS Admin", resulting in awkward greeting | **P3** | `components/cms-dashboard.tsx:67` |
| **UX-14** | CMS UX | Deactivate user action has no confirmation dialog | Admin can accidentally deactivate a user with a single click | **P2** | `app/cms/users/page.tsx:86-95` |
| **UX-15** | CMS UX | Forbidden route redirects to `/cms?error=forbidden` silently | User denied access is dumped on Overview with no feedback banner | **P2** | `app/cms/page.tsx:5-17` |
| **UX-16** | Trust / Brand | Contractor credit typo: "RAAFAT-Technolgies" on login card and CMS sidebar | Commercial link with typo reduces official credibility of government portal | **P2** | `src/components/brand/built-by-raafat.tsx:17` |
| **UX-17** | Custom Pages | Dynamic CMS pages (`/[slug]`) lack back links and breadcrumbs | Citizen navigating to a custom page has no direct path back to parent listing | **P3** | `app/[slug]/page.tsx:52-70` |
| **UX-18** | Typography | No Ethiopic font family declared; `html` tag hardcoded `lang="en"` | Amharic/Harari text renders with uneven system fallbacks; screen readers fail | **P2** | `app/layout.tsx:41` & `app/globals.css:25` |

---

## 5. Navigation & Information Architecture

### What Works
* Primary navigation on desktop is concise (5 items: Home, About us, Services, News & updates, Resources).
* Breadcrumb and back-link patterns on `/news/[slug]`, `/services/[slug]`, `/events/[slug]`, and `/resources/[slug]` provide clear upstream pathways (`← Back to news`, `← All services`, etc.).
* Skip link allows direct keyboard access to `#main-content`.

### Confusing Areas & Deficiencies
1. **The Events Island:**
   * *User Expectation:* An official government site with an Events calendar would list "Events" under the main navigation or at least in the footer.
   * *Actual Behavior:* "Events" is absent from desktop nav, mobile nav, and footer links.
   * *Why Confusing:* Citizens seeking public meetings, hearings, or holiday announcements cannot find the calendar unless an event is featured on the homepage.
2. **Contact Split-Brain:**
   * *User Expectation:* "Contact" is easily accessible across desktop and mobile.
   * *Actual Behavior:* On desktop, "Contact" sits in the utility bar above the header. On mobile, the utility bar suppresses the link (`display: none`), and the hamburger menu does not include it.
   * *Why Confusing:* A citizen on a smartphone cannot find the Contact page in the navigation.
3. **Dead-End Filter Buttons in Services:**
   * *User Expectation:* Clicking "Applications and forms" in the Services directory filters the list.
   * *Actual Behavior:* The buttons are unclickable `<button>` tags without event handlers.
   * *Why Confusing:* Citizens assume the website is broken or unresponsive.
4. **Reserved Slugs Omission:**
   * `app/[slug]/page.tsx` checks a reserved set (`about`, `api`, `cms`, `events`, `login`, `news`, `resources`, `services`), but omits `contact`. If an editor creates a CMS page titled "Contact" with slug `contact`, routing conflicts occur.

---

## 6. Visual Design

### Typography
* **Hierarchy:** Strong contrast between Georgia headings and Arial/system sans-serif body text.
* **Line Lengths:** Reading columns on articles and about pages are properly constrained (`max-width: 650px` - `700px`), preventing excessive line length.
* **Script Support Gap:** Ethiopic characters (Amharic `አማርኛ`, Harari `ሀረሪ`) are rendered through default OS fallbacks because no Ethiopic webfont (e.g. Noto Sans Ethiopic) is specified. This leads to inconsistent letter spacing, irregular baseline heights, and variable glyph weight on Linux and Android devices.

### Spacing & Layout
* Layout rhythm is balanced with standard section padding (`90px` desktop, `62px` mobile).
* Container width (`width: min(1160px, calc(100% - 48px))`) centers cleanly without awkward margins on wide displays.
* Content grids adapt appropriately from multi-column to single-column.

### Color & Contrast
* Primary palette (`#173c34`, `#d9a441`, `#f7f7f2`) matches public-service dignity.
* **Contrast Vulnerabilities:**
  * Eyebrow labels (`#6a8075` on `#ffffff`): 4.24:1 (fails WCAG AA 4.5:1 for small text).
  * Category tags (`#997021` on `#ffffff`): 4.47:1 (borderline fail for 10px text).
  * Side card labels (`#75877c` on `#e9efe8`): 3.26:1 (fails WCAG AA).
  * Keyboard focus outline (`#d9a441` on `#ffffff`): 2.25:1 (fails WCAG 1.4.11 non-text contrast 3.0:1 requirement).

---

## 7. Mobile UX (Tested at 390px Viewport)

* **Header & Utility Bar:**
  * Eyebrow text ("Federal Democratic Republic of Ethiopia") wraps across 3 lines in a narrow container, squeezing the language switcher.
  * The "Contact" link is completely hidden (`display: none`).
* **Mobile Drawer Navigation:**
  * Tap targets are comfortable (height $\ge 48\text{px}$, clean border dividers).
  * Does not trap focus or support `Escape` key dismissal.
  * Omits "Contact", "Events", and does not incorporate the language switcher.
* **Cards & Grids:**
  * Service, news, and event cards collapse cleanly to 1 column.
  * Event cards neatly restack dates above titles without clipping.
* **Horizontal Overflow:**
  * No horizontal scroll leakage on public pages; overflow container handling is robust.
  * Tables in the CMS scroll horizontally with `-webkit-overflow-scrolling: touch`.

---

## 8. Accessibility (Keyboard & Assistive Tech)

* **Keyboard Navigation:**
  * Skip link is present, styled, and jumps to `#main-content`.
  * Tab order generally follows visual flow.
* **Focus Visibility:**
  * Focus indicators use a 2px outline with 3px offset.
  * **Critical Defect:** The gold color (`#d9a441`) has only a **2.25:1** contrast ratio against white cards and pages. It is nearly invisible to users with mild visual impairment.
* **Language Switcher Widget:**
  * Emits `aria-haspopup="listbox"` and `aria-expanded`, but does not listen for `Escape`, does not trap or arrow-navigate between options, and does not close on outside click.
* **Document Downloads:**
  * Disabled download buttons correctly convey `aria-disabled="true"`.
* **Semantics & Titles:**
  * Subpages lack unique `<title>` metadata, meaning screen reader users hear "Government Website Platform" on almost every tab.

---

## 9. Multilingual UX

The platform lists four languages in its switcher: English, Harari (`ሀረሪ`), Amharic (`አማርኛ`), and Afan Oromo (`Afaan Oromoo`).

### Observations:
1. **Static UI Untranslated:** Selecting Amharic or Afan Oromo switches the URL query (`?lang=am`) and sets the `lang` cookie, but all static interface chrome (navigation items, search placeholders, footer text, button labels, and section headers) remains entirely in English.
2. **Module Schemas Lack Multilingual Storage:** In the database, only the `pages` table possesses a `translations` JSONB column. The `services`, `news`, `events`, and `documents` tables have no translation fields in their schema. Even if an editor wanted to provide Amharic services or news, the system cannot store them.
3. **Hardcoded English Fallback in About Template:** Even when Amharic translations exist in `pages` for `about`, the About layout injects hardcoded English template chrome ("Our mandate", "Our priorities", "Access", "Capability", "Accountability", and the inspirational quote).
4. **HTML Lang Attribute Mismatch:** Root `app/layout.tsx` hardcodes `<html lang="en">`. Screen readers and browser translation tools are misinformed about the page's actual language content.

*(Note: Per audit guidelines, Harari translation content is handled separately; this finding focuses strictly on system UI behavior and fallback architecture).*

---

## 10. CMS UX (Public Servant Experience)

Tested using the active administrative session:

* **Dashboard Overview:**
  * Clean layout with fast navigation to content types and quick-create actions.
  * Greets the user as "Welcome, CMS" instead of "CMS Admin".
  * Lacks summary counters (e.g. "X published services", "Y drafts pending") or recent activity logs.
* **Content Creation & Editing:**
  * Forms are clean, with distinct sections ("Basic information", "Service details", "Requirements and process").
  * Input fields have clear "Required" and "Optional" indicators.
  * Status options (Draft, Published, Archived) include plain-language guidance.
  * Slugs auto-generate cleanly from titles and preserve manual edits.
* **Critical Service Field Disconnect:**
  * Editors conscientiously fill out "Eligibility", "Required documents", "Responsible office", and "Contact" in the CMS service form.
  * When viewing the published service on the public website, **none of these fields appear**. This creates severe editor confusion and citizen frustration.
* **User Management:**
  * Displays user list with roles and active status.
  * **No "Add User" UI:** Users can only be provisioned via terminal/database scripts; the UI provides no invite/create form.
  * **No Deactivation Confirmation:** Clicking "Deactivate" immediately toggles user status without a confirmation prompt.
* **Session Termination:**
  * Absolute absence of a Sign Out control (see CRIT-01).

---

## 11. Trust & Government-Site Experience

* **Institutional Authority:** The NPSO banner, federal identification eyebrow, and sober layout communicate genuine government ownership.
* **Placeholder Test Data in Database:** The homepage displays developer test content ("hamdi is back", "test") in three separate sections. In a public deployment, this immediately destroys credibility and suggests an unmaintained or compromised website.
* **Contractor Commercial Credit:**
  * The login card and CMS sidebar display: `Built by RAAFAT-Technolgies` linking to an external `.site` commercial URL.
  * The word "Technologies" is misspelled ("Technolgies"). Commercial branding with typos on federal administrative portals undermines trust.
* **Missing Contact Details on Contact Page:**
  * The Contact page omits official office hours (which are buried in the About page sidebar).
  * No general inquiry web form or departmental directory is provided.

---

## 12. Human Task Results

| Task | Starting Point | Result | Friction & Observations | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **1. Find Contact Info** | Homepage | **Pass (Desktop) / Fail (Mobile)** | Desktop: Quick via utility bar. Mobile: Contact link hidden in utility bar and omitted from mobile menu drawer. | **P1 (Mobile)** |
| **2. Find a Government Service** | Homepage | **Partial Pass** | Reached `/services`, but filter buttons are inert dummy buttons; empty state blames user's search. | **P2** |
| **3. Read Recent Announcement** | Homepage | **Pass** | Article opens with summary and back link, but developer test content ("hamdi is back") is repeated 3 times; tab title is generic. | **P2** |
| **4. Find an Upcoming Event** | Homepage | **FAIL** | "Events" is absent from header, mobile menu, and footer. If no event is featured, the section has no link to `/events`. | **P1** |
| **5. Download Public Document** | Homepage | **Pass** | Navigated to `/resources`, view detail, download button exists and disables gracefully when no file URL. | **KEEP** |
| **6. Return from Detail to Listing** | Detail Pages | **Pass (Standard) / Fail (CMS Pages)** | News, services, events, and resources have clear back links. Custom CMS pages (`/[slug]`) have no back links or breadcrumbs. | **P2** |
| **7. Change Website Language** | Homepage | **Partial Pass** | Dropdown changes URL/cookie, but static UI and modules remain 100% English. Dropdown does not dismiss on Escape/click-outside. | **P1** |
| **8. Find Office Hours** | Homepage | **Pass with high friction** | Looked at `/contact` (missing!). Looked at Footer (missing!). Eventually found on `/about` sidebar under "Office information". | **P2** |
| **9. Navigate via Keyboard** | Homepage | **Partial Pass** | Skip link works well. Focus outline on white backgrounds is faint (2.25:1 contrast). Language menu traps Tab flow. | **P2** |
| **10. Understand Institution Mission** | Homepage | **Pass** | Clear, prominent mandate and priority pillars on homepage and `/about`. | **KEEP** |

---

## 13. Overengineering Review

### Things that should NOT be added
* **No AI Chatbots or Virtual Assistants:** Government visitors need clear, authoritative text, predictable links, and downloadable forms, not hallucinations or chat widgets.
* **No Newsletter Subscription Popups:** Unnecessary for a federal service directory.
* **No Complex Elastic/Algolia Search Engines:** The client-side search over published services is fast, zero-dependency, and completely sufficient for a standard directory.
* **No Social Media Live Feeds (Twitter/Facebook embeds):** They introduce external tracking scripts, slow page performance, and break when APIs change. Simple social links in the footer are sufficient.
* **No Animated Carousels / Sliders:** The static hero copy is readable and stable. Carousels hide government notices and degrade accessibility.

### Things that should remain simple
* **The CMS Editor:** Plain HTML forms with standard textareas for lists (one item per line) are resilient, require zero training, and do not break like complex block editors or heavy WYSIWYG suites.
* **Static Page Generation & Caching:** Next.js dynamic routing with direct SQL queries is fast and clean.

### Things genuinely worth improving
* Restoring missing data fields to the service detail page.
* Adding a visible Sign Out button in the CMS.
* Adding "Contact" and "Events" to the mobile navigation drawer.
* Creating an official branded `app/not-found.tsx` page.
* Ensuring page titles reflect actual page titles rather than the fallback platform name.

---

## 14. Recommended Work — PRIORITIZED

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FIX NOW                                   │
│  1. Add CMS Sign-Out button to topbar/sidebar                          │
│  2. Render missing service fields (requirements, eligibility, contact) │
│  3. Include "Contact" & "Events" in navigation (desktop & mobile)      │
│  4. Implement branded app/not-found.tsx error page                      │
│  5. Fix focus ring contrast (use darker green or high-contrast outline)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            IMPROVE LATER                               │
│  6. Add unique <title> and metadata to all subpages                    │
│  7. Add office hours to /contact and footer                            │
│  8. Make Services filter buttons functional (or remove them)           │
│  9. Add confirmation dialog before user deactivation in CMS            │
│  10. Include Noto Sans Ethiopic font & bind <html lang> to active lang │
│  11. Clean up placeholder test content in seed database                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            DO NOT TOUCH                                │
│  • Core color palette & typography hierarchy (Georgia + clean sans)    │
│  • Calm scroll reveal and micro-interaction animation system           │
│  • Simple textarea-based CMS list fields                               │
│  • Lightweight server-component architecture                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Fix Now (High Priority)
1. **CMS Sign Out Action:** Add a visible "Sign out" link or button in `components/cms-shell.tsx` next to the user name and in the mobile sidebar footer.
2. **Restore Missing Service Detail Fields:** In `components/institution-site.tsx:858-897` and `app/services/[slug]/page.tsx:22-32`, pass and render `requiredDocuments`, `eligibility`, `responsibleOffice`, and `contact`.
3. **Include "Contact" and "Events" in Navigation:** Add `{ label: 'Events', href: '/events' }` and `{ label: 'Contact', href: '/contact' }` to `institutionConfig.navigation` in `lib/institution-config.ts:48-54` so both desktop and mobile users have complete access.
4. **Custom 404 Page:** Create `app/not-found.tsx` with header, footer, institution branding, clear error message, and a "Return to Homepage" button.
5. **Focus Indicator Contrast:** In `app/globals.css:230`, update focus outlines on light backgrounds to use a darker outline (e.g. `outline: 2px solid var(--green)`) or a dual-tone ring that satisfies the 3:1 contrast requirement.

### Improve Later (Non-Critical Polish)
1. **Dynamic Page Titles:** Add `generateMetadata` or explicit `metadata` exports to `/about`, `/services`, `/news`, `/events`, `/resources`, and `/cms` to eliminate the fallback "Government Website Platform" title.
2. **Display Office Hours on Contact Page:** Render `institution.hours` directly inside `ContactPage` in `components/institution-site.tsx:723`.
3. **Service Directory Filter Logic:** Connect topic filter buttons in `DirectoryPage` to state or remove the static buttons until filtering is needed.
4. **User Deactivation Safeguard:** Add an `onSubmit` browser confirm check before deactivating accounts in `app/cms/users/page.tsx:86`.
5. **Ethiopic Script & Lang Attribute:** Import `Noto Sans Ethiopic` in CSS/Next Font and dynamically update `<html lang={language}>` in root layout.
6. **Seed Data Cleanup:** Remove developer test strings ("hamdi is back", "test") and replace with realistic public-service sample records.

### Do Not Touch (Keep As-Is)
* **Visual Palette & Theme:** The Ethiopian federal green and gold styling is dignified, distinctive, and appropriate.
* **Motion Infrastructure:** The combination of `motion-enter`, `reveal`, and strict `prefers-reduced-motion` compliance is mature and restrained.
* **Simplified CMS Stack:** The minimal Drizzle + Better Auth setup without bulky third-party admin suites is robust and fast.

---

## 15. Final Auditor Verdict

### Overall UX State
> **High-Fidelity Public Service Template — Ready for Production with Targeted Usability Patches.**
> The visual identity, typography, and server architecture are already at a public-service standard. It avoids modern web clutter and feels like a serious government portal. The remaining issues are not architectural design flaws, but specific, fixable omissions in navigation completeness, detail field wiring, and administrative session management.

### Top 3 Citizen Improvements
If I were a normal citizen visiting this website for the first time, the first three things that would most improve my experience are:

1. **Show me what documents I need and who is eligible when I click on a service** (wiring `requiredDocuments`, `eligibility`, and `responsibleOffice` into the service detail page).
2. **Let me easily find Contact and Events on my mobile phone** (adding "Contact" and "Events" directly into the mobile menu drawer).
3. **Never strand me on a blank developer error screen if a link is broken** (providing a branded, helpful 404 page with a one-click return to the homepage).
