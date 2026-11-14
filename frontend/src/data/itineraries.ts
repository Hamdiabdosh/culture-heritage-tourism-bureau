/** Phase 2: static day plans wired to seeded attraction/experience slugs. */
export type ItineraryStop = {
  time: string
  title: string
  note: string
  href?: string
}

export type ItineraryDay = {
  label: string
  blocks: { period: 'Morning' | 'Afternoon' | 'Evening'; stops: ItineraryStop[] }[]
}

export type Itinerary = {
  id: string
  title: string
  summary: string
  days: ItineraryDay[]
}

export const itineraries: Itinerary[] = [
  {
    id: '24h',
    title: 'Harar in 24 hours',
    summary: 'Markets, museums, sunset on the walls, and night hyena feeding — the essential first-timer loop.',
    days: [
      {
        label: 'One perfect day',
        blocks: [
          {
            period: 'Morning',
            stops: [
              {
                time: '08:30',
                title: 'Five historic gates walk',
                note: 'Enter through Shoa Gate area and feel the car-free alleys wake up.',
                href: '/explore/five-historic-gates',
              },
              {
                time: '10:30',
                title: 'Jamia Mosque',
                note: 'Approach with modest dress; ask locally about visitor etiquette.',
                href: '/explore/jamia-mosque',
              },
            ],
          },
          {
            period: 'Afternoon',
            stops: [
              {
                time: '14:00',
                title: 'Arthur Rimbaud Cultural Center',
                note: 'Cool courtyard pause and a window into Harar’s cosmopolitan past.',
                href: '/explore/rimbaud-cultural-center',
              },
              {
                time: '16:30',
                title: 'Three-round coffee ceremony',
                note: 'Sit for Abol, Tona, and Baraka with a verified host.',
                href: '/experiences/harari-coffee-ceremony',
              },
            ],
          },
          {
            period: 'Evening',
            stops: [
              {
                time: '18:30',
                title: 'Sunset on the walls',
                note: 'Golden light along the Jugol perimeter — ask before photographing people.',
                href: '/explore/five-historic-gates',
              },
              {
                time: '19:30',
                title: 'Evening hyena feeding',
                note: 'Arrange only via the Eco-park / Tourism Commission office; arrive before dusk.',
                href: '/experiences/evening-hyena-feeding',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '3day',
    title: '3-day heritage & flavor',
    summary: 'Crafts, shrine architecture, coffee tasting, and deeper walks for travelers who want more than a postcard day.',
    days: [
      {
        label: 'Day 1 — Jugol foundations',
        blocks: [
          {
            period: 'Morning',
            stops: [
              {
                time: '09:00',
                title: 'Historic gates loop',
                note: 'Orient yourself to Duk Ber, Erer Ber, and the living wall.',
                href: '/explore/five-historic-gates',
              },
            ],
          },
          {
            period: 'Afternoon',
            stops: [
              {
                time: '14:00',
                title: 'Rimbaud Cultural Center',
                note: 'Trade routes, literature, and courtyard shade.',
                href: '/explore/rimbaud-cultural-center',
              },
            ],
          },
          {
            period: 'Evening',
            stops: [
              {
                time: '18:00',
                title: 'Coffee ceremony',
                note: 'Learn the three rounds before the night city stirs.',
                href: '/experiences/harari-coffee-ceremony',
              },
            ],
          },
        ],
      },
      {
        label: 'Day 2 — Faith & craft',
        blocks: [
          {
            period: 'Morning',
            stops: [
              {
                time: '09:00',
                title: 'Jamia Mosque',
                note: 'Quiet visit with respect for prayer times.',
                href: '/explore/jamia-mosque',
              },
            ],
          },
          {
            period: 'Afternoon',
            stops: [
              {
                time: '14:00',
                title: 'Basket weaving with masters',
                note: 'Color, pattern, and the mesob’s place in the Gē Gār.',
                href: '/experiences/basket-weaving-with-masters',
              },
            ],
          },
          {
            period: 'Evening',
            stops: [
              {
                time: '19:00',
                title: 'Night hyena feeding',
                note: 'The living pact between city and hills.',
                href: '/experiences/night-hyena-feeding',
              },
            ],
          },
        ],
      },
      {
        label: 'Day 3 — Slow flavor',
        blocks: [
          {
            period: 'Morning',
            stops: [
              {
                time: '09:30',
                title: 'Market & gate alleys',
                note: 'Spices, baskets, and unhurried photography with consent.',
                href: '/explore/five-historic-gates',
              },
            ],
          },
          {
            period: 'Afternoon',
            stops: [
              {
                time: '15:00',
                title: 'Second coffee sitting',
                note: 'Return to a courtyard host if the first ceremony opened a door.',
                href: '/experiences/harari-coffee-ceremony',
              },
            ],
          },
          {
            period: 'Evening',
            stops: [
              {
                time: '18:00',
                title: 'Walls at dusk',
                note: 'A last walk before departure — City of Peace under evening light.',
                href: '/explore/five-historic-gates',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'family',
    title: 'Family & history trail',
    summary: 'Leisurely stops with shorter walks — museums, crafts, and coffee without the late-night rush.',
    days: [
      {
        label: 'Relaxed day',
        blocks: [
          {
            period: 'Morning',
            stops: [
              {
                time: '09:30',
                title: 'Rimbaud Cultural Center',
                note: 'Indoor/outdoor mix that works well with children and elders.',
                href: '/explore/rimbaud-cultural-center',
              },
            ],
          },
          {
            period: 'Afternoon',
            stops: [
              {
                time: '14:00',
                title: 'Basket weaving workshop',
                note: 'Hands-on and beginner-friendly.',
                href: '/experiences/basket-weaving-with-masters',
              },
              {
                time: '16:00',
                title: 'Gentle gate stroll',
                note: 'Short segments with shade breaks — skip long wall loops.',
                href: '/explore/five-historic-gates',
              },
            ],
          },
          {
            period: 'Evening',
            stops: [
              {
                time: '17:30',
                title: 'Family coffee ceremony',
                note: 'Earlier than night feeding; warm, seated, and welcoming.',
                href: '/experiences/harari-coffee-ceremony',
              },
            ],
          },
        ],
      },
    ],
  },
]
