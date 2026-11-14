-- Ensure fixed Visit Harar guide page slots exist; archive freeform leftovers.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @inst = '11111111-1111-4111-8111-111111111111';
SET @page_about = '55555555-5555-4555-8555-555555555551';
SET @page_plan = '55555555-5555-4555-8555-555555555552';
SET @page_itin = '55555555-5555-4555-8555-555555555553';

INSERT INTO pages (id, institution_id, slug, title, content, translations, status)
VALUES (
  @page_about,
  @inst,
  'about',
  'About Visit Harar',
  'Visit Harar is the official digital gateway to Harar Jugol, the UNESCO World Heritage fortified historic town.\n\nHarar is widely known as a fourth holy city of Islam, with ~82 mosques and ~102 shrines inside the walls. The historic core covers ~48 hectares at about ~1,885 m elevation, enclosed by walls ~3.3 km long and about ~4 m high on average.\n\nThis site helps travelers explore gates, markets, faith sites, museums, and living Harari hospitality with verified, respectful guidance. Fees and opening hours are confirmed locally — we leave them open here until the Tourism Commission publishes them.',
  JSON_OBJECT(),
  'published'
) ON DUPLICATE KEY UPDATE
  slug = 'about',
  title = VALUES(title),
  content = VALUES(content),
  status = 'published';

INSERT INTO pages (id, institution_id, slug, title, content, translations, status)
VALUES (
  @page_plan,
  @inst,
  'plan',
  'Plan your visit',
  'How to get to Harar\n\nHarar has no airport. Fly to Dire Dawa (DIR), then continue by road (~50–55 km, typically ~1–1.5 hours). Overnight rail to Dire Dawa may be available — confirm schedules locally. Road from Addis Ababa commonly takes most of a day (~9–12 hours).\n\nGetting around\n\nInside Jugol, walk only — the historic core is a maze of narrow alleys. Outside the walls, bajaj (three-wheelers) are the usual short trip.\n\nBest season\n\nOctober–March is generally most comfortable for walking (especially November–February). More rain is likely April–May and parts of July–September.\n\nRespect\n\nDress modestly (shoulders and knees). Ask before photographing people. At mosques and shrines, follow your tour guide’s guidance on access. Remove shoes where others have.\n\nHyena feeding\n\nArrange only through the Eco-park / official Tourism Commission office.',
  JSON_OBJECT(),
  'published'
) ON DUPLICATE KEY UPDATE
  slug = 'plan',
  title = VALUES(title),
  content = VALUES(content),
  status = 'published';

INSERT INTO pages (id, institution_id, slug, title, content, translations, status)
VALUES (
  @page_itin,
  @inst,
  'plan-itineraries',
  'Ready-made itineraries',
  'Pick a ready-made loop for your first days in Jugol. Day plans below link to attractions and experiences on this site. Confirm hyena feeding at the Eco-park / Tourism Commission office, and treat all fees and hours as local confirmations.',
  JSON_OBJECT(),
  'published'
) ON DUPLICATE KEY UPDATE
  slug = 'plan-itineraries',
  title = VALUES(title),
  content = VALUES(content),
  status = 'published';

-- Archive any non-guide public pages left from freeform CMS use
UPDATE pages
SET status = 'archived'
WHERE institution_id = @inst
  AND slug NOT IN ('about', 'plan', 'plan-itineraries')
  AND status <> 'archived';
