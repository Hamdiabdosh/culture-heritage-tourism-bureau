# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Residents, researchers, partners, and the general public seeking **official information** from the Harari Culture, Heritage & Tourism Bureau.
- **Secondary:** Bureau staff (editors, reviewers, admins) who publish institutional news, events, publications, and public information through the CMS.

## Product Purpose

This is the **official institutional website** of the Harari Culture, Heritage & Tourism Bureau (Harari People Regional State). It communicates the Bureau’s mandate, organization, and activities — culture, heritage preservation and promotion, related public information, news, events, and publications.

It is **not** a visitor booking platform, hotel marketplace, or payment product.

## Positioning

Official government bureau website: clear, trustworthy institutional information. Distinct from any separate tourism-discovery or destination-marketing product (for example Visit Harar / Tourism Commission visitor sites).

## Operating Context

- Public SPA (`frontend/`) + PHP PDO JSON API (`backend/`) + MySQL (`database/mysql/`).
- Editorial rule: edit does not mean publish; drafts are reviewed before going live (admin publish gate today; fuller approval/audit in later phases).
- Interface languages: English, Amharic, Afaan Oromo, and Harari (UI catalogs; deeper content i18n in later phases).

## Capabilities and Constraints (V1 direction)

- Institutional public pages: home, about, news/announcements, events, publications/resources, contact (and further culture/heritage/services modules as content architecture lands).
- CMS for institution profile and content entities.
- No booking, payments, reservations, or complex visitor management in V1.

## Brand Commitments

- **Name:** Harari Culture, Heritage & Tourism Bureau
- **Voice:** Clear, respectful, institutional; culturally grounded
- **Logo:** Use an official Bureau asset only when supplied; until then, a text wordmark (do not invent seals or emblems)
- **Palette:** Prefer existing site tokens; avoid implying FDRE-wide branding unless adopted by the Bureau

## Product Principles

1. Official information over marketing brochure tone.
2. No invented facts — leadership, statistics, and policies come from the Bureau.
3. Preserve working CMS/auth/deploy foundations while correcting product identity.
4. Multilingual access as a first-class goal (UI now; content depth later).
5. Clear paths to news, events, publications, and contact.

## Accessibility & Inclusion

Readable type, clear navigation, and easy-to-tap targets; culturally respectful public information for all audiences.
