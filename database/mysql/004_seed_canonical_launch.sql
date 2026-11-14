-- Visit Harar — canonical launch content (confirmations 2026-10-12)
-- Apply after 001_schema (+ 003_cover_image if used). Safe to re-run.
-- Public titles use Harari gate names. Fees/hours left open. EN only.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET @inst = '11111111-1111-4111-8111-111111111111';

-- Institution
UPDATE institutions SET
  name = 'Visit Harar',
  short_name = 'Harar',
  tagline = 'Experience Harar, don’t just visit it.',
  description = 'Official digital gateway to Harar Jugol — UNESCO World Heritage fortified historic town, fourth holy city of Islam in local tradition, and living Harari culture. Guidance from the Harari Regional State Tourism Commission.',
  eyebrow = 'Harari Regional State Tourism Commission',
  address = 'Harar Jugol, Harari Regional State, Ethiopia',
  phone = NULL,
  email = NULL,
  hours = 'Visitor desk hours: confirm locally'
WHERE id = @inst;

-- Replace public catalog for this institution
DELETE FROM services WHERE institution_id = @inst;
DELETE FROM news WHERE institution_id = @inst;
DELETE FROM events WHERE institution_id = @inst;

-- Keep about/plan pages; refresh EN copy
UPDATE pages SET
  title = 'About Visit Harar',
  content = 'Visit Harar is the official digital gateway to Harar Jugol, the UNESCO World Heritage fortified historic town.\n\nHarar is widely known as a fourth holy city of Islam, with ~82 mosques and ~102 shrines inside the walls. The historic core covers ~48 hectares at about ~1,885 m elevation, enclosed by walls ~3.3 km long and about ~4 m high on average.\n\nThis site helps travelers explore gates, markets, faith sites, museums, and living Harari hospitality with verified, respectful guidance. Fees and opening hours are confirmed locally — we leave them open here until the Tourism Commission publishes them.'
WHERE institution_id = @inst AND slug = 'about';

UPDATE pages SET
  title = 'Plan your visit',
  content = 'How to get to Harar\n\nHarar has no airport. Fly to Dire Dawa (DIR), then continue by road (~50–55 km, typically ~1–1.5 hours). Overnight rail to Dire Dawa may be available — confirm schedules locally. Road from Addis Ababa commonly takes most of a day (~9–12 hours).\n\nGetting around\n\nInside Jugol, walk only — the historic core is a maze of narrow alleys. Outside the walls, bajaj (three-wheelers) are the usual short trip.\n\nBest season\n\nOctober–March is generally most comfortable for walking (especially November–February). More rain is likely April–May and parts of July–September.\n\nRespect\n\nDress modestly (shoulders and knees). Ask before photographing people. At mosques and shrines, follow your tour guide’s guidance on access. Remove shoes where others have.\n\nHyena feeding\n\nArrange only through the Eco-park / official Tourism Commission office.'
WHERE institution_id = @inst AND slug = 'plan';

-- ========== ATTRACTIONS (services, non-Experience category) ==========

INSERT INTO services (
  id, institution_id, slug, title, summary, description, category,
  responsible_office, eligibility, required_documents, process, contact, icon, status
) VALUES
(
  '66666666-6666-4666-8666-666666666661',
  @inst,
  'five-historic-gates',
  'Five Historic Gates of Jugol',
  'Asmaadin Bari, Assum Bari, Argob Bari, Suqutat Bari, and Badro Bari — the five original gates of the walled city.',
  'Harar Jugol is entered through five historic gates that once matched trade routes and neighbourhoods. Public titles use Harari names; common Amharic aliases include Shoa (Asmaadin), Fallana (Assum), Erer (Argob), Sanga (Suqutat), and Buda (Badro). Asmaadin Bari is also known in Arabic as Bab al-Nesr.\n\nA later western opening — Harar Gate (Duk Bari) — was added after 1887 and is the practical modern approach for many visitors. Do not call it a sixth historic gate.\n\nWalk a section of the wall circuit in daylight with a guide. The enclosing wall is about ~3.3 km long and roughly ~4 m high on average.',
  'Historic Gates',
  'Perimeter of Jugol',
  'Open to visitors; modest dress near nearby homes and shrines.',
  JSON_ARRAY('Comfortable walking shoes', 'Water and sun protection', 'Ask before photographing people'),
  JSON_ARRAY('Orient at Harar Gate or Faras Magala', 'Walk part of the circuit with a guide', 'Note Assum Bari (north) and Argob Bari (east) on the map'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a2',
  @inst,
  'harar-gate',
  'Harar Gate (Duk Bari)',
  'Later western gate (after 1887) — the practical modern entry toward the centre of Jugol.',
  'Harar Gate, also called Duk Bari or Duke Ber, was cut after Menelik’s 1887 conquest. It connects via a wider approach toward Faras Magala. Use it as an orientation landmark, not as one of the five historic gates.',
  'Historic Gates',
  'Western perimeter of Jugol',
  'Public access; busier vehicle and foot traffic than historic gates.',
  JSON_ARRAY('Agree bajaj fare before riding', 'Keep bags secure'),
  JSON_ARRAY('Arrive by bajaj or vehicle', 'Enter on foot toward Faras Magala', 'Arrange to meet transport outside afterward'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-666666666663',
  @inst,
  'jamia-mosque',
  'Jamia Mosque',
  'The principal congregational mosque inside Jugol — a landmark of Harar’s living Islamic centre.',
  'Mosque Jamia sits in the central religious and commercial core of Jugol near Faras Magala. It is first a place of worship.\n\nAccess for non-Muslim visitors is not assumed — ask your tour guide what is appropriate that day. Dress modestly, remove shoes if admitted, and do not photograph worshippers or prayer.',
  'Mosques & Shrines',
  'Central Jugol',
  'Follow your tour guide’s guidance on access. Modest dress required.',
  JSON_ARRAY('Cover shoulders and knees', 'Scarf useful for women', 'Ask before any photography'),
  JSON_ARRAY('Approach with a guide', 'View from outside unless entry is confirmed', 'Avoid Friday midday prayer congestion'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a4',
  @inst,
  'aw-abadir-shrine',
  'Shrine of Aw Abadir',
  'Tomb of Harar’s legendary founding saint — among the most venerated sites in Jugol.',
  'Aw Abadir (Sheikh Abadir) is traditionally regarded as the spiritual founder of Harar. The shrine complex lies in the south–southeast of Jugol near the wall.\n\nThis is an active pilgrimage place. Ask your tour guide about access; non-Muslim visitors often remain outside. Dress modestly, keep voices low, and ask before photographing.',
  'Mosques & Shrines',
  'South–southeast Jugol',
  'Ask your tour guide. Modest dress essential.',
  JSON_ARRAY('Modest clothing', 'Quiet demeanour', 'Ask before photography'),
  JSON_ARRAY('Confirm access with your guide', 'Approach quietly', 'Stay in permitted areas only'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a5',
  @inst,
  'amir-nur-shrine',
  'Shrine of Amir Nur',
  'Domed shrine of the 16th-century ruler credited with building Jugol’s enclosing walls.',
  'Amir Nur ibn al-Mujahid is closely tied to the fortifications that define Jugol. His green-domed shrine is among the city’s most visited tombs.\n\nAsk your tour guide about visiting rules. Modest dress, quiet conduct, and permission before photography.',
  'Mosques & Shrines',
  'Northern / central-northern Jugol',
  'Ask your tour guide.',
  JSON_ARRAY('Modest clothing', 'Ask before photography'),
  JSON_ARRAY('Include on a guided walking route', 'Confirm access on site', 'Observe from outside if entry is restricted'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a6',
  @inst,
  'faras-magala',
  'Faras Magala',
  'Main public square of Jugol — historic horse market and orientation hub for walks.',
  'Faras Magala is the social and navigational heart of the old city. From here, streets lead toward Gidir Magala via Makina Girgir, and westward toward Harar Gate. Medhane Alem Church stands nearby on the site of an earlier great mosque.',
  'Markets',
  'Central Jugol',
  'Freely accessible public square.',
  JSON_ARRAY('Ask before photographing vendors', 'Comfortable shoes'),
  JSON_ARRAY('Use as a meeting and orientation point', 'Continue to markets, museums, or alleys'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a7',
  @inst,
  'gidir-magala',
  'Gidir Magala',
  'Historic central market of Jugol — butchery, stalls, and everyday trade.',
  'Gidir Magala sits at the foot of Makina Girgir (“Sewing Machine Street”). It remains a working market, not a souvenir bazaar. Nearby tradition links the tomb of Said Ali Hamdogn with the founding of Harar’s food market.\n\nFees: none for walking through. Opening rhythm follows market hours — confirm locally.',
  'Markets',
  'Central Jugol',
  'Daylight market hours; modest dress; ask before photos.',
  JSON_ARRAY('Small cash notes', 'Secure bag', 'Ask before photographing people or stalls'),
  JSON_ARRAY('Enter from Faras Magala via Makina Girgir', 'Walk coldly and respectfully', 'Continue into nearby alleys or museums'),
  'Visitor desk — confirm locally',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-666666666662',
  @inst,
  'rimbaud-cultural-center',
  'Arthur Rimbaud Cultural Center',
  'Restored Indian-merchant house museum associated with Rimbaud’s trading years in Harar.',
  'Arthur Rimbaud lived and traded in Harar in the 1880s. The building open today is a restored early-20th-century Indian-merchant house used as a cultural centre and museum — associated with that era, not presented here as the proven house where he lived.\n\nEntry fee and hours: confirm on site (left open until Commission publishes them).',
  'Museums & Palaces',
  'Central / higher Jugol',
  'Suitable for most travelers; confirm hours locally.',
  JSON_ARRAY('Cash if an entry contribution is requested', 'Ask about indoor photography'),
  JSON_ARRAY('Locate with a guide near the centre', 'Allow about 30–60 minutes', 'Continue on foot to nearby sites'),
  'Visitor desk — confirm locally',
  'book',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a8',
  @inst,
  'sherif-harar-city-museum',
  'Sherif Harar City Museum',
  'Open museum in Ras Tafari’s House — manuscripts, coins, textiles, and Harari material culture.',
  'The Sherif Harar City Museum (also associated with Ras Tafari’s House) remains open to visitors. It displays manuscripts, coins, dress, and household objects in a historic Indian-style mansion linked to Haile Selassie’s Harar years.\n\nFee: left open — confirm at the door.',
  'Museums & Palaces',
  'Central Jugol, near Rimbaud Cultural Center',
  'Open to the public; modest dress; fee confirm on site.',
  JSON_ARRAY('Ask before photography', 'Allow 30–60 minutes'),
  JSON_ARRAY('Locate near Rimbaud Center with a guide', 'Confirm admission at the entrance', 'View architecture and collections'),
  'Visitor desk — confirm locally',
  'book',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666a9',
  @inst,
  'traditional-harari-houses',
  'Traditional Harari Houses (Gēy Gār)',
  'Courtyard townhouses with nadaba platforms and basket-lined interiors — UNESCO’s most spectacular Harari heritage.',
  'Traditional Harari houses turn a plain face to the street and life inward. Raised nadaba seating, niches, and colourful baskets define the interior. Access is by invitation or arranged visit only — living homes, not open monuments.\n\nFee/contribution: confirm with your host or guide.',
  'Architecture & Living Heritage',
  'Throughout Jugol',
  'Host-arranged visits only; shoes off; modest dress.',
  JSON_ARRAY('Easy-to-remove shoes', 'Small thank-you gift or craft purchase if appropriate'),
  JSON_ARRAY('Arrange through a guide or visitor desk', 'Follow seating guidance', 'Ask before photography'),
  'Visitor desk / local guide',
  'building',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666aa',
  @inst,
  'hyena-feeding-sites',
  'Hyena Feeding (Eco-park)',
  'Official evening hyena-feeding arrangements through the Tourism Commission Eco-park.',
  'Harar’s relationship with spotted hyenas is a living tradition. For visitors, the official arrangement is through the Eco-park / Tourism Commission office — not informal dual gate-side listings.\n\nThese are wild animals. Observation is preferred. Fee and exact timing: confirm at the Eco-park desk.',
  'Living Tradition / Wildlife Cultural Practice',
  'Eco-park / official Tourism Commission office',
  'Arrange only via Eco-park desk. Not for young children or uneasy visitors.',
  JSON_ARRAY('Torch', 'Closed shoes', 'Follow handler instructions exactly', 'No flash'),
  JSON_ARRAY('Book or check in at the Eco-park / Tourism Commission office', 'Arrive as instructed for dusk', 'Observe calmly; participate only if invited'),
  'Eco-park / Tourism Commission office',
  'megaphone',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666ab',
  @inst,
  'said-ali-hamdogn-tomb',
  'Tomb of Said Ali Hamdogn',
  'Shrine near Gidir Magala linked to a companion of Abadir and the founding of Harar’s food market.',
  'Said Ali Hamdogn is remembered in Harari tradition as a trader-companion of Abadir. His tomb/galma near the central market is one of the more approachable sacred sites for many visitors — still treat it as sacred.\n\nAsk your tour guide about entry. Fee: none formal known; confirm locally.',
  'Mosques & Shrines',
  'Near Gidir Magala, inside Jugol',
  'Ask your tour guide. Modest dress.',
  JSON_ARRAY('Modest clothing', 'Ask before photography'),
  JSON_ARRAY('Locate with a guide near the market', 'Approach quietly', 'Continue the walking circuit'),
  'Visitor desk — confirm locally',
  'building',
  'published'
);

-- ========== EXPERIENCES ==========

INSERT INTO services (
  id, institution_id, slug, title, summary, description, category,
  responsible_office, eligibility, required_documents, process, contact, icon, status
) VALUES
(
  '66666666-6666-4666-8666-666666666665',
  @inst,
  'harari-coffee-ceremony',
  'Three-Round Harari Coffee Ceremony',
  'Share a traditional coffee ceremony in a Harari home or courtyard — hospitality, not a performance.',
  'A host prepares coffee by roasting and brewing in a clay jebena, often with incense. Rounds are commonly called abol, tona, and baraka (bereka). Completing all three rounds is optional — welcome if you stay; tell your host if you prefer fewer cups or do not drink coffee.\n\nHosts for Day 1 are still being confirmed. Ask the visitor desk or your guide to arrange a respectful visit. Fee/contribution: confirm locally.',
  'Experience · Cultural & Spiritual',
  'Traditional homes & cultural houses',
  'By arrangement with a host or guide.',
  JSON_ARRAY('Modest clothing', 'Ask before photography', 'Small thank-you contribution if appropriate'),
  JSON_ARRAY('Arrange via visitor desk or guide', 'Sit where indicated', 'Receive coffee as offered', 'Thank your host before leaving'),
  'Ask visitor desk / local host',
  'message',
  'published'
),
(
  '66666666-6666-4666-8666-666666666664',
  @inst,
  'evening-hyena-feeding',
  'Evening Hyena Feeding',
  'Observe Harar’s hyena-feeding tradition — arrange only through the Eco-park / Tourism Commission office.',
  'At dusk, local handlers feed wild spotted hyenas. For official tourism, arrange only through the Eco-park / Tourism Commission office.\n\nFollow safety instructions exactly. Do not treat this as a stunt or petting zoo. Fee and start time: confirm at the Eco-park desk.',
  'Experience · Wildlife & Adventure',
  'Eco-park / official Tourism Commission office',
  'Arrange only via Eco-park desk. Wild animals — observation preferred.',
  JSON_ARRAY('Torch', 'Closed shoes', 'Warm layer', 'No flash photography'),
  JSON_ARRAY('Check in at the Eco-park / Tourism Commission office', 'Arrive as instructed', 'Stand where directed', 'Leave calmly afterward'),
  'Eco-park / Tourism Commission office',
  'megaphone',
  'published'
),
(
  '66666666-6666-4666-8666-666666666666',
  @inst,
  'basket-weaving-with-masters',
  'Harari Basket-Weaving Visit',
  'Meet Harari women weavers and see the baskets that line traditional house interiors.',
  'Harari basketry is living craft and domestic art. Visits are arranged through guides or the visitor desk when hosts are available. Buy directly from makers when possible.\n\nFee: confirm locally. Hosts: still being confirmed for Day 1.',
  'Experience · Artisans & Crafts',
  'Workshops & households (by arrangement)',
  'By arrangement; ask before photographing people or work.',
  JSON_ARRAY('Small cash for purchases', 'Modest dress'),
  JSON_ARRAY('Arrange via visitor desk or guide', 'Watch the weaving', 'Purchase directly if you wish'),
  'Ask visitor desk / local host',
  'file',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666ac',
  @inst,
  'morning-market-walk',
  'Morning Market Walk',
  'Walk Gidir Magala and Makina Girgir — Jugol’s working market spine.',
  'From Faras Magala, descend Makina Girgir (tailor street) to Gidir Magala. Expect everyday commerce, spices, and butchery — not a staged tasting tour.\n\nGuide recommended. No market entry fee.',
  'Experience · Food & Markets',
  'Central Jugol markets',
  'Daylight; morning best; modest dress.',
  JSON_ARRAY('Small notes', 'Secure bag', 'Ask before photos or sampling'),
  JSON_ARRAY('Start at Faras Magala', 'Walk Makina Girgir', 'Explore Gidir Magala', 'Exit toward other sites'),
  'Ask visitor desk / local host',
  'file',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666ad',
  @inst,
  'night-cultural-walk',
  'Night Cultural Walk inside Jugol',
  'A guided early-evening walk through Jugol’s lanes as the old city quiets after day.',
  'After dark, alleys are unlit and easy to lose. Go with a trusted local guide. Keep voices low near homes and mosques; ask before photographing people.\n\nGuide fee: confirm locally. Hosts/guides still being confirmed for Day 1.',
  'Experience · Cultural & Spiritual',
  'Inside Jugol (guided)',
  'Guided only; avoid walking alone late at night.',
  JSON_ARRAY('Torch', 'Modest layered clothing', 'Closed shoes'),
  JSON_ARRAY('Meet your guide at a known gate or hotel', 'Walk a safe circuit', 'Return with the guide'),
  'Ask visitor desk / local host',
  'message',
  'published'
),
(
  '66666666-6666-4666-8666-6666666666ae',
  @inst,
  'traditional-house-interior-visit',
  'Traditional Harari House Interior Visit',
  'Visit a living Harari house to see nadaba platforms, niches, and basket-lined walls.',
  'Only visit houses that have agreed to receive guests. Often pairs with coffee. Completing three coffee rounds is optional if offered.\n\nContribution: confirm with host. Day-1 hosts still being confirmed.',
  'Experience · Cultural & Spiritual',
  'Host homes (by arrangement)',
  'Invitation or arranged visit only.',
  JSON_ARRAY('Easy-to-remove shoes', 'Modest clothing', 'Ask before photography'),
  JSON_ARRAY('Arrange via guide or visitor desk', 'Follow host seating guidance', 'Thank the household before leaving'),
  'Ask visitor desk / local host',
  'building',
  'published'
);

-- ========== STORIES (news) ==========

INSERT INTO news (id, institution_id, slug, title, summary, content, category, status, published_at) VALUES
(
  '44444444-4444-4444-8444-444444444441',
  @inst,
  'inside-the-gey-gar',
  'Inside the Gēy Gār',
  'The traditional Harari house turns a plain face to the street and its whole life inward.',
  'From the alley a Harari house offers almost nothing — a door in a high wall. Inside, the gidir gār is organised around raised nadaba platforms that mark social place. Walls hold niches and bright baskets made by Harari women.\n\nUNESCO calls these townhouses the most spectacular part of Harar’s cultural heritage. Three house types coexist: traditional Harari, Indian merchant, and hybrid. Visitors enter only as guests, by arrangement.',
  'Architecture',
  'published',
  UTC_TIMESTAMP(3)
),
(
  '44444444-4444-4444-8444-444444444442',
  @inst,
  'hyena-men-of-harar',
  'The Hyena Men of Harar',
  'A living relationship between the city and wild spotted hyenas — arranged for visitors through the Eco-park.',
  'Spotted hyenas have long lived on Harar’s edges. Openings in the wall base — waraba nudule — and Ashura shrine offerings belong to older layers of the story. Nightly visitor feeding is a later practice.\n\nFor official tourism, arrange only through the Eco-park / Tourism Commission office. Watch respectfully; these are wild animals, not a performance.',
  'Living culture',
  'published',
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)
),
(
  '44444444-4444-4444-8444-444444444443',
  @inst,
  'coffee-trade-and-the-road-to-the-sea',
  'Coffee, Trade and the Road to the Sea',
  'Harar’s coffee once moved by caravan toward the coast; the same beans still structure hospitality inside the walls.',
  'From the late sixteenth to the nineteenth century, Harar sat on trade corridors between the Ethiopian highlands and the Red Sea. Coffee, hides, and other goods moved through its gates and markets.\n\nArthur Rimbaud traded here in the 1880s. The Rimbaud Cultural Center preserves that commercial era in a restored Indian-merchant house associated with his years in Harar — not claimed here as his proven residence.\n\nIn a courtyard ceremony, the same crop becomes welcome. Completing three rounds is optional; the hospitality is the point.',
  'Coffee',
  'published',
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 DAY)
),
(
  '44444444-4444-4444-8444-444444444444',
  @inst,
  'walls-and-the-five-gates',
  'The Walls and the Five Gates',
  'Jugol’s wall — about ~3.3 km long and roughly ~4 m high — and five historic gates still organise the old city.',
  'The enclosing walls are tied to Emir Nur in the mid-sixteenth century, on foundations that tradition dates earlier. Five historic gates — Asmaadin, Assum, Argob, Suqutat, and Badro Bari — once matched neighbourhoods and roads. Harar Gate (Duk Bari) came later, after 1887.\n\nWalking between gates remains the clearest way to feel how commerce, faith, and neighbourhood life share one compact town.',
  'Architecture',
  'published',
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 3 DAY)
),
(
  '44444444-4444-4444-8444-444444444445',
  @inst,
  'city-of-saints-city-of-peace',
  'City of Saints, City of Peace',
  'Harar is known as a fourth holy city of Islam; peace here is practiced coexistence, not a tourist slogan.',
  'UNESCO records ~82 mosques and ~102 shrines within Jugol’s ~48 hectares. Criterion (iii) notes Harar as considered a fourth holy city of Islam. Arabic tradition also knows the city as Madīnat al-Awliyā’ — City of Saints.\n\n“City of Peace” names a lived practice of intercommunal coexistence. Visitors honour it through modest dress, asking before photographs, and following guide guidance at sacred sites.',
  'Faith & peace',
  'published',
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 4 DAY)
);

-- ========== EVENTS (DATE TBC — placeholder dates for CMS; copy says confirm locally) ==========

INSERT INTO events (id, institution_id, slug, title, summary, content, event_date, location, type, status) VALUES
(
  '77777777-7777-4777-8777-777777777771',
  @inst,
  'shuwalid-festival',
  'Shuwalid Festival',
  'UNESCO-listed three-day Harari festival after the six post-Ramadan fasts. Date TBC.',
  'Shuwalid is Harar’s distinctive annual festival (UNESCO ICH 2023). Exact Gregorian dates shift with the lunar calendar — DATE TBC until local announcement.\n\nAttend as a respectful guest: modest dress, ask before photographing people, follow organisers’ guidance.',
  '2027-03-16 00:00:00.000',
  'Harar Jugol (shrines near main gates — confirm locally)',
  'Festival',
  'published'
),
(
  '77777777-7777-4777-8777-777777777772',
  @inst,
  'ramadan-and-eid-al-fitr',
  'Ramadan and Eid al-Fitr',
  'Holy month of fasting and the celebration that ends it. Date TBC.',
  'During Ramadan expect quieter days and livelier nights. Eid al-Fitr brings communal prayers and visiting. Avoid public daytime eating during Ramadan out of respect. DATE TBC by moon sighting.',
  '2027-03-09 00:00:00.000',
  'Harar / Jugol',
  'Cultural day',
  'published'
),
(
  '77777777-7777-4777-8777-777777777773',
  @inst,
  'ashura',
  'Ashura',
  'Solemn Islamic observance; local shrine traditions may include porridge offerings. Date TBC.',
  'Ashura is a religious observance first. Local traditions associated with hyenas at certain shrines are distinct from the Eco-park visitor feeding. Observe quietly; ask before photography. DATE TBC.',
  '2027-06-15 00:00:00.000',
  'Selected shrines in/around Jugol',
  'Cultural day',
  'published'
),
(
  '77777777-7777-4777-8777-777777777774',
  @inst,
  'eid-al-adha',
  'Eid al-Adha',
  'Festival of Sacrifice — congregational prayer and family sharing. Date TBC.',
  'Expect larger mosque gatherings and family celebrations. Do not photograph private or sacrificial moments. DATE TBC by moon sighting.',
  '2027-05-16 00:00:00.000',
  'Harar / Jugol',
  'Festival',
  'published'
),
(
  '77777777-7777-4777-8777-777777777775',
  @inst,
  'mawlid-al-nabi',
  'Mawlid al-Nabi',
  'Commemoration of the Prophet’s birth. Date TBC; local programme confirm closer to the date.',
  'Prayers, recitations, and gatherings may mark Mawlid in Harar. Quiet observation; ask before photos. DATE TBC.',
  '2027-08-14 00:00:00.000',
  'Mosques and religious sites in/around Jugol',
  'Cultural day',
  'published'
),
(
  '77777777-7777-4777-8777-777777777776',
  @inst,
  'harar-cultural-festival',
  'Harar Cultural Festival',
  'Cultural celebration of Harari music, crafts, and community performance. Date TBC.',
  'Listings vary by year. Confirm with the Tourism Commission before planning travel. Ask before photographing performers; support artisans directly.',
  '2027-11-15 00:00:00.000',
  'Harar / Jugol — confirm venues',
  'Heritage event',
  'published'
),
(
  '77777777-7777-4777-8777-777777777777',
  @inst,
  'harar-city-run',
  'Harar City Run',
  'Community running event in/near the historic city. Date TBC.',
  'Confirm route, registration, and road closures with local organisers before publishing travel plans around this event.',
  '2027-03-20 00:00:00.000',
  'Harar — route TBC',
  'Heritage event',
  'published'
),
(
  '77777777-7777-4777-8777-777777777778',
  @inst,
  'international-harari-day',
  'International Harari Day',
  'Community heritage day celebrating Harari identity. Date TBC.',
  'Confirm annual date and public programme with the Tourism Commission. Irreecha is not listed on this site.',
  '2027-01-15 00:00:00.000',
  'Harar — confirm locally',
  'Heritage event',
  'published'
);
