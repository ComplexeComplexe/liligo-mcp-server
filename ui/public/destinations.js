// Destination data with Unsplash images, guides, and metadata
const DESTINATIONS = {
  BCN: {
    name: 'Barcelona', country: 'Spain', iata: 'BCN',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&h=500&fit=crop',
    emoji: '🇪🇸',
    weather: { summer: '28°C', winter: '12°C', best_months: 'May - October' },
    guide: {
      highlights: ['Sagrada Familia', 'Park Guell', 'La Rambla', 'Gothic Quarter', 'Barceloneta Beach'],
      cuisine: ['Tapas', 'Paella', 'Pintxos', 'Crema Catalana'],
      transport: 'Metro T-Casual card (10 rides) — excellent public transit',
      tip: 'Book Sagrada Familia tickets online in advance. Visit Park Guell early morning to avoid crowds.',
      avg_budget: '80-120€/day',
    },
  },
  PAR: {
    name: 'Paris', country: 'France', iata: 'PAR',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=500&fit=crop',
    emoji: '🇫🇷',
    weather: { summer: '25°C', winter: '5°C', best_months: 'April - June, September' },
    guide: {
      highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Notre-Dame', 'Champs-Elysees'],
      cuisine: ['Croissants', 'Steak frites', 'Macarons', 'Wine & Cheese'],
      transport: 'Navigo Easy card for metro — zones 1-5 cover everything',
      tip: 'Get a Paris Museum Pass for 2-4 days. Walk along the Seine at sunset.',
      avg_budget: '100-150€/day',
    },
  },
  LHR: {
    name: 'London', country: 'United Kingdom', iata: 'LHR',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=500&fit=crop',
    emoji: '🇬🇧',
    weather: { summer: '22°C', winter: '6°C', best_months: 'May - September' },
    guide: {
      highlights: ['Big Ben', 'Tower of London', 'British Museum', 'Camden Market', 'Hyde Park'],
      cuisine: ['Fish & Chips', 'Sunday Roast', 'Afternoon Tea', 'Pie & Mash'],
      transport: 'Oyster card or contactless — use the Tube and buses',
      tip: 'Many top museums are free. Book West End shows on the day for discounts.',
      avg_budget: '120-180£/day',
    },
  },
  FCO: {
    name: 'Rome', country: 'Italy', iata: 'FCO',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&h=500&fit=crop',
    emoji: '🇮🇹',
    weather: { summer: '31°C', winter: '8°C', best_months: 'April - June, September - October' },
    guide: {
      highlights: ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Pantheon', 'Trastevere'],
      cuisine: ['Carbonara', 'Cacio e Pepe', 'Supplì', 'Gelato', 'Tiramisu'],
      transport: 'Roma Pass includes metro + buses + museum entries',
      tip: 'Skip the line at the Vatican by booking online. Best pizza is in Trastevere.',
      avg_budget: '80-120€/day',
    },
  },
  LIS: {
    name: 'Lisbon', country: 'Portugal', iata: 'LIS',
    image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1200&h=500&fit=crop',
    emoji: '🇵🇹',
    weather: { summer: '28°C', winter: '12°C', best_months: 'March - October' },
    guide: {
      highlights: ['Belem Tower', 'Alfama District', 'Tram 28', 'Time Out Market', 'LX Factory'],
      cuisine: ['Pasteis de Nata', 'Bacalhau', 'Bifana', 'Ginjinha'],
      transport: 'Viva Viagem card for metro, trams, and buses',
      tip: 'Take Tram 28 early morning to avoid crowds. Visit Sintra as a day trip.',
      avg_budget: '60-90€/day',
    },
  },
  JFK: {
    name: 'New York', country: 'United States', iata: 'JFK',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&h=500&fit=crop',
    emoji: '🇺🇸',
    weather: { summer: '30°C', winter: '-1°C', best_months: 'April - June, September - November' },
    guide: {
      highlights: ['Central Park', 'Statue of Liberty', 'Times Square', 'Brooklyn Bridge', 'MoMA'],
      cuisine: ['Pizza slices', 'Bagels', 'Cheesecake', 'Hot dogs'],
      transport: 'MetroCard for subway — unlimited 7-day pass is best value',
      tip: 'Get TKTS booth discounts for Broadway. Walk the High Line at sunset.',
      avg_budget: '150-250$/day',
    },
  },
  BER: {
    name: 'Berlin', country: 'Germany', iata: 'BER',
    image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200&h=500&fit=crop',
    emoji: '🇩🇪',
    weather: { summer: '24°C', winter: '1°C', best_months: 'May - September' },
    guide: {
      highlights: ['Brandenburg Gate', 'East Side Gallery', 'Museum Island', 'Reichstag', 'Mauerpark'],
      cuisine: ['Currywurst', 'Doner Kebab', 'Schnitzel', 'Berliner Weisse'],
      transport: 'BVG day pass covers U-Bahn, S-Bahn, trams, buses',
      tip: 'Free walking tours are excellent. Sunday flea market at Mauerpark is a must.',
      avg_budget: '70-100€/day',
    },
  },
  AMS: {
    name: 'Amsterdam', country: 'Netherlands', iata: 'AMS',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&h=500&fit=crop',
    emoji: '🇳🇱',
    weather: { summer: '22°C', winter: '4°C', best_months: 'April - September' },
    guide: {
      highlights: ['Anne Frank House', 'Rijksmuseum', 'Vondelpark', 'Canal Cruise', 'Jordaan District'],
      cuisine: ['Stroopwafel', 'Bitterballen', 'Herring', 'Dutch Pancakes'],
      transport: 'OV-chipkaart for trams and metro — but biking is the best way',
      tip: 'Book Anne Frank House tickets months ahead. Rent a bike to explore like a local.',
      avg_budget: '90-130€/day',
    },
  },
  ATH: {
    name: 'Athens', country: 'Greece', iata: 'ATH',
    image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200&h=500&fit=crop',
    emoji: '🇬🇷',
    weather: { summer: '33°C', winter: '10°C', best_months: 'April - June, September - October' },
    guide: {
      highlights: ['Acropolis', 'Plaka District', 'Temple of Zeus', 'Monastiraki Flea Market', 'National Garden'],
      cuisine: ['Souvlaki', 'Moussaka', 'Greek Salad', 'Baklava', 'Ouzo'],
      transport: 'Athens Transport card for metro, buses, and trams',
      tip: 'Visit the Acropolis at opening time (8am). Best rooftop views from Monastiraki.',
      avg_budget: '60-90€/day',
    },
  },
  PMI: {
    name: 'Palma de Mallorca', country: 'Spain', iata: 'PMI',
    image: 'https://images.unsplash.com/photo-1581889470536-467bdbe30cd0?w=600&h=400&fit=crop',
    hero: 'https://images.unsplash.com/photo-1581889470536-467bdbe30cd0?w=1200&h=500&fit=crop',
    emoji: '🇪🇸',
    weather: { summer: '31°C', winter: '10°C', best_months: 'May - October' },
    guide: {
      highlights: ['Palma Cathedral', 'Serra de Tramuntana', 'Cala Deia', 'Old Town', 'Bellver Castle'],
      cuisine: ['Ensaimada', 'Pa amb oli', 'Tumbet', 'Sobrasada'],
      transport: 'TIB buses cover the island — rent a car for mountain villages',
      tip: 'Rent a car to explore the Tramuntana mountains. Beach coves are best reached by boat.',
      avg_budget: '80-120€/day',
    },
  },
};

function getDestination(iata) {
  return DESTINATIONS[iata] || null;
}

function getPopularDestinations(excludeIata) {
  return Object.values(DESTINATIONS)
    .filter(d => d.iata !== excludeIata)
    .slice(0, 6);
}
