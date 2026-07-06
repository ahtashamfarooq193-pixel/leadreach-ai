import crypto from 'crypto';

// Helper to validate if email is likely real (not fake pattern)
function isLikelyRealEmail(email) {
  if (!email) return false;
  
  // These are obviously fake/placeholder emails
  const fakeDomains = [
    'example.com', 'test.com', 'domain.com', 'company.com',
    'business.com', 'localhost', 'sample.com', '123.com'
  ];
  
  const lower = email.toLowerCase();
  return !fakeDomains.some(domain => lower.endsWith(domain));
}

// Cloudflare Email Protection Decryption Helper
function decodeCfEmail(encodedString) {
  let email = "";
  try {
    const r = parseInt(encodedString.substr(0, 2), 16);
    for (let n = 2; n < encodedString.length; n += 2) {
      const c = parseInt(encodedString.substr(n, 2), 16) ^ r;
      email += String.fromCharCode(c);
    }
  } catch (e) {}
  return email;
}

// Helper to parse JSON-LD schemas
function extractJsonLd(html) {
  try {
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    let match;
    const results = [];
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1].trim());
        results.push(json);
      } catch (e) {}
    }
    return results;
  } catch (err) {
    return [];
  }
}

// Helper to validate if a hostname is a real business domain (not a search engine, social media, or directory)
function isValidBusinessDomain(host) {
  const invalidSubstrings = [
    'google', 'youtube', 'linkedin', 'twitter', 'pinterest',
    'instagram', 'facebook', 'yelp', 'yellowpages', 'tripadvisor',
    'mapquest', 'wix', 'wordpress', 'duckduckgo', 'bing', 'yahoo',
    'reddit', 'quora', 'tiktok', 'amazon', 'ebay', 'craigslist',
    'glassdoor', 'bbb.org', 'trustpilot', 'nextdoor', 'angieslist',
    'thumbtack', 'houzz', 'homeadvisor', 'msn.com', 'microsoft.com',
    'apple.com', 'wikipedia', 'w3.org', 'schema.org', 'googleapis'
  ];
  const lower = host.toLowerCase();
  for (const sub of invalidSubstrings) {
    if (lower.includes(sub)) return false;
  }
  return true;
}

/** Hosts that are directories, social profiles, or NOT a business's own website */
const DIRECTORY_HOSTS = [
  'yellowpages.com', 'yp.com', 'ypcdn.com', 'yelp.com', 'trustpilot.com',
  'bbb.org', 'business.com', 'clutch.co', 'facebook.com', 'fb.com',
  'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'pinterest.com',
  'tripadvisor.com', 'mapquest.com', 'foursquare.com', 'manta.com',
  'superpages.com', 'hotfrog.com', 'angi.com', 'angieslist.com',
  'homeadvisor.com', 'thumbtack.com', 'houzz.com', 'nextdoor.com',
  'glassdoor.com', 'indeed.com', 'google.com', 'google.co', 'goo.gl',
  'wikipedia.org', 'amazon.com', 'ebay.com', 'craigslist.org',
  'duckduckgo.com', 'bing.com', 'yahoo.com', 'reddit.com', 'quora.com',
  'example.com', 'test.com', 'domain.com', 'company.com', 'email.com',
  'sentry.io', 'schema.org', 'w3.org', 'godaddy.com', 'squarespace.com',
  'sites.google.com', 'blogspot.com', 'medium.com', 'tiktok.com',
  'web3.career', 'remoteok.com', 'weworkremotely.com', 'remotive.com',
];

const PARKING_PAGE_PHRASES = [
  'domain is for sale', 'buy this domain', 'this domain may be for sale',
  'parked free', 'sedo parking', 'namecheap parking', 'godaddy parking',
  'website expired', 'account suspended', 'this site is under construction',
];

function normalizeWebsiteUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();
  if (!url.startsWith('http')) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

function isDirectoryOrThirdPartyUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return DIRECTORY_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return true;
  }
}

function cleanBusinessName(name) {
  if (!name || typeof name !== 'string') return null;
  const cleaned = name
    .replace(/\s+/g, ' ')
    .replace(/^(welcome to|home|official site of)\s+/i, '')
    .trim()
    .substring(0, 120);
  return cleaned.length >= 2 ? cleaned : null;
}

function extractBusinessNameFromHtml(html) {
  if (!html) return null;

  const ogSite =
    html.match(/property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  if (ogSite?.[1]) {
    const name = cleanBusinessName(ogSite[1]);
    if (name) return name;
  }

  const jsonLds = extractJsonLd(html);
  for (const jsonLd of jsonLds) {
    const types = Array.isArray(jsonLd['@type']) ? jsonLd['@type'] : [jsonLd['@type']];
    if (
      jsonLd.name &&
      typeof jsonLd.name === 'string' &&
      types.some((t) => /LocalBusiness|Organization|Store|ProfessionalService|Dentist|Medical/i.test(String(t)))
    ) {
      const name = cleanBusinessName(jsonLd.name);
      if (name) return name;
    }
    if (jsonLd.name && typeof jsonLd.name === 'string') {
      const name = cleanBusinessName(jsonLd.name);
      if (name) return name;
    }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const titlePart = titleMatch[1].split(/[|\-–—]/)[0].trim();
    const name = cleanBusinessName(titlePart);
    if (name) return name;
  }

  return null;
}

function isParkingOrPlaceholderPage(html) {
  if (!html || html.length < 200) return true;
  const lower = html.toLowerCase();
  if (PARKING_PAGE_PHRASES.some((phrase) => lower.includes(phrase))) return true;
  const textOnly = lower.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return textOnly.length < 80;
}

/** Verify URL is a live, real business website — not a directory link or parked domain */
async function verifyRealBusinessWebsite(url, timeoutMs = 5000) {
  const normalized = normalizeWebsiteUrl(url);
  if (!normalized) return { valid: false, reason: 'invalid_url' };

  const host = new URL(normalized).hostname.toLowerCase();
  if (!isValidBusinessDomain(host)) return { valid: false, reason: 'invalid_domain' };
  if (isDirectoryOrThirdPartyUrl(normalized)) return { valid: false, reason: 'directory_url' };

  try {
    const crawlResult = await scrapeUrl(normalized, timeoutMs);
    if (!crawlResult.html || crawlResult.html.trim() === '') {
      return { valid: false, reason: 'unreachable' };
    }
    if (isParkingOrPlaceholderPage(crawlResult.html)) {
      return { valid: false, reason: 'parking_or_placeholder' };
    }

    return {
      valid: true,
      website: normalized,
      html: crawlResult.html,
      businessName: extractBusinessNameFromHtml(crawlResult.html),
      email: crawlResult.email,
      phone: crawlResult.phone,
      instagram: crawlResult.instagram,
      facebook: crawlResult.facebook,
      crawlResult,
    };
  } catch {
    return { valid: false, reason: 'fetch_error' };
  }
}

async function validateLeadRecord(lead) {
  if (!lead?.name) return null;

  // Already verified during Google Places / free scraper fetch
  if (lead.website_verified === true && lead.website) {
    return {
      ...lead,
      rating: lead.rating ?? null,
      reviews_count: lead.reviews_count ?? null,
    };
  }

  // Google Places goldmine: real business name, no website yet
  if (!lead.website) {
    return {
      ...lead,
      website: null,
      rating: lead.rating ?? null,
      reviews_count: lead.reviews_count ?? null,
      website_verified: false,
    };
  }

  const verified = await verifyRealBusinessWebsite(lead.website);
  if (!verified.valid) {
    console.log(`❌ Rejected non-real website for "${lead.name}": ${lead.website} (${verified.reason})`);
    return null;
  }

  return {
    ...lead,
    website: verified.website,
    name: verified.businessName || lead.name,
    email: lead.email || verified.email || null,
    phone: lead.phone || verified.phone || null,
    instagram_url: lead.instagram_url || verified.instagram || null,
    facebook_url: lead.facebook_url || verified.facebook || null,
    rating: lead.rating ?? null,
    reviews_count: lead.reviews_count ?? null,
    website_verified: true,
  };
}

async function filterValidLeads(leads) {
  const valid = [];
  const seenDomains = new Set();

  for (const lead of leads || []) {
    const validated = await validateLeadRecord(lead);
    if (!validated) continue;

    const domainKey = validated.website || `no-website:${validated.name?.toLowerCase()}`;
    if (seenDomains.has(domainKey)) continue;
    seenDomains.add(domainKey);
    valid.push(validated);
    if (valid.length >= 15) break;
  }

  return valid;
}

async function scrapeUrl(url, timeoutMs = 8000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Try with multiple user agents for better compatibility
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) return { html: '', email: null, phone: null, whatsapp: null, instagram: null, facebook: null };

    const html = await res.text();
    
    // Extract Email - Multiple strategies for better coverage
    let email = null;
    const emails = new Set();

    // Strategy 1: Standard email regex
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/gi;
    const standardEmails = html.match(emailRegex) || [];
    standardEmails.forEach(e => emails.add(e.toLowerCase()));

    // Strategy 2: Decrypt Cloudflare email protection
    const cfEmailRegex = /data-cfemail="([a-f0-9]+)"/gi;
    const cfMatches = [...html.matchAll(cfEmailRegex)];
    for (const match of cfMatches) {
      const decoded = decodeCfEmail(match[1]);
      if (decoded && decoded.includes('@')) {
        emails.add(decoded.toLowerCase());
      }
    }

    // Strategy 3: Extract emails from mailto links
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/gi;
    const mailtoMatches = html.match(mailtoRegex) || [];
    mailtoMatches.forEach(link => {
      const mailEmail = link.replace(/mailto:/i, '').toLowerCase();
      emails.add(mailEmail);
    });

    // Strategy 4: Extract emails from text patterns like "email: address@domain.com"
    const emailPatternRegex = /(?:e-?mail|contact|write)\s*(?:us|me)?\s*(?:at|:)\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/gi;
    const patternMatches = html.match(emailPatternRegex) || [];
    patternMatches.forEach(match => {
      const extracted = match.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i);
      if (extracted) {
        emails.add(extracted[0].toLowerCase());
      }
    });

    // Strategy 5: Extract from JSON-LD schema (Organization, LocalBusiness)
    const jsonLds = extractJsonLd(html);
    for (const jsonLd of jsonLds) {
      if (jsonLd.email && typeof jsonLd.email === 'string' && jsonLd.email.includes('@')) {
        emails.add(jsonLd.email.toLowerCase());
      }
      if (jsonLd.contactPoint && jsonLd.contactPoint.email) {
        emails.add(jsonLd.contactPoint.email.toLowerCase());
      }
    }

    // Strategy 6: Look for emails in contact forms or data attributes
    const dataAttrRegex = /data-email=["']([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})["']/gi;
    const dataMatches = html.match(dataAttrRegex) || [];
    dataMatches.forEach(attr => {
      const extracted = attr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i);
      if (extracted) emails.add(extracted[0].toLowerCase());
    });

    // Strategy 7: Look for emails in href links that start with email
    const emailLinkRegex = /href=["'][^"']*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})[^"']*["']/gi;
    const emailLinkMatches = html.match(emailLinkRegex) || [];
    emailLinkMatches.forEach(link => {
      const extracted = link.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i);
      if (extracted) emails.add(extracted[0].toLowerCase());
    });

    // Strategy 8: Look in common contact section text
    const contactSectionRegex = /(?:contact|inquiry|business email|reach us at|email us|write us|get in touch|send email)[\s\n\r]*(?:at|:|=)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/gi;
    const contactMatches = html.match(contactSectionRegex) || [];
    contactMatches.forEach(match => {
      const extracted = match.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i);
      if (extracted) emails.add(extracted[0].toLowerCase());
    });

    // Filter out common false positives - be careful not to filter real emails
    const validEmails = Array.from(emails).filter(e => {
      const lower = e.toLowerCase();
      const invalidPatterns = [
        '.png@', '.jpg@', '.jpeg@', '.webp@', '.gif@', '.svg@', 
        'sentry', 'bootstrap', 'example.com', 'test@test', 
        'noreply@', 'no-reply@', 'donotreply@', 'notification@',
        'automated@', 'noreply.', 'unsubscribe@'
      ];
      
      // Check for obviously fake patterns
      for (const pattern of invalidPatterns) {
        if (lower.includes(pattern)) return false;
      }
      
      // Make sure email has a reasonable domain (not too short)
      const [localPart, domain] = lower.split('@');
      if (!domain || domain.length < 4) return false;
      if (!localPart || localPart.length < 2) return false;
      
      return true;
    }).sort((a, b) => {
      // Prioritize common business email prefixes
      const businessPrefixes = ['contact', 'info', 'hello', 'support', 'sales', 'business'];
      const aScore = businessPrefixes.findIndex(p => a.toLowerCase().startsWith(p));
      const bScore = businessPrefixes.findIndex(p => b.toLowerCase().startsWith(p));
      
      if (aScore !== -1 && bScore !== -1) return aScore - bScore;
      if (aScore !== -1) return -1; // a is business email, prioritize
      if (bScore !== -1) return 1;  // b is business email, prioritize
      
      return a.localeCompare(b); // Alphabetical fallback
    });

    // Use first valid email found
    email = validEmails.length > 0 ? validEmails[0] : null;

    // Extract Socials
    const instaRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9_.]+)/i;
    const fbRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com)\/([a-zA-Z0-9_.]+)/i;
    
    const instaMatch = html.match(instaRegex);
    const fbMatch = html.match(fbRegex);

    const instagram = instaMatch ? `https://www.instagram.com/${instaMatch[1].split('/')[0]}` : null;
    const facebook = fbMatch ? `https://www.facebook.com/${fbMatch[1].split('/')[0]}` : null;

    // Extract Phone if present (US/UK common formats: e.g. (123) 456-7890 or +44 20 7946 0958)
    // More aggressive phone extraction patterns
    const phonePatterns = [
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US/Canada
      /\+\d{1,3}[-.\s]?\d{1,14}/g, // International format
      /(?:call|phone|tel|telephone|contact)[\s:]*(\+?[\d\s\-()]{10,20})/gi, // Text pattern
    ];
    
    let phone = null;
    for (const pattern of phonePatterns) {
      const matches = html.match(pattern) || [];
      if (matches.length > 0) {
        // Clean and validate the phone number
        const cleaned = matches[0].trim().replace(/[^\d+\-()]/g, '');
        if (cleaned.length >= 10) {
          phone = matches[0].trim();
          break;
        }
      }
    }

    // Extract WhatsApp click-to-chat links
    const waRegex = /(?:wa\.me|api\.whatsapp\.com\/send\??phone=|web\.whatsapp\.com\/send\??phone=)([^"'&\s>]+)/gi;
    let whatsapp = null;
    const waMatches = html.match(waRegex);
    if (waMatches && waMatches.length > 0) {
      const cleanMatch = waMatches[0].replace(/^(?:wa\.me\/|api\.whatsapp\.com\/send\??phone=|web\.whatsapp\.com\/send\??phone=)/i, '').replace(/[^0-9]/g, '');
      if (cleanMatch.length >= 7 && cleanMatch.length <= 15) {
        whatsapp = '+' + cleanMatch;
      }
    }

    // Fallback WhatsApp: look for text like WhatsApp: +123456789
    if (!whatsapp) {
      const waTextRegex = /(?:whatsapp|wa\.me|wa)\s*(?:is|at|:|-)?\s*(\+?[\d\s\-()]{7,16})/i;
      const waTextMatch = html.match(waTextRegex);
      if (waTextMatch) {
        const cleanNum = waTextMatch[1].replace(/[^0-9+]/g, '');
        if (cleanNum.length >= 7 && cleanNum.length <= 15) {
          whatsapp = cleanNum;
        }
      }
    }

    return { html, email, phone, whatsapp, instagram, facebook };
  } catch (err) {
    // console.error(`Error scraping url ${url}:`, err.message);
    return { html: '', email: null, phone: null, whatsapp: null, instagram: null, facebook: null };
  }
}

// Helper to analyze website design and mobile optimization
export function analyzeWebsiteDesign(html, url) {
  const reasons = [];

  if (!html || html.trim() === '') {
    return {
      needs_optimization: 1,
      reasons: ["Website is currently unreachable, extremely slow, or returning error pages."]
    };
  }

  // 1. SSL/Security check
  if (url.toLowerCase().startsWith('http://')) {
    reasons.push("Insecure connection (HTTP instead of secure HTTPS)");
  }

  const htmlLower = html.toLowerCase();

  // 2. Mobile Responsiveness / Viewport check
  const hasViewport = htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'");
  const isResponsive = hasViewport && (htmlLower.includes('width=device-width') || htmlLower.includes('initial-scale'));
  if (!isResponsive) {
    reasons.push("Lacks mobile responsiveness (missing mobile viewport tag)");
  }

  // 3. Outdated Copyright year in footer
  const copyrightRegex = /(?:©|copyright|copr\.?)\s*(?:20\d{2}\s*[-–—]\s*)?(20\d{2})/i;
  const copyrightMatch = html.match(copyrightRegex);
  if (copyrightMatch) {
    const copyrightYear = parseInt(copyrightMatch[1], 10);
    const currentYear = new Date().getFullYear();
    if (copyrightYear < currentYear - 1) {
      reasons.push(`Outdated copyright year in footer (© ${copyrightYear} - shows lack of recent maintenance)`);
    }
  }

  // 4. Legacy HTML Doctypes
  const hasHtml5Doctype = /<!doctype\s+html>/i.test(html);
  if (html.length > 0 && !hasHtml5Doctype) {
    reasons.push("Uses legacy HTML doctype (e.g. XHTML or HTML4 instead of modern HTML5)");
  }

  // 5. Legacy/Old Javascript libraries
  const usesLegacyJquery = /jquery[-.](1|2)\./i.test(html) || /jquery\/[12]\./i.test(html);
  if (usesLegacyJquery) {
    reasons.push("Uses deprecated legacy jQuery (v1.x or v2.x) with potential vulnerabilities");
  }

  const needs_optimization = reasons.length > 0 ? 1 : 0;

  return {
    needs_optimization,
    reasons
  };
}

// Helper to get mock leads based on niche and location - STUBBED (MOCK DATA REMOVED)
function getMockLeadsForNiches(niche, location) {
  return [];
}

function generateLeadId(name, website) {
  return crypto.createHash('md5').update(name + website).digest('hex').substring(0, 12);
}

// Deep contact scraper that fetches homepage and subpages
export async function scrapeBusinessContacts(websiteUrl) {
  if (!websiteUrl || websiteUrl.trim() === '') {
    return { 
      email: null, 
      phone: null, 
      whatsapp: null,
      instagram: null, 
      facebook: null,
      needs_optimization: 1,
      optimization_reasons: "No business website URL configured"
    };
  }

  // Normalize URL
  let targetUrl = websiteUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  console.log(`🔍 Deep scraping B2B Lead Website: ${targetUrl}`);
  
  // 1. Scrape Homepage first (with 10 second timeout for finding emails)
  const homepageResults = await scrapeUrl(targetUrl, 10000);
  
  let email = homepageResults.email;
  let phone = homepageResults.phone;
  let whatsapp = homepageResults.whatsapp;
  let instagram = homepageResults.instagram;
  let facebook = homepageResults.facebook;

  // 2. If email or socials are missing, find contact page link and scrape it
  if (!email || !instagram || !facebook || !whatsapp) {
    const contactLinksRegex = /href=["']([^"']*(?:contact|about|info|reach|touch|inquire|message)[^"']*)["']/gi;
    const matches = homepageResults.html.matchAll(contactLinksRegex);
    const subpagesToScrape = [];

    for (const match of matches) {
      let link = match[1];
      try {
        if (link.startsWith('/') && !link.startsWith('//')) {
          link = new URL(targetUrl).origin + link;
        } else if (!link.startsWith('http')) {
          link = new URL(targetUrl).origin + '/' + link;
        }
        
        // Limit to scanning max 3 relevant subpages for better email detection
        if (!subpagesToScrape.includes(link) && subpagesToScrape.length < 3) {
          subpagesToScrape.push(link);
        }
      } catch (e) {
        // Skip invalid links
      }
    }

    // Crawl contact subpages in parallel
    if (subpagesToScrape.length > 0) {
      console.log(`📄 Deep crawling ${subpagesToScrape.length} subpage(s) for email/contact details:`, subpagesToScrape);
      const subpageResults = await Promise.all(subpagesToScrape.map(url => scrapeUrl(url, 8000)));
      
      for (const res of subpageResults) {
        if (!email && res.email) email = res.email;
        if (!phone && res.phone) phone = res.phone;
        if (!whatsapp && res.whatsapp) whatsapp = res.whatsapp;
        if (!instagram && res.instagram) instagram = res.instagram;
        if (!facebook && res.facebook) facebook = res.facebook;
      }
    }
  }

  const audit = analyzeWebsiteDesign(homepageResults.html, targetUrl);

  let finalEmail = email;
  if (!finalEmail) {
    console.log(`❌ No real email found on ${targetUrl}.`);
  } else {
    console.log(`✅ Found real email from website: ${finalEmail}`);
  }

  return { 
    email: finalEmail || null,
    phone, 
    whatsapp,
    instagram, 
    facebook,
    needs_optimization: audit.needs_optimization,
    optimization_reasons: audit.reasons.join(' | ')
  };
}

// ----------------------------------------------------
// Google Maps Places API Search (Option A)
// ----------------------------------------------------
async function searchGooglePlaces(niche, location, apiKey) {
  console.log(`Using Official Google Places API to search for ${niche} in ${location}...`);
  const query = `${niche} in ${location}`;
  const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  
  try {
    const res = await fetch(textSearchUrl);
    if (!res.ok) throw new Error(`Google places TextSearch returned status ${res.status}`);
    const data = await res.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google API status: ${data.status} - ${data.error_message || ''}`);
    }

    const results = data.results || [];
    console.log(`Places API found ${results.length} initial results. Fetching details...`);

    const leads = [];

    // Fetch Details for each place to get phone, website, and operational status
    for (const place of results.slice(0, 15)) { // Max 15 leads per search to keep performance fast
      if (place.business_status && place.business_status !== 'OPERATIONAL') {
        continue; // Filter closed businesses
      }

      // Fetch place details
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,website,formatted_phone_number,business_status&key=${apiKey}`;
      try {
        const detailsRes = await fetch(detailsUrl);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          const details = detailsData.result || {};
          
          const rawWebsite = details.website || null;
          let website = rawWebsite ? normalizeWebsiteUrl(rawWebsite) : null;
          if (website && isDirectoryOrThirdPartyUrl(website)) {
            console.log(`Skipping directory/social URL from Google Maps: ${website} for "${details.name}"`);
            website = null;
          }

          let needs_optimization = 0;
          let optimization_reasons = "";
          let verifiedSite = null;

          if (!website) {
            needs_optimization = 1;
            optimization_reasons = "No business website found on Google Maps (Needs a new website designed)";
          } else {
            verifiedSite = await verifyRealBusinessWebsite(website, 4000);
            if (!verifiedSite.valid) {
              console.log(`Skipping invalid/dead website from Google: ${website} for "${details.name}" (${verifiedSite.reason})`);
              website = null;
              needs_optimization = 1;
              optimization_reasons = "Listed on Google Maps but website is unreachable or not a real business site";
            } else {
              website = verifiedSite.website;
              const audit = analyzeWebsiteDesign(verifiedSite.html, website);
              if (audit.needs_optimization === 0) {
                console.log(`Skipping modern website: ${website} for business "${details.name}"`);
                continue;
              }
              needs_optimization = 1;
              optimization_reasons = audit.reasons.join(' | ');
            }
          }

          leads.push({
            id: generateLeadId(details.name, website || place.place_id),
            name: verifiedSite?.businessName || details.name,
            niche,
            location,
            website,
            phone: details.formatted_phone_number || place.formatted_phone_number || null,
            email: null,
            instagram_url: null,
            facebook_url: null,
            rating: details.rating || place.rating || null,
            reviews_count: details.user_ratings_total || place.user_ratings_total || null,
            status: 'active',
            needs_optimization,
            optimization_reasons,
            website_verified: !!website,
          });
        }
      } catch (detailsErr) {
        console.error(`Error fetching details for place ${place.place_id}:`, detailsErr.message);
      }
    }

    return leads;
  } catch (err) {
    console.error('Google Places API search failed, falling back to free scraper:', err.message);
    return await searchFreeScraper(niche, location);
  }
}

// ----------------------------------------------------
// Free Fallback Google Search Scraper (Option B)
// ----------------------------------------------------
async function searchFreeScraper(niche, location) {
  console.log(`Using Free Web Scraper to search for ${niche} in ${location}...`);
  const query = `${niche} ${location} website -site:google.com -site:youtube.com -site:pinterest.com -site:facebook.com -site:linkedin.com -site:yelp.com -site:yellowpages.com`;
  
  let html = '';
  let source = 'Google';
  
  try {
    // 1. Try Google Search first
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30`;
    const res = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (res.ok) {
      html = await res.text();
    }
  } catch (err) {
    console.error('Google search fetch failed, preparing fallback:', err.message);
  }

  // Parse links from Google Search HTML
  let extractedUrls = [];
  if (html) {
    const hrefRegex = /href=["']([^"']*)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      let resolvedUrl = '';
      if (href.startsWith('http')) {
        resolvedUrl = href;
      } else if (href.includes('/url?q=')) {
        try {
          const urlObj = new URL(href.startsWith('http') ? href : 'https://google.com' + href);
          const q = urlObj.searchParams.get('q');
          if (q && q.startsWith('http')) {
            resolvedUrl = q;
          }
        } catch (e) {}
      }
      
      if (resolvedUrl) {
        try {
          const host = new URL(resolvedUrl).hostname.toLowerCase();
          if (
            !host.includes('google.com') && 
            !host.includes('google.co') && 
            !host.includes('gstatic.com') &&
            !host.includes('googleadservices.com')
          ) {
            extractedUrls.push(resolvedUrl);
          }
        } catch (e) {}
      }
    }
  }

  // 2. If Google Search failed or returned no results, fallback to DuckDuckGo HTML Search!
  if (extractedUrls.length === 0) {
    console.log(`Google returned 0 results (possibly blocked or anti-scraping). Falling back to DuckDuckGo HTML search...`);
    source = 'DuckDuckGo';
    try {
      const ddgQuery = `${niche} ${location} website`;
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`;
      const res = await fetch(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const ddgHtml = await res.text();
        const hrefRegex = /href=["']([^"']*)["']/gi;
        let match;
        while ((match = hrefRegex.exec(ddgHtml)) !== null) {
          const href = match[1];
          if (href.includes('uddg=')) {
            try {
              const fullUrl = href.startsWith('http') ? href : 'https:' + href;
              const urlObj = new URL(fullUrl);
              const uddg = urlObj.searchParams.get('uddg');
              if (uddg) {
                const decoded = decodeURIComponent(uddg);
                if (decoded.startsWith('http')) {
                  extractedUrls.push(decoded);
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('DuckDuckGo search fallback failed:', err.message);
    }
  }

  // 3. If DDG also returned 0, try Bing
  if (extractedUrls.length === 0) {
    console.log('DuckDuckGo returned 0. Falling back to Bing search...');
    source = 'Bing';
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(`${niche} ${location} website`)}&count=30`;
      const res = await fetch(bingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      if (res.ok) {
        const bingHtml = await res.text();
        const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        while ((match = hrefRegex.exec(bingHtml)) !== null) {
          const href = match[1];
          try {
            const urlHost = new URL(href).hostname.toLowerCase();
            if (
              !urlHost.includes('bing.com') && !urlHost.includes('microsoft.com') &&
              !urlHost.includes('msn.com') && !urlHost.includes('live.com') &&
              !urlHost.includes('google.com') && !urlHost.includes('youtube.com') &&
              !urlHost.includes('wikipedia.org')
            ) {
              extractedUrls.push(href);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Bing search fallback failed:', err.message);
    }
  }

  // 4. If all search engines failed, try Yellow Pages directory
  if (extractedUrls.length === 0) {
    console.log('All search engines returned 0. Trying Yellow Pages directory...');
    source = 'YellowPages';
    try {
      const ypUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(niche)}&geo_location_terms=${encodeURIComponent(location)}`;
      const res = await fetch(ypUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      if (res.ok) {
        const ypHtml = await res.text();
        const websiteRegex = /href=["'](https?:\/\/(?!www\.yellowpages)[^"']+)["']/gi;
        let match;
        while ((match = websiteRegex.exec(ypHtml)) !== null) {
          const href = match[1];
          try {
            const urlHost = new URL(href).hostname.toLowerCase();
            if (
              !urlHost.includes('yellowpages.com') && !urlHost.includes('ypcdn.com') &&
              !urlHost.includes('yp.com') && !urlHost.includes('google.com') &&
              !urlHost.includes('facebook.com') && !urlHost.includes('twitter.com') &&
              !urlHost.includes('youtube.com') && !urlHost.includes('bing.com')
            ) {
              extractedUrls.push(href);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Yellow Pages scraping failed:', err.message);
    }
  }

  console.log(`Extracted ${extractedUrls.length} total potential links from ${source}. Filtering & auditing...`);

  const domainList = new Set();
  const leads = [];

  for (const fullUrl of extractedUrls) {
    try {
      const urlObj = new URL(fullUrl);
      const host = urlObj.hostname.toLowerCase();
      
      if (!isValidBusinessDomain(host) || isDirectoryOrThirdPartyUrl(fullUrl)) {
        continue;
      }

      const domain = normalizeWebsiteUrl(fullUrl);
      if (!domain || domainList.has(domain) || domainList.size >= 15) {
        continue;
      }

      const verified = await verifyRealBusinessWebsite(domain, 4000);
      if (!verified.valid) {
        console.log(`Skipping non-real website from search: ${domain} (${verified.reason})`);
        continue;
      }

      domainList.add(verified.website);

      const businessName = verified.businessName || cleanBusinessName(host.replace(/^www\./, '').split('.')[0]);
      if (!businessName) continue;

      const audit = analyzeWebsiteDesign(verified.html, verified.website);
      const needs_optimization = audit.needs_optimization === 0 ? 0 : 1;
      const optimization_reasons =
        audit.needs_optimization === 0
          ? 'Website has modern design and mobile viewport settings'
          : audit.reasons.join(' | ');

      leads.push({
        id: generateLeadId(businessName, verified.website),
        name: businessName,
        niche,
        location,
        website: verified.website,
        phone: verified.phone || null,
        email: verified.email || null,
        instagram_url: verified.instagram || null,
        facebook_url: verified.facebook || null,
        rating: null,
        reviews_count: null,
        status: 'active',
        needs_optimization,
        optimization_reasons,
        website_verified: true,
      });
    } catch (e) {
      // Skip invalid URL
    }
  }

  console.log(`Free Scraper extracted ${leads.length} active B2B business domains matching audit criteria from ${source}!`);
  
  // NO FALLBACK - Return only real businesses with actual websites
  return leads;
}

// ----------------------------------------------------
// Multi-Source Scraper (Yelp, Clutch, Indeed, Google/DDG)
// ----------------------------------------------------
async function searchMultiSourceScraper(niche, location, query, source) {
  console.log(`MultiSource Scraper executing: Source="${source}", Query="${query}"`);
  
  let html = '';
  let searchSourceUsed = 'Google';
  
  try {
    // 1. Try Google Search first
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30`;
    const res = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (res.ok) {
      html = await res.text();
    }
  } catch (err) {
    console.error('Google search fetch failed in multi-source scraper:', err.message);
  }

  let extractedUrls = [];
  
  // Parse links from Google Search HTML
  if (html) {
    const hrefRegex = /href=["']([^"']*)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith('http')) {
        extractedUrls.push(href);
      } else if (href.includes('/url?q=')) {
        try {
          const urlObj = new URL(href.startsWith('http') ? href : 'https://google.com' + href);
          const q = urlObj.searchParams.get('q');
          if (q && q.startsWith('http')) {
            extractedUrls.push(q);
          }
        } catch (e) {}
      }
    }
  }

  // 2. If Google Search failed or returned no results, fallback to DuckDuckGo HTML Search
  if (extractedUrls.length === 0) {
    console.log(`Google returned 0 results for directory search. Falling back to DuckDuckGo...`);
    searchSourceUsed = 'DuckDuckGo';
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const ddgHtml = await res.text();
        const hrefRegex = /href=["']([^"']*)["']/gi;
        let match;
        while ((match = hrefRegex.exec(ddgHtml)) !== null) {
          const href = match[1];
          if (href.includes('uddg=')) {
            try {
              const fullUrl = href.startsWith('http') ? href : 'https:' + href;
              const urlObj = new URL(fullUrl);
              const uddg = urlObj.searchParams.get('uddg');
              if (uddg) {
                const decoded = decodeURIComponent(uddg);
                if (decoded.startsWith('http')) {
                  extractedUrls.push(decoded);
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(`DuckDuckGo multi-source search fallback failed:`, err.message);
    }
  }

  // 3. If DDG also returned 0, try Bing search
  if (extractedUrls.length === 0) {
    console.log(`DuckDuckGo returned 0 results. Falling back to Bing search...`);
    searchSourceUsed = 'Bing';
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=30`;
      const res = await fetch(bingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
        }
      });
      if (res.ok) {
        const bingHtml = await res.text();
        const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        while ((match = hrefRegex.exec(bingHtml)) !== null) {
          const href = match[1];
          try {
            const urlHost = new URL(href).hostname.toLowerCase();
            if (
              !urlHost.includes('bing.com') &&
              !urlHost.includes('microsoft.com') &&
              !urlHost.includes('msn.com') &&
              !urlHost.includes('live.com') &&
              !urlHost.includes('google.com') &&
              !urlHost.includes('youtube.com') &&
              !urlHost.includes('wikipedia.org')
            ) {
              extractedUrls.push(href);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Bing search fallback failed:', err.message);
    }
  }

  // 4. If all search engines failed, try Yellow Pages directory directly
  if (extractedUrls.length === 0 && source !== 'yelp' && source !== 'clutch' && source !== 'indeed') {
    console.log('All search engines returned 0 results. Trying Yellow Pages directory...');
    searchSourceUsed = 'YellowPages';
    try {
      const ypUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(niche)}&geo_location_terms=${encodeURIComponent(location)}`;
      const res = await fetch(ypUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      if (res.ok) {
        const ypHtml = await res.text();
        // Extract website links from Yellow Pages listings
        const websiteRegex = /href=["'](https?:\/\/(?!www\.yellowpages)[^"']+)["']/gi;
        let match;
        while ((match = websiteRegex.exec(ypHtml)) !== null) {
          const href = match[1];
          try {
            const urlHost = new URL(href).hostname.toLowerCase();
            if (
              !urlHost.includes('yellowpages.com') &&
              !urlHost.includes('ypcdn.com') &&
              !urlHost.includes('yp.com') &&
              !urlHost.includes('google.com') &&
              !urlHost.includes('facebook.com') &&
              !urlHost.includes('twitter.com') &&
              !urlHost.includes('youtube.com') &&
              !urlHost.includes('bing.com')
            ) {
              extractedUrls.push(href);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Yellow Pages directory scraping failed:', err.message);
    }
  }

  console.log(`MultiSource Scraper extracted ${extractedUrls.length} initial directory links from ${searchSourceUsed}.`);
  
  const domainList = new Set();
  const leads = [];

  for (const rawUrl of extractedUrls) {
    try {
      let finalWebsite = '';
      let businessName = '';
      let leadPhone = null;
      
      // Smart parsing based on the source
      if (source === 'yelp') {
        if (!rawUrl.includes('yelp.com/biz/')) continue;
        
        let slug = rawUrl.split('/biz/')[1]?.split('?')[0] || '';
        if (!slug) continue;
        
        businessName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let phone = null;
        let yelpWebsite = '';

        // Crawl Yelp page to find website redir & phone
        try {
          const yelpPage = await scrapeUrl(rawUrl, 4000);
          
          const jsonLds = extractJsonLd(yelpPage.html);
          for (const js of jsonLds) {
            const items = Array.isArray(js) ? js : [js];
            for (const item of items) {
              if (item['@type'] === 'LocalBusiness' || item['@type'] === 'Restaurant' || item['telephone']) {
                if (item.telephone) phone = item.telephone;
                if (item.url && !item.url.includes('yelp.com')) yelpWebsite = item.url;
                if (item.name) businessName = item.name;
              }
            }
          }

          if (!yelpWebsite) {
            const bizRedirRegex = /biz_redir\?url=([^"&']*)/i;
            const redirMatch = yelpPage.html.match(bizRedirRegex);
            if (redirMatch) {
              yelpWebsite = decodeURIComponent(redirMatch[1]);
            }
          }

          if (!phone) {
            const phoneMatch = yelpPage.html.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
            if (phoneMatch) phone = phoneMatch[0];
          }

          finalWebsite = yelpWebsite;
        } catch (e) {}

        if (!finalWebsite) {
          continue; // Skip the Yelp lead if we cannot find a real website
        }

        leadPhone = phone;
      } 
      else if (source === 'clutch') {
        if (!rawUrl.includes('clutch.co/profile/')) continue;
        
        let slug = rawUrl.split('/profile/')[1]?.split('?')[0] || '';
        if (!slug) continue;
        
        businessName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let phone = null;
        let clutchWebsite = '';

        // Crawl Clutch profile to find website link & phone
        try {
          const clutchPage = await scrapeUrl(rawUrl, 4000);
          
          const jsonLds = extractJsonLd(clutchPage.html);
          for (const js of jsonLds) {
            const items = Array.isArray(js) ? js : [js];
            for (const item of items) {
              if (item.telephone) phone = item.telephone;
              if (item.url && !item.url.includes('clutch.co')) clutchWebsite = item.url;
              if (item.name) businessName = item.name;
            }
          }

          if (!clutchWebsite) {
            const websiteMatch = clutchPage.html.match(/href=["'](https?:\/\/(?!clutch\.co)[^"']+)["']/i);
            if (websiteMatch) clutchWebsite = websiteMatch[1];
          }

          if (!phone) {
            const phoneMatch = clutchPage.html.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
            if (phoneMatch) phone = phoneMatch[0];
          }

          finalWebsite = clutchWebsite;
        } catch (e) {}

        if (!finalWebsite) {
          continue; // Skip the Clutch lead if we cannot find a real website
        }

        leadPhone = phone;
      }
      else if (source === 'indeed') {
        if (!rawUrl.includes('indeed.com/')) continue;
        
        try {
          const indeedPage = await scrapeUrl(rawUrl, 3000);
          const titleMatch = indeedPage.html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            const parts = titleMatch[1].split('-');
            businessName = parts[1]?.trim() || parts[0]?.trim() || 'Indeed Hiring Partner';
          } else {
            businessName = 'Indeed Active Hirer';
          }
          
          let indeedWebsite = '';
          const websiteMatch = indeedPage.html.match(/href=["'](https?:\/\/(?!indeed\.com)[^"']+)["']/i);
          if (websiteMatch) {
            indeedWebsite = websiteMatch[1];
          }
          if (!indeedWebsite) {
            continue; // Skip the Indeed lead if no website is found on the hiring page
          }
          finalWebsite = indeedWebsite;
        } catch (e) {
          continue; // Skip lead if error occurs
        }
      }
      else {
        // Direct website
        const urlObj = new URL(rawUrl);
        const host = urlObj.hostname.toLowerCase();
        if (
          host.includes('google') || host.includes('youtube') || host.includes('linkedin') ||
          host.includes('twitter') || host.includes('pinterest') || host.includes('instagram') ||
          host.includes('facebook') || host.includes('yelp') || host.includes('yellowpages') ||
          host.includes('duckduckgo')
        ) {
          continue;
        }
        finalWebsite = normalizeWebsiteUrl(rawUrl);
        if (!finalWebsite || !isValidBusinessDomain(new URL(finalWebsite).hostname)) {
          continue;
        }
        businessName = null; // resolved from verified site HTML
      }

      if (!finalWebsite || isDirectoryOrThirdPartyUrl(finalWebsite)) continue;

      const domain = normalizeWebsiteUrl(finalWebsite);
      if (!domain || domainList.has(domain) || domainList.size >= 15) continue;

      const verified = await verifyRealBusinessWebsite(domain, 4000);
      if (!verified.valid) {
        console.log(`Skipping non-real website in multi-source: ${domain} (${verified.reason})`);
        continue;
      }

      domainList.add(verified.website);
      const resolvedName = verified.businessName || businessName;
      if (!resolvedName) continue;

      const audit = analyzeWebsiteDesign(verified.html, verified.website);
      const needs_optimization = audit.needs_optimization === 0 ? 0 : 1;
      const optimization_reasons =
        audit.needs_optimization === 0
          ? 'Website has modern design and mobile viewport settings'
          : audit.reasons.join(' | ');

      leads.push({
        id: generateLeadId(resolvedName, verified.website),
        name: resolvedName,
        niche,
        location,
        website: verified.website,
        phone: leadPhone || verified.phone || null,
        email: verified.email || null,
        instagram_url: verified.instagram || null,
        facebook_url: verified.facebook || null,
        rating: null,
        reviews_count: null,
        status: 'active',
        needs_optimization,
        optimization_reasons,
        website_verified: true,
      });
    } catch (e) {
      // Ignore errors on specific rawUrl iterations
    }
  }

  console.log(`MultiSource Scraper successfully loaded ${leads.length} validated leads from "${source}"!`);
  
  return leads;
}

// ============================================
// MULTI-SOURCE SCRAPERS FOR REAL LEADS
// ============================================

// 1. YELLOW PAGES SCRAPER - STUBBED (MOCK DATA REMOVED)
async function scrapeYellowPages(niche, location) {
  try {
    console.log(`📰 Scraping Yellow Pages for real ${niche} in ${location}...`);
    const query = `${niche}`.replace(/\s+/g, '+');
    const locQuery = location.replace(/\s+/g, '+').split(',')[0]; // city only
    const url = `https://www.yellowpages.com/search?search_terms=${query}&geo_location_terms=${locQuery}`;
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 8000
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const leads = [];
    
    // Match business result blocks - Yellow Pages structure
    const resultPattern = /<a[^>]*href="([^"]*\/biz\/[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const ratingPattern = /<div[^>]*class="[^"]*rating[^"]*"[^>]*>[\s\S]*?(\d+\.?\d*)\s+(?:stars?|out)/gi;
    
    let matchResult;
    let count = 0;
    
    while ((matchResult = resultPattern.exec(html)) !== null && count < 10) {
      const businessUrl = matchResult[1];
      const businessName = matchResult[2]?.trim().replace(/<[^>]*>/g, '');
      
      if (!businessName || businessName.length < 3) continue;
      
      // Extract rating for this business (simple approach - look for nearby rating)
      let rating = 0;
      const urlStart = html.indexOf(matchResult[0]);
      const contextHtml = html.substring(Math.max(0, urlStart - 500), Math.min(html.length, urlStart + 500));
      const ratingMatch = contextHtml.match(/(\d+\.?\d*)\s+(?:out\s+of\s+5|stars?)/i);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      
      leads.push({
        id: crypto.randomBytes(8).toString('hex'),
        name: businessName,
        niche,
        location,
        website: `https://www.yellowpages.com${businessUrl}`, // YP link as reference
        phone: null, // Would need detail page scrape
        email: null,
        instagram_url: null,
        facebook_url: null,
        rating: rating > 0 ? rating : null,
        reviews_count: null,
        status: 'active'
      });
      count++;
    }
    
    console.log(`📰 Yellow Pages: Found ${leads.length} REAL rated businesses`);
    return leads;
  } catch (err) {
    console.error('Yellow Pages scrape error:', err.message);
    return [];
  }
}

async function scrapeTrustpilot(niche, location) {
  try {
    console.log(`⭐ Scraping Trustpilot for verified ${niche} in ${location}...`);
    const query = `${niche} ${location}`.replace(/\s+/g, '+');
    const url = `https://www.trustpilot.com/search?query=${query}`;
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 8000
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const leads = [];
    
    // Match Trustpilot business cards with ratings
    const cardPattern = /<a[^>]*href="\/review\/([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/gi;
    const ratingPattern = /(\d+\.?\d*)\s+out of 5|Rating:\s*(\d+\.?\d*)/gi;
    
    let matchCard;
    let count = 0;
    const seen = new Set();
    
    while ((matchCard = cardPattern.exec(html)) !== null && count < 10) {
      const businessId = matchCard[1];
      const businessName = matchCard[2]?.trim();
      
      if (!businessName || seen.has(businessId)) continue;
      seen.add(businessId);
      
      // Find rating info near this business entry
      const cardStart = html.indexOf(matchCard[0]);
      const cardEnd = Math.min(html.length, cardStart + 800);
      const cardHtml = html.substring(cardStart, cardEnd);
      
      let rating = null;
      const ratingMatch = cardHtml.match(/(\d+\.?\d*)\s*(?:out of 5|\/5)/i);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      
      leads.push({
        id: crypto.randomBytes(8).toString('hex'),
        name: businessName,
        niche,
        location,
        website: `https://www.trustpilot.com/review/${businessId}`,
        phone: null,
        email: null,
        instagram_url: null,
        facebook_url: null,
        rating: rating,
        reviews_count: null,
        status: 'active'
      });
      count++;
    }
    
    console.log(`⭐ Trustpilot: Found ${leads.length} verified & rated businesses`);
    return leads;
  } catch (err) {
    console.error('Trustpilot scrape error:', err.message);
    return [];
  }
}

// 3. BUSINESS.COM - Real Business Directory with Ratings
async function scrapeClutch(niche, location) {
  try {
    console.log(`🏢 Scraping Business.com for verified ${niche} in ${location}...`);
    const query = niche.replace(/\s+/g, '+');
    const city = location.split(',')[0]?.trim().replace(/\s+/g, '+') || 'New+York';
    const state = location.split(',')[1]?.trim().substring(0, 2).toUpperCase() || 'NY';
    
    const url = `https://www.business.com/search/?q=${query}&l=${city}%2C+${state}`;
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 8000
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const leads = [];
    
    // Parse business listings with ratings from Business.com
    const listingPattern = /<h3[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
    const ratingPattern = /(\d+\.?\d*)\s*(?:out of 5|\/5|stars?)/gi;
    
    let matchListing;
    let count = 0;
    
    while ((matchListing = listingPattern.exec(html)) !== null && count < 10) {
      const businessUrl = matchListing[1];
      const businessName = matchListing[2]?.trim();
      
      if (!businessName || businessName.length < 3) continue;
      
      // Try to find rating near this listing
      const listStart = html.indexOf(matchListing[0]);
      const contextStart = Math.max(0, listStart - 300);
      const contextEnd = Math.min(html.length, listStart + 800);
      const context = html.substring(contextStart, contextEnd);
      
      let rating = null;
      const ratingMatch = context.match(/(\d+\.?\d*)\s*(?:out of 5|\/5)/i);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      
      leads.push({
        id: crypto.randomBytes(8).toString('hex'),
        name: businessName,
        niche,
        location,
        website: businessUrl.startsWith('http') ? businessUrl : `https://www.business.com${businessUrl}`,
        phone: null,
        email: null,
        instagram_url: null,
        facebook_url: null,
        rating: rating,
        reviews_count: null,
        status: 'active'
      });
      count++;
    }
    
    console.log(`🏢 Business.com: Found ${leads.length} verified businesses with ratings`);
    return leads;
  } catch (err) {
    console.error('Business.com scrape error:', err.message);
    return [];
  }
}

// 4. BBB - Better Business Bureau (Highly Trusted)
async function scrapeBark(niche, location) {
  try {
    console.log(`🔔 Scraping BBB for accredited ${niche} in ${location}...`);
    const query = niche.replace(/\s+/g, '+');
    const city = location.split(',')[0]?.trim().replace(/\s+/g, '+') || 'City';
    const state = location.split(',')[1]?.trim().substring(0, 2).toLowerCase() || 'ny';
    
    const url = `https://www.bbb.org/search?find=${query}&where=${city}%2C+${state}&type=b`;
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const leads = [];
    
    // Match BBB business result cards
    const resultPattern = /<a[^>]*href="(\/us\/[^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(?:<span[^>]*class="[^"]*rating[^"]*"[^>]*>([^<]+)<\/span>)?/gi;
    
    let matchResult;
    let count = 0;
    const seen = new Set();
    
    while ((matchResult = resultPattern.exec(html)) !== null && count < 10) {
      const businessUrl = matchResult[1];
      const businessName = matchResult[2]?.trim();
      const ratingText = matchResult[3];
      
      if (!businessName || seen.has(businessName)) continue;
      seen.add(businessName);
      
      // Parse BBB rating (usually something like "A+" or "4.5/5")
      let rating = null;
      if (ratingText) {
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      }
      
      leads.push({
        id: crypto.randomBytes(8).toString('hex'),
        name: businessName,
        niche,
        location,
        website: `https://www.bbb.org${businessUrl}`,
        phone: null,
        email: null,
        instagram_url: null,
        facebook_url: null,
        rating: rating,
        reviews_count: null,
        status: 'active'
      });
      count++;
    }
    
    console.log(`🔔 BBB: Found ${leads.length} accredited rated businesses`);
    return leads;
  } catch (err) {
    console.error('BBB scrape error:', err.message);
    return [];
  }
}

// 5. YELP BUSINESS LISTINGS - Popular Review Platform
async function scrapeTwitterHashtags(niche, location) {
  try {
    console.log(`🌟 Scraping Yelp for top-rated ${niche} in ${location}...`);
    const query = niche.replace(/\s+/g, '+');
    const city = location.split(',')[0]?.trim().replace(/\s+/g, '+') || 'New+York';
    
    const url = `https://www.yelp.com/search?find=${query}&loc=${city}`;
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const leads = [];
    
    // Match Yelp business result cards with ratings
    const resultPattern = /<a[^>]*href="(\/biz\/[^"]+)"[^>]*class="[^"]*Link[^"]*"[^>]*>([^<]+)<\/a>/gi;
    const ratingPattern = /(\d+\.?\d*)\s+(?:stars?|out of 5)/gi;
    
    let matchResult;
    let count = 0;
    const seen = new Set();
    
    while ((matchResult = resultPattern.exec(html)) !== null && count < 10) {
      const businessUrl = matchResult[1];
      const businessName = matchResult[2]?.trim().replace(/<[^>]*>/g, '');
      
      if (!businessName || businessName.length < 3 || seen.has(businessName)) continue;
      seen.add(businessName);
      
      // Find rating near this business
      const resultStart = html.indexOf(matchResult[0]);
      const contextStart = Math.max(0, resultStart - 200);
      const contextEnd = Math.min(html.length, resultStart + 600);
      const context = html.substring(contextStart, contextEnd);
      
      let rating = null;
      const ratingMatch = context.match(/(\d+\.?\d*)\s+(?:star|out of 5)/i);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      
      leads.push({
        id: crypto.randomBytes(8).toString('hex'),
        name: businessName,
        niche,
        location,
        website: `https://www.yelp.com${businessUrl}`,
        phone: null,
        email: null,
        instagram_url: null,
        facebook_url: null,
        rating: rating ?? null,
        reviews_count: null,
        status: 'active'
      });
      count++;
    }
    
    console.log(`🌟 Yelp: Found ${leads.length} top-rated businesses`);
    return leads;
  } catch (err) {
    console.error('Yelp scrape error:', err.message);
    return [];
  }
}

// ============================================
// AGGREGATE ALL SOURCES - Simplified for Vercel
// ============================================
async function searchAllSources(niche, location) {
  console.log(`\n🔍 Using Free Web Scraper (multi-source)...\n`);
  
  // Simply use the free scraper which already works
  // This avoids timeout and fetch issues on Vercel
  try {
    const leads = await searchFreeScraper(niche, location);
    console.log(`✅ Free Web Scraper: Found ${leads.length} real B2B leads with emails`);
    return leads;
  } catch (err) {
    console.log(`⚠️ Free scraper error:`, err.message);
    return [];
  }
}

// ----------------------------------------------------
// Main Finder Entrypoint
// ----------------------------------------------------
export async function searchLocalLeads(niche, location, apiKey = null, source = 'google') {
  if (!niche || !location) {
    throw new Error('Niche and Location are required to find B2B local leads.');
  }

  const cleanNiche = niche.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim();
  const cleanLocation = location.split('(')[0].replace(/\b(?:us|usa|united states)\b/gi, '').replace(/\s+/g, ' ').trim();
  const cleanSource = (source || 'google').toLowerCase();

  console.log(`\n🔥 B2B LEAD SEARCH STARTED: Niche="${cleanNiche}", Location="${cleanLocation}", Source="${cleanSource}"\n`);

  const envGoogleKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY || null;
  const effectiveApiKey =
    apiKey && apiKey.trim() && apiKey !== '••••••••' ? apiKey.trim() : envGoogleKey;

  // 1) Google Places API — real businesses with websites (best quality)
  if (effectiveApiKey && (cleanSource === 'google' || cleanSource === 'multi')) {
    try {
      const googleLeads = await searchGooglePlaces(cleanNiche, cleanLocation, effectiveApiKey);
      if (googleLeads?.length > 0) {
        const validated = await filterValidLeads(googleLeads);
        console.log(`✅ Google Places: ${validated.length} verified real businesses`);
        if (validated.length > 0) return validated;
      }
    } catch (err) {
      console.log(`⚠️ Google Places failed:`, err.message);
    }
  }

  // 2) Free web scraper (DuckDuckGo / HTML) — no API key needed
  if (cleanSource === 'google' || cleanSource === 'multi') {
    try {
      const freeLeads = await searchFreeScraper(cleanNiche, cleanLocation);
      if (freeLeads?.length > 0) {
        const validated = await filterValidLeads(freeLeads);
        console.log(`✅ Free scraper: ${validated.length} verified businesses`);
        if (validated.length > 0) return validated;
      }
    } catch (err) {
      console.log(`⚠️ Free scraper failed:`, err.message);
    }
  }

  // 3) Yellow Pages, Trustpilot, Clutch, etc.
  if (cleanSource === 'google' || cleanSource === 'multi') {
    console.log(`📡 Trying multi-source scrapers...`);
    try {
      const realLeads = await searchAllSources(cleanNiche, cleanLocation);
      if (realLeads?.length > 0) {
        const validated = await filterValidLeads(realLeads);
        console.log(`✅ Multi-source: ${validated.length} verified leads`);
        if (validated.length > 0) return validated;
      }
    } catch (err) {
      console.log(`⚠️ Multi-source failed:`, err.message);
    }
  }



  console.log(`❌ No leads found from any source`);
  return [];
}
