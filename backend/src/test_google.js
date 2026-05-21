async function test() {
  const query = `Plumber Cook County, IL website`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await res.text();
    const hrefRegex = /href=["']([^"']*)["']/gi;
    let match;
    const extractedUrls = [];

    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (href.includes('uddg=')) {
        try {
          const fullUrl = href.startsWith('http') ? href : 'https:' + href;
          const urlObj = new URL(fullUrl);
          const uddg = urlObj.searchParams.get('uddg');
          if (uddg) {
            const decoded = decodeURIComponent(uddg);
            if (!decoded.includes('duckduckgo.com') && !extractedUrls.includes(decoded)) {
              extractedUrls.push(decoded);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }

    console.log('Extracted URLs from simple DDG query:');
    console.log(extractedUrls);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
