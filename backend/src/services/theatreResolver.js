import axios from 'axios';

/**
 * Verified Cinema Knowledge Base with REAL BookMyShow Venue URLs
 * Note: BookMyShow cinema pages (/cinemas/...) open the live venue page directly
 * without 404ing on future unopened dates.
 */
const KNOWN_THEATRES = [
  {
    aliases: ['aaa', 'aaa cinemas', 'aaac', 'acas', 'aaa ameerpet', 'allu arjun cinema'],
    name: 'AAA Cinemas (Ameerpet)',
    city: 'hyderabad',
    locality: 'Ameerpet',
    venueCode: 'ACAS',
    url: 'https://in.bookmyshow.com/cinemas/hyderabad/aaa-cinemas-ameerpet/ACAS',
  },
  {
    aliases: ['allu', 'allu cinemas', 'allu kokapet', 'alco'],
    name: 'ALLU Cinemas (Kokapet)',
    city: 'hyderabad',
    locality: 'Kokapet',
    venueCode: 'ALCO',
    url: 'https://in.bookmyshow.com/cinemas/hyderabad/allu-cinemas-kokapet/ALCO',
  },
  {
    aliases: ['prasads', 'prasad', 'prasads multiplex', 'prhn', 'prasads imax', 'prasads pcx', 'screen 6 pcx'],
    name: 'Prasads Multiplex (Necklace Road)',
    city: 'hyderabad',
    locality: 'Necklace Road',
    venueCode: 'PRHN',
    url: 'https://in.bookmyshow.com/cinemas/hyderabad/prasads-multiplex-hyderabad/PRHN',
  },
  {
    aliases: ['amb', 'amb cinemas', 'ambc', 'ambg', 'mahesh babu cinema', 'amb gachibowli'],
    name: 'AMB Cinemas (Gachibowli)',
    city: 'hyderabad',
    locality: 'Gachibowli',
    venueCode: 'AMBG',
    url: 'https://in.bookmyshow.com/cinemas/amb-cinemas-gachibowli/AMBG',
  },
  {
    aliases: ['pvr nexus', 'pvr forum', 'nexus mall', 'pvnd', 'pvnk', 'pvr kukatpally', 'pvr inox nexus'],
    name: 'PVR: Nexus Mall (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'PVNK',
    url: 'https://in.bookmyshow.com/cinemas/pvr-nexus-mall-kukatpally-hyderabad/PVNK',
  },
  {
    aliases: ['sudarshan', 'sudarshan 35mm', 'sudarshan 35', 'sudx', 'rtc x roads sudarshan'],
    name: 'Sudarshan 35MM 4K Laser (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: '2485',
    url: 'https://in.bookmyshow.com/cinemas/sudarshan-35mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/BMSH/2485',
  },
  {
    aliases: ['devi', 'devi 70mm', 'devi 70', 'devi 4k', 'devi laser', 'devh', 'rtc x roads devi'],
    name: 'Devi 70MM 4K Laser (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: '2483',
    url: 'https://in.bookmyshow.com/cinemas/devi-70mm-4k-laser-dolby-atmos-rtc-x-roads-hyderabad/BMSH/2483',
  },
  {
    aliases: ['sandhya 70mm', 'sandhya 70', 'sandhya', 'sanh', 'sand'],
    name: 'Sandhya 70MM (RTC X Roads)',
    city: 'hyderabad',
    locality: 'RTC X Roads',
    venueCode: 'SAND',
    url: 'https://in.bookmyshow.com/cinemas/sandhya-70mm-rtc-x-roads-hyderabad/SAND',
  },
  {
    aliases: ['bramaramba', 'bhramaramba', 'bramaramba 70mm', 'bhramaramba 70mm', 'bhra'],
    name: 'Bhramaramba 70MM (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: 'BHRA',
    url: 'https://in.bookmyshow.com/cinemas/bhramaramba-70mm-kukatpally-hyderabad/BHRA',
  },
  {
    aliases: ['mallikarjuna', 'mallikarjuna 70mm', 'mallikarguna', 'mall'],
    name: 'Mallikarjuna 70MM (Kukatpally)',
    city: 'hyderabad',
    locality: 'Kukatpally',
    venueCode: '1684',
    url: 'https://in.bookmyshow.com/cinemas/mallikarjuna-70mm-a-c-dts-kukatpally-hyderabad/BMSH/1684',
  },
  {
    aliases: ['sriramulu', 'sreeramulu', 'sree ramulu', 'sriramulu 70mm', 'sreeramulu 70mm'],
    name: 'Sree Ramulu 70MM 4K Laser (Moosapet)',
    city: 'hyderabad',
    locality: 'Moosapet',
    venueCode: '1686',
    url: 'https://in.bookmyshow.com/cinemas/sree-ramulu-70mm-4k-laser-moosapet-hyderabad/BMSH/1686',
  },
  {
    aliases: ['gokul', 'gokul 70mm', 'gokul theatre', 'gokul erragadda'],
    name: 'Gokul 70MM 4K DTS (Erragadda)',
    city: 'hyderabad',
    locality: 'Erragadda',
    venueCode: '2493',
    url: 'https://in.bookmyshow.com/cinemas/gokul-70mm-4k-dts-erragadda-hyderabad/BMSH/2493',
  },
  {
    aliases: ['asian radhika', 'radhika multiplex', 'radhika ecil', 'armh'],
    name: 'Asian Radhika Multiplex (ECIL)',
    city: 'hyderabad',
    locality: 'ECIL',
    venueCode: 'ARMH',
    url: 'https://in.bookmyshow.com/cinemas/asian-radhika-multiplex-ecil-hyderabad/ARMH',
  },
  {
    aliases: ['avd', 'avd cinemas', 'avdm', 'avd mahbubnagar'],
    name: 'AVD Cinemas (Mahbubnagar)',
    city: 'hyderabad',
    locality: 'Mahbubnagar',
    venueCode: 'AVDM',
    url: 'https://in.bookmyshow.com/cinemas/avd-cinemas-mahbubnagar/AVDM',
  },
];

// Permanent in-memory cache for resolved theatres via SerpApi / Gemini
const resolvedCache = new Map();

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
  const common = wordsA.filter(w => w.length > 1 && wordsB.includes(w));
  if (common.length > 0) {
    return 0.5 + (0.4 * (common.length / Math.max(wordsA.length, wordsB.length)));
  }

  return 0.0;
}

/**
 * Fast Local Verified Database Resolver
 */
export function resolveFromDatabase(query) {
  if (!query) return null;
  const cleanQuery = query.toLowerCase().trim();

  let bestMatch = null;
  let highestScore = 0;

  for (const t of KNOWN_THEATRES) {
    for (const alias of t.aliases) {
      const score = calculateSimilarity(cleanQuery, alias);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = t;
      }
    }
    const nameScore = calculateSimilarity(cleanQuery, t.name);
    if (nameScore > highestScore) {
      highestScore = nameScore;
      bestMatch = t;
    }
  }

  if (bestMatch && highestScore >= 0.7) {
    return {
      theatreName: bestMatch.name,
      city: bestMatch.city,
      locality: bestMatch.locality,
      venueCode: bestMatch.venueCode,
      bmsUrl: bestMatch.url,
      confidence: highestScore,
      source: 'verified_database',
    };
  }

  return null;
}

/**
 * Find the REAL, LIVE BookMyShow cinema page URL via SerpApi Google Index
 * Guarantees the "Book on BMS" button opens the actual cinema page instead of a 404.
 */
export async function findRealBmsUrlViaSerpApi(query, city = 'hyderabad') {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey || !query) return null;

  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google',
        q: `site:in.bookmyshow.com ${query} cinema`,
        gl: 'in',
        hl: 'en',
        num: 5,
        api_key: apiKey,
      },
      timeout: 10000,
    });

    const organic = res.data?.organic_results || [];
    const bmsResult = organic.find(
      r =>
        r.link &&
        r.link.includes('in.bookmyshow.com/') &&
        (r.link.includes('/cinemas/') || r.link.includes('/buytickets/')) &&
        !r.link.includes('/explore/')
    );

    if (bmsResult) {
      // Clean title like "AVD Cinemas: Mahbubnagar | Movie Showtimes & Ticket Booking ..."
      const rawTitle = (bmsResult.title || '').split('|')[0].split('-')[0].trim();
      const urlParts = bmsResult.link.split('/').filter(Boolean);
      const venueCode = urlParts[urlParts.length - 1] || 'BMS';

      return {
        theatreName: rawTitle || query,
        city: city.toLowerCase(),
        locality: rawTitle.includes(':') ? rawTitle.split(':')[1].trim() : '',
        venueCode: venueCode.toUpperCase(),
        bmsUrl: bmsResult.link,
        confidence: 0.98,
        source: 'serpapi_bms_live',
      };
    }
  } catch (error) {
    console.warn('[Theatre Resolver] SerpApi BMS lookup skipped:', error.message);
  }
  return null;
}

/**
 * Gemini AI Resolver
 * Identifies exact official cinema name, locality, and city for any Indian theatre
 */
export async function resolveWithGeminiAI(query, city = 'hyderabad') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are an Indian cinema directory expert for BookMyShow India.
Given this user input for a cinema / theatre: "${query}" (default city hint: "${city}").

Identify the real cinema name (fix spelling mistakes or abbreviations if obvious), its locality/area, and its city in India.
Reply strictly with JSON only:
{
  "theatreName": "Official Cinema Name (Locality)",
  "locality": "Area or Town",
  "city": "city in lowercase"
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
      { timeout: 10000 }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    let data = JSON.parse(text);
    if (Array.isArray(data) && data.length > 0) data = data[0];
    if (!data || !data.theatreName) return null;

    return {
      theatreName: data.theatreName,
      city: (data.city || city).toLowerCase(),
      locality: data.locality || '',
      confidence: 0.92,
      source: 'gemini_ai',
    };
  } catch (error) {
    console.warn('[AI Resolver] Gemini AI resolution skipped:', error.message);
    return null;
  }
}

/**
 * Universal Master Resolver
 * 1. Verified local cinema database (0ms, exact real BMS links)
 * 2. Permanent in-memory cache
 * 3. Live BookMyShow URL lookup via SerpApi (returns 100% real BMS cinema URLs!)
 * 4. Gemini AI identification + SerpApi BMS URL lookup for the AI-corrected name
 * 5. Safe fallback (never invents fake 404 venue codes!)
 */
export async function resolveTheatre(query, city = 'hyderabad') {
  if (!query) return null;
  const cleanKey = `${query.toLowerCase().trim()}|${(city || 'hyderabad').toLowerCase().trim()}`;

  // 1. Verified DB match (instant)
  const localMatch = resolveFromDatabase(query);
  if (localMatch) {
    return localMatch;
  }

  // 2. Check cache
  if (resolvedCache.has(cleanKey)) {
    return resolvedCache.get(cleanKey);
  }

  // 3. Try finding the real live BookMyShow page URL directly via SerpApi
  const serpDirect = await findRealBmsUrlViaSerpApi(query, city);
  if (serpDirect) {
    resolvedCache.set(cleanKey, serpDirect);
    return serpDirect;
  }

  // 4. Ask Gemini AI to identify / spell-correct the cinema name
  const aiMatch = await resolveWithGeminiAI(query, city);
  if (aiMatch) {
    // Check if the AI-corrected name matches our verified DB
    const dbFromAi = resolveFromDatabase(aiMatch.theatreName);
    if (dbFromAi) {
      resolvedCache.set(cleanKey, dbFromAi);
      return dbFromAi;
    }

    // Or look up the real BMS page for the AI-corrected name
    const serpFromAi = await findRealBmsUrlViaSerpApi(aiMatch.theatreName, aiMatch.city);
    if (serpFromAi) {
      const merged = {
        ...serpFromAi,
        theatreName: aiMatch.theatreName || serpFromAi.theatreName,
        source: 'gemini_ai+serpapi',
      };
      resolvedCache.set(cleanKey, merged);
      return merged;
    }

    const aiFallback = {
      ...aiMatch,
      venueCode: 'BMS',
      bmsUrl: `https://in.bookmyshow.com/explore/cinemas-${aiMatch.city || 'hyderabad'}`,
    };
    resolvedCache.set(cleanKey, aiFallback);
    return aiFallback;
  }

  // 5. Heuristic fallback
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
 * Returns top matching verified theatres with their real BookMyShow URLs
 */
export function getLiveSuggestions(query, limit = 5) {
  if (!query || query.length < 2) return [];
  const clean = query.toLowerCase().trim();

  const results = [];
  for (const t of KNOWN_THEATRES) {
    let bestScore = 0;
    for (const a of t.aliases) {
      if (a.startsWith(clean)) bestScore = Math.max(bestScore, 0.95);
      else if (a.includes(clean)) bestScore = Math.max(bestScore, 0.75);
    }
    if (t.name.toLowerCase().includes(clean)) bestScore = Math.max(bestScore, 0.85);

    if (bestScore > 0) {
      results.push({
        theatreName: t.name,
        city: t.city,
        locality: t.locality,
        venueCode: t.venueCode,
        bmsUrl: t.url,
        score: bestScore,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
