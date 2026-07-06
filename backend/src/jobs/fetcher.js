import Parser from 'rss-parser';
import crypto from 'crypto';
import { Job, Settings } from '../models/index.js';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
});

const DEFAULT_KEYWORDS =
  'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter, TypeScript, Developer';

function generateJobId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function extractCompanyFromLink(title, link) {
  try {
    const urlObj = new URL(link);
    const match = urlObj.pathname.match(/\/remote-jobs\/remote-(.+)-(\d+)/);
    if (!match) return 'Remote Company';

    const slugCombined = match[1];
    const titleSlug = slugify(title);
    let companySlug = slugCombined;
    if (slugCombined.startsWith(titleSlug)) {
      companySlug = slugCombined.substring(titleSlug.length).replace(/^-+/, '');
    }

    return companySlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return 'Remote Company';
  }
}

function normalizeKeywords(keywords) {
  if (Array.isArray(keywords)) {
    return keywords.map((k) => String(k).trim()).filter(Boolean).join(',');
  }
  if (typeof keywords === 'string' && keywords.trim()) {
    return keywords.trim();
  }
  return DEFAULT_KEYWORDS;
}

function matchesKeywords(title, description, keywordsList) {
  const normalized = normalizeKeywords(keywordsList);
  if (!normalized) return true;
  const keywords = normalized.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
  const text = `${title} ${description}`.toLowerCase();

  return keywords.some((keyword) => {
    if (keyword.length <= 3) {
      return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
    }
    return text.includes(keyword);
  });
}

function isFresh(postedDateStr, hoursCap = 168) {
  try {
    const postedDate = new Date(postedDateStr);
    if (Number.isNaN(postedDate.getTime())) return true;
    const diffHours = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= hoursCap;
  } catch {
    return true;
  }
}

function normalizeJob(job) {
  return {
    ...job,
    status: job.status || 'pending',
    email: job.email || null,
    customized_pitch: job.customized_pitch || '',
    company_url: job.company_url || null,
    posted_at: job.posted_at || new Date(),
  };
}

/**
 * Fetch REAL jobs from live RSS/APIs — no mock data, no invented URLs.
 */
export async function fetchJobsFromLiveAPIs(keywords, options = {}) {
  const targetKeywords = normalizeKeywords(keywords);
  const hoursCap = options.hoursCap ?? 168; // 7 days
  const realJobs = [];
  const allFreshJobs = [];
  let totalFetched = 0;

  console.log(`[Live Fetch] Keywords: ${targetKeywords}`);

  // 1. WeWorkRemotely
  try {
    const feed = await parser.parseURL('https://weworkremotely.com/remote-jobs.rss');
    totalFetched += feed.items.length;
    for (const item of feed.items) {
      if (!item.link || !isFresh(item.pubDate, hoursCap)) continue;
      let title = item.title || '';
      let company = 'WeWorkRemotely Client';
      if (title.includes(':')) {
        const parts = title.split(':');
        company = parts[0].trim();
        title = parts.slice(1).join(':').trim();
      }
      const description = item.content || item.contentSnippet || '';
      const job = normalizeJob({
        id: generateJobId(item.link),
        title,
        company,
        url: item.link,
        description: description.substring(0, 500),
        platform: 'WeWorkRemotely',
        posted_at: new Date(item.pubDate),
      });
      allFreshJobs.push(job);
      if (matchesKeywords(title, description, targetKeywords)) {
        realJobs.push(job);
      }
    }
  } catch (err) {
    console.error('[WeWorkRemotely]', err.message);
  }

  // 2. RemoteOK
  try {
    const response = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (response.ok) {
      const data = await response.json();
      const jobs = (data || []).slice(1);
      totalFetched += jobs.length;
      for (const job of jobs) {
        if (!job.url || !isFresh(job.date, hoursCap)) continue;
        const title = job.position || '';
        const description = job.description || '';
        const normalized = normalizeJob({
          id: generateJobId(job.url),
          title,
          company: job.company || 'RemoteOK Client',
          url: job.url,
          description: description.substring(0, 500),
          platform: 'RemoteOK',
          posted_at: new Date(job.date),
        });
        allFreshJobs.push(normalized);
        if (matchesKeywords(title, description, targetKeywords)) {
          realJobs.push(normalized);
        }
      }
    }
  } catch (err) {
    console.error('[RemoteOK]', err.message);
  }

  // 3. Remotive
  try {
    const response = await fetch('https://remotive.com/api/remote-jobs?limit=50', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (response.ok) {
      const data = await response.json();
      const jobs = data.jobs || [];
      totalFetched += jobs.length;
      for (const job of jobs) {
        if (!job.url || !isFresh(job.publication_date, hoursCap)) continue;
        const title = job.title || '';
        const description = job.description || '';
        const normalized = normalizeJob({
          id: generateJobId(job.url),
          title,
          company: job.company_name || 'Remotive Client',
          url: job.url,
          description: description.substring(0, 500),
          platform: 'Remotive',
          posted_at: new Date(job.publication_date),
        });
        allFreshJobs.push(normalized);
        if (matchesKeywords(title, description, targetKeywords)) {
          realJobs.push(normalized);
        }
      }
    }
  } catch (err) {
    console.error('[Remotive]', err.message);
  }

  // 4. Web3.Career RSS (optional — feed may be unavailable)
  try {
    const feed = await parser.parseURL('https://web3.career/rss');
    totalFetched += feed.items.length;
    for (const item of feed.items.slice(0, 30)) {
      if (!item.link || !isFresh(item.pubDate, hoursCap)) continue;
      const title = item.title || '';
      const description = item.content || item.contentSnippet || '';
      const normalized = normalizeJob({
        id: generateJobId(item.link),
        title,
        company: item.author || 'Web3 Company',
        url: item.link,
        description: description.substring(0, 500),
        platform: 'Web3.Career',
        posted_at: new Date(item.pubDate),
      });
      allFreshJobs.push(normalized);
      if (matchesKeywords(title, description, targetKeywords)) {
        realJobs.push(normalized);
      }
    }
  } catch (err) {
    console.error('[Web3.Career]', err.message);
  }

  // If keyword filter is too strict, return recent real jobs anyway
  const jobsToUse = realJobs.length > 0 ? realJobs : allFreshJobs.slice(0, 30);
  const usedKeywordFallback = realJobs.length === 0 && allFreshJobs.length > 0;

  // Deduplicate by URL
  const uniqueJobs = [];
  const seen = new Set();
  for (const job of jobsToUse) {
    if (!seen.has(job.url)) {
      seen.add(job.url);
      uniqueJobs.push(job);
    }
  }

  uniqueJobs.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));

  console.log(`[Live Fetch] ${uniqueJobs.length} real jobs (from ${totalFetched} scanned)${usedKeywordFallback ? ' [keyword fallback]' : ''}`);

  return {
    jobs: uniqueJobs,
    stats: {
      totalFetched,
      duplicatesSkipped: jobsToUse.length - uniqueJobs.length,
      matchedAndScreened: uniqueJobs.length,
      savedToDb: uniqueJobs.length,
      keywordFallback: usedKeywordFallback,
    },
  };
}

export async function fetchJobs(user) {
  console.log(`Starting job fetching for user: ${user.email}...`);

  let settings = null;
  try {
    settings = await Settings.findOne({ userId: user._id });
  } catch (err) {
    console.warn('Settings lookup failed:', err.message);
  }

  const targetKeywords =
    settings?.target_keywords ||
    user.targetKeywords ||
    process.env.DEFAULT_JOB_KEYWORDS ||
    DEFAULT_KEYWORDS;

  const { jobs: liveJobs, stats } = await fetchJobsFromLiveAPIs(targetKeywords);

  if (liveJobs.length === 0) {
    return {
      success: true,
      jobs: [],
      stats,
      message: 'No matching jobs found from live APIs. Try broader keywords in Config Panel.',
    };
  }

  let savedCount = 0;
  for (const job of liveJobs) {
    try {
      await Job.findOneAndUpdate(
        { id: job.id, userId: user._id },
        { ...job, userId: user._id },
        { upsert: true, new: true }
      );
      savedCount++;
    } catch (dbErr) {
      console.error(`Error saving job ${job.id}:`, dbErr.message);
    }
  }

  let pendingJobs = liveJobs;
  try {
    pendingJobs = await Job.find({ userId: user._id, status: 'pending' })
      .sort({ posted_at: -1 })
      .lean();
  } catch (err) {
    console.warn('Could not read jobs from DB, returning live fetch results:', err.message);
  }

  return {
    success: true,
    jobs: pendingJobs,
    stats: {
      ...stats,
      savedToDb: savedCount,
    },
  };
}
