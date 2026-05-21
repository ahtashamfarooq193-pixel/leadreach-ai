import crypto from 'crypto';

function generateLeadId(name, website) {
  const seed = website || name;
  return crypto.createHash('md5').update(seed).digest('hex');
}

function isValidBusinessDomain(urlStr) {
  try {
    const urlObj = new URL(urlStr);
    const host = urlObj.hostname.toLowerCase();
    
    const blacklist = [
      'google', 'youtube', 'linkedin', 'twitter', 'x.com', 'pinterest', 
      'instagram', 'facebook', 'yelp', 'yellowpages', 'tripadvisor', 
      'mapquest', 'wix', 'wordpress', 'duckduckgo', 'bing', 'yahoo', 
      'microsoft', 'msn', 'live', 'wikipedia', 'schema.org', 'w3.org'
    ];
    
    return !blacklist.some(blocked => host.includes(blocked));
  } catch (e) {
    return false;
  }
}

async function scrapeUrl(url, timeoutMs = 6000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { html: '' };
    return { html: await res.text() };
  } catch (err) {
    return { html: '' };
  }
}

async function searchMultiSourceScraper(niche, location, query, source) {
  console.log(`Test Corrected Scraper executing: Source="${source}", Query="${query}"`);
  
  let html = '';
  let searchSourceUsed = 'Google';
  
  try {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30`;
    const res = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) html = await res.text();
  } catch (err) {
    console.error('Google search failed:', err.message);
  }

  let extractedUrls = [];
  
  if (html) {
    const hrefRegex = /href=["']([^"']*)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith('http')) {
        if (isValidBusinessDomain(href)) {
          extractedUrls.push(href);
        }
      } else if (href.includes('/url?q=')) {
        try {
          const urlObj = new URL(href.startsWith('http') ? href : 'https://google.com' + href);
          const q = urlObj.searchParams.get('q');
          if (q && q.startsWith('http') && isValidBusinessDomain(q)) {
            extractedUrls.push(q);
          }
        } catch (e) {}
      }
    }
  }

  if (extractedUrls.length === 0) {
    console.log(`Google returned 0 valid business domains. Falling back to DuckDuckGo...`);
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
                if (decoded.startsWith('http') && isValidBusinessDomain(decoded)) {
                  extractedUrls.push(decoded);
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error(`DuckDuckGo fallback failed:`, err.message);
    }
  }

  if (extractedUrls.length === 0) {
    console.log(`DuckDuckGo returned 0 valid business domains. Falling back to Bing...`);
    searchSourceUsed = 'Bing';
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=30`;
      const res = await fetch(bingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const bingHtml = await res.text();
        const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
        let match;
        while ((match = hrefRegex.exec(bingHtml)) !== null) {
          const href = match[1];
          if (isValidBusinessDomain(href)) {
            extractedUrls.push(href);
          }
        }
      }
    } catch (err) {
      console.error('Bing fallback failed:', err.message);
    }
  }

  console.log(`Extracted ${extractedUrls.length} valid business domains from ${searchSourceUsed}.`);
  console.log(extractedUrls.slice(0, 10));
}

async function run() {
  const niche = 'Dentist';
  const location = 'Los Angeles County, CA';
  // Relaxed query without strict double quotes for much wider results
  const query = `${niche} ${location} website -site:google.com -site:youtube.com -site:pinterest.com`;
  await searchMultiSourceScraper(niche, location, query, 'google');
}

run();
