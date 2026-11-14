# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Travelers planning or arriving in Harar Jugol (often on mobile, on the street) who need trustworthy orientation — what to see, do, and respect.
- **Secondary:** Harari Regional State Tourism Commission staff (editors, reviewers, admins) who publish verified attractions, experiences, stories, and visitor guidance through the CMS.

## Product Purpose

VisitHarar is the official digital gateway to Harar Jugol — UNESCO World Heritage walled city, "City of Peace," 4th holiest city in Islam. It helps visitors experience Harar (not merely look it up): storytelling, verified local guidance, and practical trip planning. Success means a traveler can find attractions, experiences, etiquette, and next steps without dead ends — and that published content is officially endorsed.

## Positioning

Experience Harar, don't just visit it. VisitHarar is a storytelling authority and trip planner endorsed by the Tourism Commission. It is **not** a booking engine: no payments or hotel reservations; it connects visitors directly to verified local guesthouses, guides, and community hosts.

## Operating Context

- Public SPA (`frontend/`) + PHP PDO JSON API (`backend/`) + MySQL (`database/mysql/`).
- Phase 1 remaps tourism concepts onto existing CMS entities (services → attractions/experiences, news → stories, pages → plan content, events → festivals).
- Editorial rule: edit does not mean publish; drafts pass review before going live.
- Mobile-first browsing on variable network conditions.

## Capabilities and Constraints

- Public routes for discover, explore, experiences, plan, stories, events, map teaser, contact.
- CMS for institution profile and content entities (with tourism labels in Phase 1).
- No booking/payments in scope.
- Dedicated attraction/experience/itinerary tables and a full interactive map are planned for later phases; Phase 1 must not hard-lock government "services/news" IA into public URLs.

## Brand Commitments

- **Name:** VisitHarar
- **Endorsement:** Harari Regional State Tourism Commission
- **Logo:** Jugol gate mark at `frontend/public/brand/visit-harar-logo.webp` (cream wall, saffron yellow bases, turquoise outlines)
- **Voice:** Warm, welcoming (*Aman Tisheyu*), culturally respectful, story-driven
- **Palette anchors:** turquoise, saffron yellow, cream/whitewash, terracotta and highland coffee brown (not FDRE green/gold)

## Evidence on Hand

- Product blueprints: VisitHarar website blueprint & system design (external docs)
- Logo asset: `frontend/public/brand/visit-harar-logo.webp`
- Hero photography: placeholder slides under `frontend/public/hero/` until authentic Harar images are supplied — do not invent photoreal stock claims

## Product Principles

1. Living heritage over generic tourism brochure.
2. No dead ends — every page points to a next step (see, do, stay, plan).
3. Verified and dignified — official endorsement and editorial quality over volume.
4. Direct community support — introduce locals; do not middleman bookings.
5. Mobile-first clarity under bright sun and slow networks.

## Accessibility & Inclusion

Large, high-contrast type and easy-to-tap targets for outdoor mobile use; respect cultural etiquette guidance for visitors of all faiths and backgrounds.
