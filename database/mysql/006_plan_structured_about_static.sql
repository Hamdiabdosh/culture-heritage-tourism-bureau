-- About becomes static (archive CMS about). Plan content → structured JSON sections.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @inst = '11111111-1111-4111-8111-111111111111';
SET @page_plan = '55555555-5555-4555-8555-555555555552';
SET @page_itin = '55555555-5555-4555-8555-555555555553';

UPDATE pages
SET status = 'archived'
WHERE institution_id = @inst AND slug = 'about';

UPDATE pages
SET
  title = 'Plan your visit',
  content = '{"version":1,"title":"Plan your visit","sections":[{"id":"arrive","title":"How to get to Harar","body":"Harar has no airport. Fly to Dire Dawa (DIR), then continue by road (~50–55 km, typically ~1–1.5 hours). Overnight rail to Dire Dawa may be available — confirm schedules locally. Road from Addis Ababa commonly takes most of a day (~9–12 hours)."},{"id":"around","title":"Getting around","body":"Inside Jugol, walk only — the historic core is a maze of narrow alleys. Outside the walls, bajaj (three-wheelers) are the usual short trip."},{"id":"season","title":"Best season","body":"October–March is generally most comfortable for walking (especially November–February). More rain is likely April–May and parts of July–September."},{"id":"respect","title":"Respect","body":"Dress modestly (shoulders and knees). Ask before photographing people. At mosques and shrines, follow your tour guide’s guidance on access. Remove shoes where others have."},{"id":"hyena","title":"Hyena feeding","body":"Arrange only through the Eco-park / official Tourism Commission office. Fee and timing: confirm at the desk."}]}',
  status = 'published',
  translations = JSON_OBJECT()
WHERE institution_id = @inst AND id = @page_plan;

INSERT INTO pages (id, institution_id, slug, title, content, translations, status)
VALUES (
  @page_plan,
  @inst,
  'plan',
  'Plan your visit',
  '{"version":1,"title":"Plan your visit","sections":[{"id":"arrive","title":"How to get to Harar","body":"Harar has no airport. Fly to Dire Dawa (DIR), then continue by road (~50–55 km, typically ~1–1.5 hours). Overnight rail to Dire Dawa may be available — confirm schedules locally. Road from Addis Ababa commonly takes most of a day (~9–12 hours)."},{"id":"around","title":"Getting around","body":"Inside Jugol, walk only — the historic core is a maze of narrow alleys. Outside the walls, bajaj (three-wheelers) are the usual short trip."},{"id":"season","title":"Best season","body":"October–March is generally most comfortable for walking (especially November–February). More rain is likely April–May and parts of July–September."},{"id":"respect","title":"Respect","body":"Dress modestly (shoulders and knees). Ask before photographing people. At mosques and shrines, follow your tour guide’s guidance on access. Remove shoes where others have."},{"id":"hyena","title":"Hyena feeding","body":"Arrange only through the Eco-park / official Tourism Commission office. Fee and timing: confirm at the desk."}]}',
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
  status = 'published';
