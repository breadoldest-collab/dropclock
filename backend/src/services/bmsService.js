/**
 * BMS Service - The Core Engine
 * 
 * HOW IT WORKS:
 * 1. BMS has a predictable URL pattern for movie showtimes at a specific theatre:
 *    https://in.bookmyshow.com/buytickets/{EVENT_CODE}
 *    
 * 2. When bookings are NOT open: the page has no showtime data / shows "coming soon"
 * 3. When bookings ARE open: the page returns showtime slots with dates, times, prices
 * 
 * We check this transition. The moment showtimes appear → FIRE THE ALERT.
 * 
 * APPROACH:
 * - We use the BMS web endpoint that returns the page HTML
 * - We parse it with cheerio to look for showtime indicators
 * - We also try the internal API endpoint that the frontend fetches via XHR
 * - We rotate User-Agent headers to look like normal browser traffic
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import UserAgent from 'user-agents';

// BMS URL patterns
const BMS_BASE_URL = 'https://in.bookmyshow.com';

/**
 * Generate realistic browser headers to avoid being blocked
 */
function getHeaders() {
  const userAgent = new UserAgent({ deviceCategory: 'desktop' });
  return {
    'User-Agent': userAgent.toString(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
}

/**
 * Check if bookings are open for a movie at a specific venue
 * 
 * @param {Object} params
 * @param {string} params.eventCode - BMS event code (e.g., "ET00383474")
 * @param {string} params.citySlug - City slug (e.g., "hyderabad")
 * @param {string} params.venueCode - Cinema venue code (e.g., "PVHD") 
 * @param {string} params.date - Date in YYYYMMDD format (e.g., "20261120")
 * @returns {Object} { isOpen, showtimes, url, rawData }
 */
export async function checkBookingStatus({ eventCode, citySlug, venueCode, date }) {
  const result = {
    isOpen: false,
    showtimes: [],
    url: '',
    rawData: null,
    checkedAt: new Date().toISOString(),
    error: null,
  };

  try {
    // Strategy 1: Check the buytickets page for the venue
    // URL pattern: /buytickets/{EVENT_CODE}
    const movieUrl = `${BMS_BASE_URL}/buytickets/${eventCode}`;
    result.url = movieUrl;

    console.log(`[BMS] Checking: ${movieUrl}`);

    const response = await axios.get(movieUrl, {
      headers: getHeaders(),
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });

    if (response.status === 200) {
      const html = response.data;
      const $ = cheerio.load(html);

      // Look for showtime indicators in the page
      // BMS typically renders showtime buttons with specific classes/data attributes
      const showtimeIndicators = [
        '[data-online="Y"]',           // Showtime available online
        '.__showtime-pill',             // Showtime pill buttons
        '.showtime-pill-wrapper',       // Showtime wrapper
        '._available',                  // Available status
        '[data-cat]',                   // Seat category data
        '.showtime-pill',               // Generic showtime pill
        '.__venue-details',             // Venue with showtimes
      ];

      let foundShowtimes = false;

      for (const selector of showtimeIndicators) {
        const elements = $(selector);
        if (elements.length > 0) {
          foundShowtimes = true;
          elements.each((_, el) => {
            const time = $(el).text().trim();
            if (time) {
              result.showtimes.push(time);
            }
          });
        }
      }

      // Also check for "No shows available" or "Coming Soon" indicators
      const noShowIndicators = [
        'coming soon',
        'no shows available',
        'notify me',
        'not available',
        'bookings not open',
      ];

      const bodyText = $('body').text().toLowerCase();
      const hasNoShowMessage = noShowIndicators.some(indicator => 
        bodyText.includes(indicator)
      );

      // Check __INITIAL_STATE__ or __NEXT_DATA__ for showtime data
      // BMS often embeds data in script tags
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';
        
        if (content.includes('__INITIAL_STATE__') || content.includes('showDetails')) {
          try {
            // Try to extract JSON data from script tags
            const jsonMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s) 
              || content.match(/"showDetails"\s*:\s*(\[.*?\])/s);
            
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              result.rawData = data;
              
              // If showDetails has entries, bookings are likely open
              if (data.showDetails?.length > 0 || data.shows?.length > 0) {
                foundShowtimes = true;
              }
            }
          } catch {
            // JSON parsing failed, that's okay
          }
        }

        // Check for Next.js data
        if (content.includes('__NEXT_DATA__')) {
          try {
            const nextMatch = content.match(/window\.__NEXT_DATA__\s*=\s*({.*?});/s);
            if (nextMatch) {
              const nextData = JSON.parse(nextMatch[1]);
              result.rawData = nextData;
              
              // Look for showtime data in Next.js props
              const props = nextData?.props?.pageProps;
              if (props?.showDetails || props?.eventShowInfo) {
                foundShowtimes = true;
              }
            }
          } catch {
            // Parsing failed
          }
        }
      }

      result.isOpen = foundShowtimes && !hasNoShowMessage;
    } else if (response.status === 404) {
      // Movie page doesn't exist yet
      result.isOpen = false;
    }

  } catch (error) {
    result.error = error.message;
    console.error(`[BMS] Error checking ${eventCode}:`, error.message);
  }

  return result;
}

/**
 * Search for movies on BMS (to help users find event codes)
 * 
 * @param {string} query - Movie name to search
 * @param {string} city - City slug
 * @returns {Array} List of matching movies with event codes
 */
export async function searchMovies(query, city = 'hyderabad') {
  try {
    // BMS search endpoint (from web traffic analysis)
    const searchUrl = `${BMS_BASE_URL}/explore/movies-${city}`;
    
    const response = await axios.get(searchUrl, {
      headers: getHeaders(),
      timeout: 15000,
    });

    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      const movies = [];

      // Look for movie cards on the explore page
      // BMS renders movie cards with event codes in href or data attributes
      $('a[href*="/movies/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        
        // Extract event code from URL (pattern: /movies/city/slug/ETXXXXXXXX)
        const eventCodeMatch = href.match(/(ET\d{8,})/);
        
        if (eventCodeMatch && title) {
          movies.push({
            title: title.substring(0, 100), // Trim long text
            eventCode: eventCodeMatch[1],
            url: href.startsWith('http') ? href : `${BMS_BASE_URL}${href}`,
          });
        }
      });

      // Deduplicate by event code
      const unique = [...new Map(movies.map(m => [m.eventCode, m])).values()];
      
      // Filter by search query
      const queryLower = query.toLowerCase();
      return unique.filter(m => 
        m.title.toLowerCase().includes(queryLower)
      );
    }
  } catch (error) {
    console.error(`[BMS] Search error:`, error.message);
  }

  return [];
}

/**
 * Get list of cinemas/theatres in a city
 * 
 * @param {string} city - City slug (e.g., "hyderabad")
 * @returns {Array} List of theatres with venue codes
 */
export async function getTheatres(city = 'hyderabad') {
  try {
    const url = `${BMS_BASE_URL}/explore/cinemas-${city}`;
    
    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 15000,
    });

    if (response.status === 200) {
      const $ = cheerio.load(response.data);
      const theatres = [];

      // Parse theatre listings
      $('a[href*="/cinemas/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const name = $(el).text().trim();
        
        // Extract venue code from URL
        const codeMatch = href.match(/buytickets\/([A-Z]{4})/);
        
        if (name && name.length > 2) {
          theatres.push({
            name: name.substring(0, 100),
            venueCode: codeMatch ? codeMatch[1] : null,
            url: href.startsWith('http') ? href : `${BMS_BASE_URL}${href}`,
            city,
          });
        }
      });

      return [...new Map(theatres.map(t => [t.name, t])).values()];
    }
  } catch (error) {
    console.error(`[BMS] Theatre fetch error:`, error.message);
  }

  return [];
}

// In-memory SerpApi cache & daily budget guard (fits SerpApi 250/month free tier)
const serpApiCache = new Map();
const SERPAPI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let serpApiDailyState = { date: new Date().toISOString().slice(0, 10), count: 0 };

function getDailySerpApiLimit() {
  const configured = parseInt(process.env.SERPAPI_DAILY_LIMIT || '8', 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 8;
}

/**
 * Fetch live showtimes via SerpApi (Google Showtimes Knowledge Graph)
 * - Uses cinema-centric query + 10m cache so multiple alerts on the same theatre share 1 credit
 * - Enforces daily budget guard (default 8 calls/day = ~240/month free tier)
 */
export async function getShowtimesFromSerpApi({ theatreName, movieName, city = 'hyderabad', targetDate }) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;

  const cleanTheatre = (theatreName || '').split('(')[0].trim();
  const cleanCity = (city || 'hyderabad').toLowerCase().trim();
  const cleanMovie = movieName && movieName.toLowerCase() !== 'any show' ? movieName.trim() : '';
  const cacheKey = `${cleanTheatre.toLowerCase()}|${cleanCity}`;

  try {
    let showtimesData = null;

    // 1. Check 10-minute shared theatre cache first (0 credits used)
    const cached = serpApiCache.get(cacheKey);
    if (cached && (Date.now() - cached.fetchedAt) < SERPAPI_CACHE_TTL_MS) {
      showtimesData = cached.showtimesData;
      console.log(`[Showtimes API] Cache hit for "${cleanTheatre}" (0 credits used)`);
    } else {
      // 2. Check daily quota budget before spending a SerpApi credit
      const todayKey = new Date().toISOString().slice(0, 10);
      if (serpApiDailyState.date !== todayKey) {
        serpApiDailyState = { date: todayKey, count: 0 };
      }

      const dailyLimit = getDailySerpApiLimit();
      if (serpApiDailyState.count >= dailyLimit) {
        console.log(`[Showtimes API] Daily SerpApi budget reached (${serpApiDailyState.count}/${dailyLimit}) — conserving free tier until tomorrow`);
        return {
          shows: [],
          theatreName,
          movieFound: false,
          source: 'serpapi_quota_saved',
          quotaSaved: true,
          error: null,
        };
      }

      // Query cinema-centric so 1 search covers ALL movies at this theatre
      const query = `${cleanTheatre} ${cleanCity} showtimes`.trim();
      const location = cleanCity === 'hyderabad' ? 'Hyderabad, Telangana, India' : `${cleanCity}, India`;

      console.log(`[Showtimes API] Querying SerpApi (${serpApiDailyState.count + 1}/${dailyLimit} today): "${query}"`);
      serpApiDailyState.count += 1;

      const res = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google',
          q: query,
          location,
          gl: 'in',
          hl: 'en',
          api_key: apiKey,
        },
        timeout: 15000,
      });

      showtimesData = res.data?.showtimes || [];
      serpApiCache.set(cacheKey, { showtimesData, fetchedAt: Date.now() });
    }

    const extracted = [];

    for (const dayBlock of showtimesData) {
      const theaters = dayBlock.theaters || [];
      for (const th of theaters) {
        const thName = (th.name || '').toLowerCase();
        const targetLower = cleanTheatre.toLowerCase();
        if (!targetLower || thName.includes(targetLower.split(' ')[0])) {
          const showingList = th.showing || [];
          for (const s of showingList) {
            if (Array.isArray(s.time)) {
              extracted.push(...s.time);
            }
          }
        }
      }
      // Cinema-centric response: dayBlock.movies lists every movie playing at that theatre
      const movies = dayBlock.movies || [];
      for (const mv of movies) {
        const mvTitle = (mv.name || '').toLowerCase();
        if (!cleanMovie || mvTitle.includes(cleanMovie.toLowerCase())) {
          const showingList = mv.showing || [];
          for (const s of showingList) {
            if (Array.isArray(s.time)) {
              extracted.push(...s.time);
            }
          }
        }
      }
    }

    const uniqueShows = [...new Set(extracted.map(t => String(t).trim().toUpperCase()))];
    console.log(`[Showtimes API] Found ${uniqueShows.length} matching showtimes for "${cleanMovie || 'Any Show'}" @ ${cleanTheatre}`);
    return {
      shows: uniqueShows,
      theatreName,
      movieFound: uniqueShows.length > 0,
      source: 'serpapi',
      error: null,
    };
  } catch (error) {
    console.warn('[Showtimes API] SerpApi query failed:', error.response?.data?.error || error.message);
    return null;
  }
}

/**
 * Fetch and extract all showtimes for a specific cinema and date
 */
export async function getCinemaShows({ url, movieName, theatreName, city, targetDate }) {
  const result = {
    shows: [],
    theatreName: theatreName || '',
    movieFound: false,
    url,
    blocked: false,
    statusCode: null,
    error: null,
  };

  // Strategy 1: Use official SerpApi Google Showtimes if configured (zero 403s on cloud)
  if (process.env.SERPAPI_API_KEY && theatreName) {
    const serpResult = await getShowtimesFromSerpApi({ theatreName, movieName, city, targetDate });
    if (serpResult) {
      return { ...result, ...serpResult, url };
    }
  }

  // Validate URL strictly before attempting fetch
  if (!url || typeof url !== 'string') {
    result.error = 'Missing cinema URL';
    return result;
  }

  const trimmedUrl = url.trim();
  let fullUrl;
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    fullUrl = trimmedUrl;
  } else if (trimmedUrl.startsWith('/')) {
    fullUrl = `${BMS_BASE_URL}${trimmedUrl}`;
  } else {
    result.error = `Invalid cinema URL: "${trimmedUrl}"`;
    console.warn(`[BMS] Skipping invalid URL: ${trimmedUrl}`);
    return result;
  }

  try {
    // Verify URL syntax
    new URL(fullUrl);
  } catch {
    result.error = `Malformed URL: ${fullUrl}`;
    console.warn(`[BMS] Malformed URL skipped: ${fullUrl}`);
    return result;
  }

  try {
    console.log(`[BMS] Fetching cinema page: ${fullUrl}`);

    const response = await axios.get(fullUrl, {
      headers: getHeaders(),
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });

    result.statusCode = response.status;

    if (response.status === 403) {
      result.blocked = true;
      result.error = 'HTTP 403 - BookMyShow restricts automated cloud IP fetches (configure SERPAPI_API_KEY for cloud showtimes)';
      console.warn(`[BMS] 403 Access Restricted for ${fullUrl} — backing off poll interval`);
      return result;
    }

    if (response.status === 200) {
      const html = response.data;
      const $ = cheerio.load(html);

      // Extract theatre name from page
      const theatreTitle = $('h1, .venue-info h1, .cinema-name, [data-cinema-name]').first().text().trim();
      if (theatreTitle) {
        result.theatreName = theatreTitle;
      }

      // Check Next.js or Initial State data
      const scripts = $('script').toArray();
      let extractedFromData = false;

      for (const script of scripts) {
        const content = $(script).html() || '';
        
        // Try Next.js __NEXT_DATA__
        if (content.includes('__NEXT_DATA__')) {
          try {
            const nextMatch = content.match(/window\.__NEXT_DATA__\s*=\s*({.*?});/s);
            if (nextMatch) {
              const data = JSON.parse(nextMatch[1]);
              const pageProps = data?.props?.pageProps;
              const movieSchedules = pageProps?.cinemaShowtimes || pageProps?.showDetails || pageProps?.shows;

              if (Array.isArray(movieSchedules)) {
                movieSchedules.forEach(item => {
                  const title = item.movieName || item.eventTitle || '';
                  if (!movieName || title.toLowerCase().includes(movieName.toLowerCase())) {
                    result.movieFound = true;
                    if (item.showTimes) {
                      item.showTimes.forEach(st => result.shows.push(st.time || st));
                    }
                  }
                });
                if (result.shows.length > 0) extractedFromData = true;
              }
            }
          } catch {}
        }
      }

      // If not from JSON data, parse rendered showtime DOM elements
      if (!extractedFromData) {
        // Look for showtime pills
        // Examples: 09:00 AM, 11:05 AM, 02:10 PM, etc.
        const timeRegex = /\b(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM|am|pm)\b/g;

        // Find sections corresponding to the target movie if movieName is given
        let searchContext = $.root();
        if (movieName && movieName.toLowerCase() !== 'any show' && movieName.trim().length > 0) {
          $('*').each((_, el) => {
            const text = $(el).text();
            if (text && text.toLowerCase().includes(movieName.toLowerCase())) {
              const parentBlock = $(el).closest('li, div[class*="movie"], div[class*="show"]');
              if (parentBlock.length > 0) {
                searchContext = parentBlock;
                result.movieFound = true;
              }
            }
          });
        } else {
          result.movieFound = true; // Track any shows found
        }

        const rawText = searchContext.text();
        const matches = rawText.match(timeRegex);

        if (matches) {
          // Normalize and deduplicate showtimes while preserving order
          const uniqueShows = [...new Set(matches.map(t => t.toUpperCase().replace(/\s+/, ' ')))];
          result.shows = uniqueShows;
        }
      }

      console.log(`[BMS] Found ${result.shows.length} shows:`, result.shows);
    }
  } catch (error) {
    result.error = error.message;
    console.error(`[BMS] Cinema fetch error:`, error.message);
  }

  return result;
}

export default {
  checkBookingStatus,
  getCinemaShows,
  searchMovies,
  getTheatres,
};

