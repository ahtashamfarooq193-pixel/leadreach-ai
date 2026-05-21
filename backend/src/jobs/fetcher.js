import Parser from 'rss-parser';
import crypto from 'crypto';
import { Job, Settings } from '../models/index.js';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// Helper to generate unique ID from URL
function generateJobId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

function extractCompanyFromLink(title, link) {
  try {
    const urlObj = new URL(link);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\/remote-jobs\/remote-(.+)-(\d+)/);
    if (!match) return 'RemoteOK Web3 Partner';

    const slugCombined = match[1];
    const id = match[2];

    const titleSlug = slugify(title);

    let companySlug = slugCombined;
    if (slugCombined.startsWith(titleSlug)) {
      companySlug = slugCombined.substring(titleSlug.length).replace(/^-+/, '');
    }

    return companySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (e) {
    return 'RemoteOK Web3 Partner';
  }
}

// Check if job matches user skills
function matchesKeywords(title, description, keywordsList) {
  if (!keywordsList) return false;
  const keywords = keywordsList.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
  const text = `${title} ${description}`.toLowerCase();
  
  return keywords.some(keyword => {
    if (keyword.length <= 3) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    }
    return text.includes(keyword);
  });
}

// Check if job was posted within active limit (default: 48 hours)
function isFresh(postedDateStr, hoursCap = 48) {
  try {
    const postedDate = new Date(postedDateStr);
    const now = new Date();
    const diffMs = now - postedDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= hoursCap;
  } catch (err) {
    return false;
  }
}

export async function fetchJobs(user) {
  console.log(`Starting job fetching process for user: ${user.email}...`);
  const settings = await Settings.findOne({ userId: user._id });
  if (!settings) {
    console.error(`Settings not configured for user ${user.email}. Cannot filter jobs.`);
    return { success: false, error: 'Settings not found' };
  }

  const targetKeywords = settings.target_keywords || user.targetKeywords || 'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter';
  console.log(`Target Niche Keywords: ${targetKeywords}`);

  const fetchedJobsList = [];
  let stats = { totalFetched: 0, matched: 0, duplicatesSkipped: 0 };

  // 1. Fetch from WeWorkRemotely RSS Feed
  try {
    console.log('Fetching WeWorkRemotely RSS Feed...');
    const feed = await parser.parseURL('https://weworkremotely.com/remote-jobs.rss');
    stats.totalFetched += feed.items.length;

    for (const item of feed.items) {
      const id = generateJobId(item.link);
      
      // Check if already exists for this specific user
      const existing = await Job.findOne({ id, userId: user._id });
      if (existing) {
        stats.duplicatesSkipped++;
        continue;
      }

      if (!isFresh(item.pubDate, 48)) {
        continue;
      }

      let title = item.title || '';
      let company = 'WeWorkRemotely Client';
      if (title.includes(':')) {
        const parts = title.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      } else if (item.creator) {
        company = item.creator;
      }
      
      const description = item.content || item.contentSnippet || '';
      const url = item.link;

      if (matchesKeywords(title, description, targetKeywords)) {
        fetchedJobsList.push({
          id,
          userId: user._id,
          title,
          company,
          url,
          description,
          platform: 'WeWorkRemotely',
          posted_at: new Date(item.pubDate)
        });
        stats.matched++;
      }
    }
  } catch (err) {
    console.error('Error fetching WeWorkRemotely:', err.message);
  }

  // 2. Fetch from RemoteOK API
  try {
    console.log('Fetching RemoteOK API jobs...');
    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const jobs = data.slice(1);
      stats.totalFetched += jobs.length;

      for (const job of jobs) {
        if (!job.url) continue;
        const id = generateJobId(job.url);

        const existing = await Job.findOne({ id, userId: user._id });
        if (existing) {
          stats.duplicatesSkipped++;
          continue;
        }

        if (!isFresh(job.date, 48)) {
          continue;
        }

        const title = job.position;
        const company = job.company || 'RemoteOK Client';
        const description = job.description || '';
        const url = job.url;

        if (matchesKeywords(title, description, targetKeywords)) {
          fetchedJobsList.push({
            id,
            userId: user._id,
            title,
            company,
            url,
            description,
            platform: 'RemoteOK',
            posted_at: new Date(job.date)
          });
          stats.matched++;
        }
      }
    } else {
      console.warn(`RemoteOK API returned status ${response.status}`);
    }
  } catch (err) {
    console.error('Error fetching RemoteOK:', err.message);
  }

  // 3. Fetch from Remotive API
  try {
    console.log('Fetching Remotive API jobs...');
    const response = await fetch('https://remotive.com/api/remote-jobs?category=software-dev', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const jobs = data.jobs || [];
      stats.totalFetched += jobs.length;

      for (const job of jobs) {
        if (!job.url) continue;
        const id = generateJobId(job.url);

        const existing = await Job.findOne({ id, userId: user._id });
        if (existing) {
          stats.duplicatesSkipped++;
          continue;
        }

        if (!isFresh(job.publication_date, 48)) {
          continue;
        }

        const title = job.title;
        const company = job.company_name || 'Remotive Client';
        const description = job.description || '';
        const url = job.url;

        if (matchesKeywords(title, description, targetKeywords)) {
          fetchedJobsList.push({
            id,
            userId: user._id,
            title,
            company,
            url,
            description,
            platform: 'Remotive',
            posted_at: new Date(job.publication_date)
          });
          stats.matched++;
        }
      }
    } else {
      console.warn(`Remotive API returned status ${response.status}`);
    }
  } catch (err) {
    console.error('Error fetching Remotive:', err.message);
  }

  // 4. Fetch from RemoteOK Web3 RSS Feed
  try {
    console.log('Fetching RemoteOK Web3 RSS Feed...');
    const feed = await parser.parseURL('https://remoteok.com/remote-web3-jobs.rss');
    stats.totalFetched += feed.items.length;

    for (const item of feed.items) {
      if (!item.link) continue;
      const id = generateJobId(item.link);
      
      const existing = await Job.findOne({ id, userId: user._id });
      if (existing) {
        stats.duplicatesSkipped++;
        continue;
      }

      const dateToCheck = item.isoDate || item.pubDate;
      if (dateToCheck && !isFresh(dateToCheck, 48)) {
        continue;
      }

      const cleanTitle = item.title ? item.title.trim() : '';
      if (!cleanTitle) continue;

      const company = extractCompanyFromLink(cleanTitle, item.link);
      const description = item.content || item.contentSnippet || '';
      const url = item.link;

      if (matchesKeywords(cleanTitle, description, targetKeywords)) {
        fetchedJobsList.push({
          id,
          userId: user._id,
          title: cleanTitle,
          company,
          url,
          description,
          platform: 'Web3 Jobs',
          posted_at: new Date(dateToCheck || new Date())
        });
        stats.matched++;
      }
    }
  } catch (err) {
    console.error('Error fetching RemoteOK Web3 feed:', err.message);
  }

  // 5. Save matched jobs to Database
  let savedCount = 0;
  for (const job of fetchedJobsList) {
    try {
      await Job.findOneAndUpdate(
        { id: job.id, userId: user._id },
        job,
        { upsert: true, new: true }
      );
      savedCount++;
    } catch (dbErr) {
      console.error(`Error saving job ${job.id}:`, dbErr.message);
    }
  }

  console.log(`Job fetching complete for user ${user.email}. Stats:`, {
    totalFetched: stats.totalFetched,
    duplicatesSkipped: stats.duplicatesSkipped,
    matchedAndScreened: stats.matched,
    savedToDb: savedCount
  });

  return {
    success: true,
    stats: {
      totalFetched: stats.totalFetched,
      duplicatesSkipped: stats.duplicatesSkipped,
      matchedAndScreened: stats.matched,
      savedToDb: savedCount
    }
  };
}
