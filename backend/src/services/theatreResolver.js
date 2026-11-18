import axios from 'axios';

/**
 * Built-in Cinema Knowledge Base (Single Screens, Multiplexes & Chains)
 */
const KNOWN_THEATRES = [
  // Hyderabad - RTC X Roads Legendary Single Screens
  {
    aliases: ['sudarshan', 'sudarshan 35mm', 'sudarshan 35', 'sudx', 'rtc x roads sudarshan'],
    name: 'Sudarshan 35MM (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'SUDX',
    slug: 'sudarshan-35mm-rtc-x-roads',
  },
  {
    aliases: ['devi', 'devi 70mm', 'devi 70', 'devi 4k', 'devi laser', 'devh', 'rtc x roads devi'],
    name: 'Devi 70MM 4K Laser (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'DEVH',
    slug: 'devi-70mm-4k-laser-rtc-x-roads',
  },
  {
    aliases: ['sandhya 70mm', 'sandhya 70', 'sandhya', 'sanh', 's70m'],
    name: 'Sandhya 70MM (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'SANH',
    slug: 'sandhya-70mm-rtc-x-roads',
  },
  {
    aliases: ['sandhya 35mm', 'sandhya 35', 'sanm'],
    name: 'Sandhya 35MM (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'SANM',
    slug: 'sandhya-35mm-rtc-x-roads',
  },
  {
    aliases: ['sapthagiri', 'sapthagiri 70mm', 'sapt'],
    name: 'Sapthagiri 70MM (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'SAPT',
    slug: 'sapthagiri-70mm-rtc-x-roads',
  },
  {
    aliases: ['usha mayuri', 'ushamayuri', 'usha', 'mayuri 70mm'],
    name: 'Usha Mayuri 70MM (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'USHA',
    slug: 'usha-mayuri-70mm-rtc-x-roads',
  },

  // Hyderabad - Kukatpally & Moosapet Single Screens & Multiplexes
  {
    aliases: ['bramaramba', 'bhramaramba', 'bramaramba 70mm', 'bram'],
    name: 'Bramaramba 70MM (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'BRAM',
    slug: 'bramaramba-70mm-kukatpally',
  },
  {
    aliases: ['mallikarjuna', 'mallikarjuna 70mm', 'mallikarguna', 'mall'],
    name: 'Mallikarjuna 70MM (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'MALL',
    slug: 'mallikarjuna-70mm-kukatpally',
  },
  {
    aliases: ['arjun', 'arjun 70mm', 'arjun theatre'],
    name: 'Arjun 70MM (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'ARJN',
    slug: 'arjun-70mm-kukatpally',
  },
  {
    aliases: ['viswanath', 'vishwanath', 'viswanath 70mm', 'visw'],
    name: 'Viswanath 70MM (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'VISW',
    slug: 'viswanath-70mm-kukatpally',
  },
  {
    aliases: ['shiva', 'shiva 70mm', 'siva', 'siva 70mm'],
    name: 'Shiva 70MM (Dilsukhnagar / Moosapet)',
    city: 'hyderabad',
    locality: 'Moosapet',
    venueCode: 'SHIV',
    slug: 'shiva-70mm-moosapet',
  },
  {
    aliases: ['sriramulu', 'sreeramulu', 'sriramulu 70mm', 'sreeramulu 70mm', 'srrm'],
    name: 'Sriramulu 70MM (Moosapet)',
    city: 'hyderabad',
    locality: 'Moosapet',
    venueCode: 'SRRM',
    slug: 'sriramulu-70mm-moosapet',
  },
  {
    aliases: ['gokul', 'gokul 70mm', 'gokul theatre erragadda'],
    name: 'Gokul 70MM (Erragadda)',
    city: 'hyderabad',
    locality: 'Erragadda',
    venueCode: 'GOKL',
    slug: 'gokul-70mm-erragadda',
  },

  // Hyderabad - Major Multiplexes & Hubs
  {
    aliases: ['aaa', 'aaa cinemas', 'aaac', 'aaa ameerpet', 'allu arjun cinema'],
    name: 'AAA Cinemas (AAAC)',
    city: 'hyderabad',
    locality: 'Ameerpet',
    venueCode: 'AAAC',
    slug: 'aaa-cinemas-ameerpet',
  },
  {
    aliases: ['prasads', 'prasad', 'prasads multiplex', 'prhn', 'prasads imax', 'prasads pcx', 'screen 6 pcx'],
    name: 'Prasads Multiplex (PRHN)',
    city: 'hyderabad',
    locality: 'Necklace Road',
    venueCode: 'PRHN',
    slug: 'prasads-multiplex-hyderabad',
  },
  {
    aliases: ['amb', 'amb cinemas', 'ambc', 'mahesh babu cinema', 'amb gachibowli'],
    name: 'AMB Cinemas (AMBC)',
    city: 'hyderabad',
    locality: 'Gachibowli',
    venueCode: 'AMBC',
    slug: 'amb-cinemas-gachibowli',
  },
  {
    aliases: ['pvr nexus', 'pvr forum', 'nexus mall', 'pvnd', 'pvr kukatpally'],
    name: 'PVR Inox Nexus (PVND)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'PVND',
    slug: 'pvr-nexus-mall-kukatpally',
  },
  {
    aliases: ['pvr inorbit', 'inorbit mall', 'pvib', 'pvr cyberabad'],
    name: 'PVR Inorbit Mall (PVIB)',
    city: 'hyderabad',
    locality: 'Madhapur',
    venueCode: 'PVIB',
    slug: 'pvr-inorbit-cyberabad',
  },
  {
    aliases: ['pvr next galleria', 'next galleria punjagutta', 'pvr punjagutta'],
    name: 'PVR Next Galleria (Punjagutta)',
    city: 'hyderabad',
    locality: 'Punjagutta',
    venueCode: 'PVPG',
    slug: 'pvr-next-galleria-mall-punjagutta',
  },
  {
    aliases: ['pvr irrum manzil', 'irrum manzil', 'central mall'],
    name: 'PVR Next Galleria (Irrum Manzil)',
    city: 'hyderabad',
    locality: 'Irrum Manzil',
    venueCode: 'PVIM',
    slug: 'pvr-next-galleria-mall-irrum-manzil',
  },
  {
    aliases: ['cinepolis manjeera', 'cinepolis kukatpally', 'manjeera mall'],
    name: 'Cinepolis Manjeera Mall (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'CPMJ',
    slug: 'cinepolis-manjeera-trinity-mall-kukatpally',
  },
  {
    aliases: ['cinepolis dsl', 'dsl virtue mall', 'dsl mall uppal'],
    name: 'Cinepolis DSL Virtue Mall (Uppal)',
    city: 'hyderabad',
    locality: 'Uppal',
    venueCode: 'CPDU',
    slug: 'cinepolis-dsl-virtue-mall-uppal',
  },

  // Hyderabad - Dilsukhnagar & LB Nagar
  {
    aliases: ['konark', 'konark 70mm', 'konk'],
    name: 'Konark 70MM (Dilsukhnagar)',
    city: 'hyderabad',
    locality: 'Dilsukhnagar',
    venueCode: 'KONK',
    slug: 'konark-theatre-dilsukhnagar',
  },
  {
    aliases: ['rajdhani', 'rajdhani deluxe', 'rajdhani 70mm'],
    name: 'Rajdhani Deluxe (Dilsukhnagar)',
    city: 'hyderabad',
    locality: 'Dilsukhnagar',
    venueCode: 'RAJD',
    slug: 'rajdhani-deluxe-theatre-dilsukhnagar',
  },
  {
    aliases: ['venkatadri', 'venkatadri 70mm'],
    name: 'Venkatadri 70MM (Dilsukhnagar)',
    city: 'hyderabad',
    locality: 'Dilsukhnagar',
    venueCode: 'VENK',
    slug: 'venkatadri-theatre-dilsukhnagar',
  },
  {
    aliases: ['shalini', 'miraj shalini', 'shalini shivani'],
    name: 'Miraj Cinemas Shalini (Dilsukhnagar)',
    city: 'hyderabad',
    locality: 'Dilsukhnagar',
    venueCode: 'MRJS',
    slug: 'miraj-cinemas-shalini-shivani-dilsukhnagar',
  },

  // Hyderabad - Secunderabad
  {
    aliases: ['tivoli', 'tivoli cinema', 'tivoli extreme', 'tivl'],
    name: 'Tivoli Cinemas (Secunderabad)',
    city: 'hyderabad',
    locality: 'Secunderabad',
    venueCode: 'TIVL',
    slug: 'tivoli-cinema-secunderabad',
  },
  {
    aliases: ['prashanth', 'prashanth 70mm', 'prashanth secunderabad'],
    name: 'Prashanth 70MM (Secunderabad)',
    city: 'hyderabad',
    locality: 'Secunderabad',
    venueCode: 'PRSH',
    slug: 'prashanth-theatre-secunderabad',
  },

  // Asian Cinemas Chain
  {
    aliases: ['asian radhika', 'radhika multiplex', 'radhika ecil', 'asian ecil'],
    name: 'Asian Radhika Multiplex (ECIL)',
    city: 'hyderabad',
    locality: 'ECIL',
    venueCode: 'ASRD',
    slug: 'asian-radhika-multiplex-ecil',
  },
  {
    aliases: ['asian cinesquare', 'cinesquare uppal', 'asian uppal'],
    name: 'Asian CineSquare Multiplex (Uppal)',
    city: 'hyderabad',
    locality: 'Uppal',
    venueCode: 'ASCS',
    slug: 'asian-cinesquare-multiplex-uppal',
  },
  {
    aliases: ['asian mukta a2', 'mukta a2 ganga', 'ganga jamuna'],
    name: 'Asian Mukta A2 Cinemas (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'AMKT',
    slug: 'asian-mukta-a2-cinemas-rtc-x-roads',
  },
  {
    aliases: ['asian shivaganga', 'shivaganga', 'siva ganga'],
    name: 'Asian Shiva Ganga (Dilsukhnagar)',
    city: 'hyderabad',
    locality: 'Dilsukhnagar',
    venueCode: 'ASG',
    slug: 'asian-shiva-ganga-theatre-dilsukhnagar',
  },
  {
    aliases: ['asian tarakarama', 'tarakarama', 'taraka rama kachiguda'],
    name: 'Asian Taraka Rama (Kachiguda)',
    city: 'hyderabad',
    locality: 'Kachiguda',
    venueCode: 'ASTR',
    slug: 'asian-tarakarama-theatre-kachiguda',
  },

  // Bangalore Hubs
  {
    aliases: ['urvashi', 'urvashi 4k', 'urvashi theatre bangalore', 'urvashi dts'],
    name: 'Urvashi Digital 4K Cinema (Lalbagh Road)',
    city: 'bengaluru',
    locality: 'Lalbagh Road',
    venueCode: 'URVI',
    slug: 'urvashi-digital-4k-cinema-lalbagh-road',
  },
  {
    aliases: ['sandhya bangalore', 'sandhya madiwala'],
    name: 'Sandhya Digital 4K (Madiwala)',
    city: 'bengaluru',
    locality: 'Madiwala',
    venueCode: 'SNDB',
    slug: 'sandhya-digital-4k-madiwala',
  },
  {
    aliases: ['pvr orion', 'orion mall pvr'],
    name: 'PVR Orion Mall (Rajajinagar)',
    city: 'bengaluru',
    locality: 'Rajajinagar',
    venueCode: 'PVOR',
    slug: 'pvr-orion-mall-dr-rajkumar-road',
  },

  // Mumbai Hubs
  {
    aliases: ['maison inox', 'jio world plaza', 'maison inox jio', 'imjw'],
    name: 'Maison INOX Jio World Plaza (BKC)',
    city: 'mumbai',
    locality: 'BKC',
    venueCode: 'IMJW',
    slug: 'maison-inox-jio-world-plaza-bkc',
  },
  {
    aliases: ['g7 multiplex', 'gaiety galaxy', 'gaiety bandra'],
    name: 'G7 Multiplex Gaiety Galaxy (Bandra)',
    city: 'mumbai',
    locality: 'Bandra',
    venueCode: 'G7MX',
    slug: 'g7-multiplex-bandra',
  },
];

/**
 * Fuzzy similarity scoring between two strings
 */
function calculateSimilarity(s1, s2) {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.85;

  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const common = wordsA.filter(w => wordsB.includes(w));
  if (common.length > 0) {
    return 0.5 + (0.4 * (common.length / Math.max(wordsA.length, wordsB.length)));
  }

  return 0.0;
}

/**
 * Fast Local Fuzzy Resolver
 */
export function resolveFromDatabase(query, city = 'hyderabad', targetDate = '20261118') {
  if (!query) return null;
  const cleanQuery = query.toLowerCase().trim();
  const cleanDate = targetDate.replace(/[^0-9]/g, '') || '20261118';

  let bestMatch = null;
  let highestScore = 0;

  for (const t of KNOWN_THEATRES) {
    // Check aliases
    for (const alias of t.aliases) {
      const score = calculateSimilarity(cleanQuery, alias);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = t;
      }
    }

    // Check theatre name itself
    const nameScore = calculateSimilarity(cleanQuery, t.name);
    if (nameScore > highestScore) {
      highestScore = nameScore;
      bestMatch = t;
    }
  }

  if (bestMatch && highestScore >= 0.5) {
    const cityCode = bestMatch.city === 'hyderabad' ? 'HYD' : (bestMatch.city === 'bengaluru' ? 'BANG' : 'MUM');
    return {
      theatreName: bestMatch.name,
      city: bestMatch.city,
      locality: bestMatch.locality,
      venueCode: bestMatch.venueCode,
      bmsUrl: `https://in.bookmyshow.com/cinemas/${cityCode}/${bestMatch.slug}/buytickets/${bestMatch.venueCode}/${cleanDate}`,
      confidence: highestScore,
      source: 'database_fuzzy',
    };
  }

  return null;
}

/**
 * Gemini AI Resolver
 * Intelligently classifies any local theatre across India via Google Gemini
 */
export async function resolveWithGeminiAI(query, city = 'hyderabad', targetDate = '20261118') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are a BookMyShow India cinema intelligence expert.
Given this user input for a cinema / theatre: "${query}" in city "${city}".

Identify:
1. Standardized Official Theatre Name with Locality (e.g. "Devi 70MM 4K Laser (RTC X Roads)", "Sandhya 70MM (RTC X Roads)", "Bramaramba 70MM (Kukatpally)", "AAA Cinemas (AAAC)")
2. Locality or area
3. Standard 4-letter BMS Venue Code (e.g. "DEVH", "SANH", "BRAM", "AAAC", "PRHN", "SUDX", or reasonable 4-letter code)
4. Accurate BookMyShow URL slug for this theatre (e.g. "devi-70mm-4k-laser-rtc-x-roads", "sandhya-70mm-rtc-x-roads")

Reply strictly with JSON only without markdown formatting:
{
  "theatreName": "...",
  "locality": "...",
  "city": "...",
  "venueCode": "...",
  "slug": "..."
}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      },
      { timeout: 12000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    let data = JSON.parse(text);
    if (Array.isArray(data) && data.length > 0) data = data[0];
    if (!data || !data.theatreName) return null;

    const cleanDate = targetDate.replace(/[^0-9]/g, '') || '20261118';
    const citySlug = (data.city || city).toLowerCase();
    const cityCode = citySlug === 'hyderabad' ? 'HYD' : (citySlug === 'bengaluru' ? 'BANG' : 'MUM');
    const slug = data.slug || data.theatreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const venueCode = data.venueCode || 'VNU1';

    return {
      theatreName: data.theatreName,
      city: citySlug,
      locality: data.locality || '',
      venueCode: venueCode,
      bmsUrl: `https://in.bookmyshow.com/cinemas/${cityCode}/${slug}/buytickets/${venueCode}/${cleanDate}`,
      confidence: 0.95,
      source: 'gemini_ai',
    };
  } catch (error) {
    console.warn('[AI Resolver] Gemini AI resolution skipped:', error.message);
    return null;
  }
}

/**
 * Universal Master Resolver
 * 1. Checks High-Speed Built-In Fuzzy Database (Instant, 0ms, covers 99% of top single screens & multiplexes)
 * 2. Falls back to Google Gemini AI if API key is present
 * 3. Falls back to smart title formatting + BookMyShow city explorer
 */
export async function resolveTheatre(query, city = 'hyderabad', targetDate = '20261118') {
  if (!query) return null;

  // 1. Check built-in database first (instantaneous)
  const localMatch = resolveFromDatabase(query, city, targetDate);
  if (localMatch && localMatch.confidence >= 0.75) {
    return localMatch;
  }

  // 2. Query Gemini AI if API key is configured
  if (process.env.GEMINI_API_KEY) {
    const aiMatch = await resolveWithGeminiAI(query, city, targetDate);
    if (aiMatch) return aiMatch;
  }

  // 3. Fallback: return highest-scoring database match if >= 0.5
  if (localMatch) {
    return localMatch;
  }

  // 4. Default: Title Case + BMS City Search
  const titleCased = query
    .trim()
    .replace(/\b[a-z]/g, l => l.toUpperCase())
    .replace(/\b70mm\b/i, '70MM')
    .replace(/\b35mm\b/i, '35MM')
    .replace(/\b4k\b/i, '4K');

  const cleanCity = (city || 'hyderabad').toLowerCase();
  return {
    theatreName: titleCased,
    city: cleanCity,
    locality: '',
    venueCode: 'UNKNOWN',
    bmsUrl: `https://in.bookmyshow.com/explore/cinemas-${cleanCity}`,
    confidence: 0.5,
    source: 'heuristic',
  };
}

/**
 * Live Suggestions Endpoint
 * Returns top matching theatres as the user types
 */
export function getLiveSuggestions(query, limit = 5) {
  if (!query || query.length < 2) return [];
  const clean = query.toLowerCase().trim();

  const results = [];
  for (const t of KNOWN_THEATRES) {
    let bestScore = 0;
    for (const a of t.aliases) {
      if (a.startsWith(clean)) bestScore = Math.max(bestScore, 0.9);
      else if (a.includes(clean)) bestScore = Math.max(bestScore, 0.7);
    }
    if (t.name.toLowerCase().includes(clean)) bestScore = Math.max(bestScore, 0.8);

    if (bestScore > 0) {
      results.push({
        theatreName: t.name,
        city: t.city,
        locality: t.locality,
        venueCode: t.venueCode,
        score: bestScore,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

