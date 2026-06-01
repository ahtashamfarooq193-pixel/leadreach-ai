import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Parser from 'rss-parser';
import { connectDB } from './db/mongodb.js';
import { User, Settings, Job, LocalLead, OutreachLog, LoginLog, mongoose } from './models/index.js';
import { requireAuth } from './middleware/auth.js';
import { fetchJobs } from './jobs/fetcher.js';
import { generatePitch, generateB2BPitch } from './services/ai.js';
import { sendOutreachEmail, testSMTPConnection, getDailyOutreachStats } from './mailer/outreach.js';
import { searchLocalLeads, scrapeBusinessContacts } from './services/localScraper.js';
import { startScheduler, runUserAutomation } from './scheduler.js';
import { config } from './config/index.js';
import scraperRoutes from '../scraperRoutes.js';

const app = express();

const corsOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        corsOrigins.includes(origin) ||
        /^https:\/\/[\w.-]+\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'offline',
    environment: config.nodeEnv,
  });
});

// Ensure MongoDB is connected on Vercel serverless (cold starts)
let vercelDbPromise = null;
app.use(async (req, res, next) => {
  if (
    process.env.VERCEL &&
    !config.skipMongoDB &&
    config.mongodbUri &&
    mongoose.connection.readyState !== 1
  ) {
    if (!vercelDbPromise) {
      vercelDbPromise = connectDB();
    }
    await vercelDbPromise.catch(() => {});
  }
  next();
});

// 🔧 Mount scraper routes
app.use('/api', scraperRoutes);

// ----------------------------------------------------
// Local In-Memory Store for MongoDB Offline Fallback
// ----------------------------------------------------
let mockSettingsObj = {
  smtp_host: 'smtp.gmail.com',
  smtp_port: 465,
  smtp_user: 'ahtashamfarooq@gmail.com',
  smtp_pass: '••••••••',
  sender_name: 'Ahtasham Farooq',
  niche: 'React Developer',
  portfolio_url: 'https://ahtashamfarooq.netlify.app/',
  github_url: 'https://github.com/ahtashamfarooq193-pixel/',
  resume_url: 'https://ahtashamfarooq.framer.website/',
  daily_limit: 30,
  target_keywords: 'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter',
  default_template: `Hi,

I hope you are doing well.

I came across your posting for {job_title} at {company} and noticed you are looking for a developer with skills matching my stack.

I am a Full Stack Developer specializing in WordPress, React, HTML, CSS, JavaScript (JS), Node.js, and Flutter. I have built several high-performance web applications and websites. You can review my work at:
- Portfolio: {portfolio_url}
- GitHub: {github_url}
- Resume: {resume_url}

I would love to help you build and scale your project. Are you available for a brief call to discuss how we can work together?

Best regards,
{sender_name}`,
  gemini_api_key: '••••••••',
  google_places_api_key: '••••••••',
  groq_api_key: '••••••••',
  auto_apply: 0
};

let mockJobsList = [
  {
    id: 'job-mock-1',
    title: 'React Developer',
    company: 'Tech Solutions Inc.',
    url: 'https://example.com/job1',
    company_url: 'https://example.com',
    email: 'hr@techsolutions.com',
    description: 'We are looking for a React Developer with experience in HTML, CSS, JS, React, Node.js. Position is fully remote with competitive compensation.',
    platform: 'WeWorkRemotely',
    posted_at: new Date(),
    status: 'pending',
    customized_pitch: ''
  },
  {
    id: 'job-mock-2',
    title: 'Full Stack Engineer',
    company: 'Creative Web Studio',
    url: 'https://example.com/job2',
    company_url: 'https://example.com',
    email: '',
    description: 'Looking for a developer to help us build a WordPress website and React app. Must be skilled in PHP, React, and general web design.',
    platform: 'RemoteOK',
    posted_at: new Date(Date.now() - 86400000),
    status: 'pending',
    customized_pitch: ''
  }
];

let mockLeadsList = [
  {
    id: 'lead-mock-1',
    name: 'Downtown Dental Care',
    niche: 'Dentist',
    location: 'Cook County, IL',
    website: 'https://downtowndental.com',
    phone: '312-555-0199',
    whatsapp: '312-555-0199',
    email: 'info@downtowndental.com',
    rating: 4.5,
    reviews_count: 128,
    status: 'active',
    outreach_status: 'pending',
    customized_pitch: ''
  }
];

let mockLogsList = [];

// Fallback Middleware to process requests in-memory if MongoDB is down
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && req.path.startsWith('/api/')) {
    console.log(`[Database Offline] Mocking response for: ${req.method} ${req.path}`);
    
    // 1. Settings Endpoints
    if (req.path === '/api/settings') {
      if (req.method === 'GET') {
        return res.json(mockSettingsObj);
      }
      if (req.method === 'POST') {
        mockSettingsObj = { ...mockSettingsObj, ...req.body };
        return res.json({ success: true, message: 'Settings saved successfully (In-Memory Mode)' });
      }
    }
    
    if (req.path === '/api/settings/test-smtp') {
      return res.json({ success: true, message: 'SMTP Test successful (In-Memory Mode)' });
    }
    
    // 2. Stats Endpoint
    if (req.path === '/api/stats') {
      const counts = { pending: 0, applied: 0, rejected: 0, skipped: 0 };
      mockJobsList.forEach(j => {
        if (counts[j.status] !== undefined) counts[j.status]++;
      });
      
      const totalLogs = mockLogsList.length;
      const successLogs = mockLogsList.filter(l => l.status === 'success').length;
      const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;
      
      return res.json({
        dailyLimit: mockSettingsObj.daily_limit || 30,
        sentToday: mockLogsList.length,
        remainingToday: Math.max(0, (mockSettingsObj.daily_limit || 30) - mockLogsList.length),
        jobsCount: counts,
        successRate: successRate,
        chartData: [
          { date: '2026-05-18', count: 0 },
          { date: '2026-05-19', count: 0 },
          { date: '2026-05-20', count: mockLogsList.length }
        ]
      });
    }

    // 3. Logs Endpoint
    if (req.path === '/api/logs') {
      return res.json(mockLogsList);
    }

    // 4. Jobs Endpoints
    if (req.path === '/api/jobs') {
      const statusFilter = req.query.status || 'pending';
      const filtered = mockJobsList.filter(j => j.status === statusFilter);
      return res.json(filtered);
    }

    if (req.path === '/api/jobs/fetch') {
      // REAL job fetching - connect to live job APIs
      try {
        console.log('[Offline Mode] Fetching REAL jobs from live APIs...');
        const parser = new Parser({
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        let realJobs = [];
        const keywords = 'React, Node.js, JavaScript, WordPress, Flutter, HTML, CSS, Python, TypeScript, Developer';

        function matchesKeywords(text) {
          const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase());
          return keywordArray.some(kw => text.toLowerCase().includes(kw));
        }

        // Fetch from WeWorkRemotely RSS
        try {
          const feed = await parser.parseURL('https://weworkremotely.com/remote-jobs.rss');
          for (const item of feed.items.slice(0, 20)) {
            const title = item.title?.split(':')[1]?.trim() || item.title;
            if (matchesKeywords(title || '')) {
              realJobs.push({
                id: crypto.createHash('md5').update(item.link).digest('hex'),
                title,
                company: item.title?.split(':')[0]?.trim() || 'WeWork Client',
                url: item.link,
                platform: 'WeWorkRemotely',
                description: (item.content || item.contentSnippet || '').substring(0, 300),
                posted_at: new Date(item.pubDate),
                email: ''
              });
            }
          }
        } catch (e) {
          console.log('[WeWorkRemotely] Error:', e.message);
        }

        // Fetch from RemoteOK API
        try {
          const res = await fetch('https://remoteok.com/api');
          const data = await res.json();
          for (const job of (data || []).slice(1, 30)) {
            if (matchesKeywords(job.position || '')) {
              realJobs.push({
                id: crypto.createHash('md5').update(job.url).digest('hex'),
                title: job.position,
                company: job.company || 'Remote Company',
                url: job.url,
                platform: 'RemoteOK',
                description: (job.description || '').substring(0, 300),
                posted_at: new Date(job.date),
                email: ''
              });
            }
          }
        } catch (e) {
          console.log('[RemoteOK] Error:', e.message);
        }

        // Fetch from Remotive API
        try {
          const res = await fetch('https://remotive.com/api/remote-jobs?limit=50');
          const data = await res.json();
          for (const job of (data?.jobs || []).slice(0, 30)) {
            if (matchesKeywords(job.title || '')) {
              realJobs.push({
                id: crypto.createHash('md5').update(job.url).digest('hex'),
                title: job.title,
                company: job.company_name || 'Tech Company',
                url: job.url,
                platform: 'Remotive',
                description: (job.description || '').substring(0, 300),
                posted_at: new Date(job.published_at),
                email: ''
              });
            }
          }
        } catch (e) {
          console.log('[Remotive] Error:', e.message);
        }

        // Fetch from Web3 Jobs RSS
        try {
          const feed = await parser.parseURL('https://web3.career/feed');
          for (const item of feed.items.slice(0, 20)) {
            if (matchesKeywords(item.title || '')) {
              realJobs.push({
                id: crypto.createHash('md5').update(item.link).digest('hex'),
                title: item.title,
                company: item.author || 'Web3 Company',
                url: item.link,
                platform: 'Web3.Career',
                description: (item.content || item.contentSnippet || '').substring(0, 300),
                posted_at: new Date(item.pubDate),
                email: ''
              });
            }
          }
        } catch (e) {
          console.log('[Web3.Career] Error:', e.message);
        }

        // Fetch from Cryptocurrency Jobs
        try {
          const feed = await parser.parseURL('https://cryptocurrencyjobs.co/rss/');
          for (const item of feed.items.slice(0, 20)) {
            if (matchesKeywords(item.title || '')) {
              realJobs.push({
                id: crypto.createHash('md5').update(item.link).digest('hex'),
                title: item.title,
                company: item.author || 'Crypto Company',
                url: item.link,
                platform: 'Crypto Jobs',
                description: (item.content || item.contentSnippet || '').substring(0, 300),
                posted_at: new Date(item.pubDate),
                email: ''
              });
            }
          }
        } catch (e) {
          console.log('[Crypto Jobs] Error:', e.message);
        }

        // Remove duplicates and limit results
        const uniqueJobs = [];
        const seen = new Set();
        for (const job of realJobs) {
          if (!seen.has(job.url)) {
            seen.add(job.url);
            // Add required fields for frontend
            job.status = 'pending';
            job.customized_pitch = '';
            job.company_url = job.company_url || job.url;
            uniqueJobs.push(job);
          }
        }

        // Store real jobs in memory so /api/jobs returns them
        mockJobsList = uniqueJobs;

        console.log(`[Offline Mode] Found ${uniqueJobs.length} real jobs`);
        return res.json({
          success: true,
          jobs: uniqueJobs,
          stats: {
            totalFetched: realJobs.length,
            duplicatesSkipped: realJobs.length - uniqueJobs.length,
            matchedAndScreened: uniqueJobs.length,
            savedToDb: uniqueJobs.length
          },
          message: `✅ Fetched ${uniqueJobs.length} REAL jobs from live APIs`
        });
      } catch (error) {
        console.error('[Offline Mode] Job fetch error:', error.message);
        return res.json({
          success: true,
          jobs: [],
          stats: {
            totalFetched: 0,
            duplicatesSkipped: 0,
            matchedAndScreened: 0,
            savedToDb: 0
          },
          message: 'Job APIs temporarily unavailable'
        });
      }
    }

    if (req.path === '/api/jobs/run-automation') {
      return res.json({ success: true, message: 'Scheduled automation triggered (In-Memory Mode)' });
    }

    if (req.path.startsWith('/api/jobs/')) {
      const parts = req.path.split('/');
      const id = parts[3];
      const action = parts[4];
      
      const jobIdx = mockJobsList.findIndex(j => j.id === id);
      const job = jobIdx !== -1 ? mockJobsList[jobIdx] : null;

      if (action === 'extract-email') {
        if (job) {
          // Don't generate fake emails - if we can't find one, leave it empty
          // User will see "Email not found" instead of a fake address
          if (!job.email) {
            job.email = null;  // Explicitly null, not a generated fake
          }
          job.company_url = job.company_url || 'https://' + job.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        }
        return res.json(job || {});
      }
      
      if (action === 'pitch') {
        const pitchText = `Hi,

I hope you are doing well.

I came across your posting for ${job ? job.title : 'Developer'} at ${job ? job.company : 'your company'} and noticed you are looking for a developer with skills matching my stack.

I am a Full Stack Developer specializing in WordPress, React, HTML, CSS, JavaScript (JS), Node.js, and Flutter. I have built several high-performance web applications and websites. You can review my work at:
- Portfolio: ${mockSettingsObj.portfolio_url}
- GitHub: ${mockSettingsObj.github_url}
- Resume: ${mockSettingsObj.resume_url}

I would love to help you build and scale your project. Are you available for a brief call to discuss how we can work together?

Best regards,
${mockSettingsObj.sender_name}`;
        if (job) {
          job.customized_pitch = pitchText;
        }
        return res.json({ pitch: pitchText });
      }
      
      if (action === 'action') {
        const { status, customized_pitch } = req.body;
        if (job) {
          job.status = status;
          if (customized_pitch) job.customized_pitch = customized_pitch;
        }
        return res.json({ success: true });
      }
      
      // Email sending moved to real endpoint handler below (/api/jobs/:id/send-email)
      // This allows the middleware to pass through to the real handler
    }

    // 5. Local Leads Endpoints
    if (req.path === '/api/local-leads') {
      return res.json(mockLeadsList);
    }

    if (req.path === '/api/local-leads/search') {
      try {
        const { niche, location } = req.body;
        
        // Import the mock leads function (redefine it inline for offline mode)
        const mockBusinessDatabase = {
          'dentist': {
            'Los Angeles County, CA': [
              { name: 'Downtown Dental Care', phone: '(213) 555-0101', website: 'https://downtowndental.com', rating: 4.8, reviews: 245 },
              { name: 'Beverly Hills Smile Studio', phone: '(310) 555-0202', website: 'https://bhsmilestudio.com', rating: 4.7, reviews: 189 },
              { name: 'Santa Monica Family Dentistry', phone: '(424) 555-0303', website: 'https://smfamilydental.com', rating: 4.9, reviews: 312 },
              { name: 'Long Beach Dental Wellness', phone: '(562) 555-0404', website: 'https://lbdentalwellness.com', rating: 4.6, reviews: 167 },
              { name: 'Pasadena Cosmetic Dentists', phone: '(626) 555-0505', website: 'https://pasadenacosmetic.com', rating: 4.8, reviews: 278 },
              { name: 'West LA Dental Excellence', phone: '(310) 555-0606', website: 'https://westladental.com', rating: 4.7, reviews: 201 },
              { name: 'Torrance Advanced Dental', phone: '(310) 555-0707', website: 'https://torrancedental.com', rating: 4.5, reviews: 134 },
              { name: 'Glendale Modern Dentistry', phone: '(818) 555-0808', website: 'https://glendaledentalcare.com', rating: 4.9, reviews: 298 },
              { name: 'Inglewood Smile Center', phone: '(424) 555-0909', website: 'https://inglewoodsmile.com', rating: 4.6, reviews: 156 },
              { name: 'Culver City Dental Group', phone: '(310) 555-1010', website: 'https://culvercitydental.com', rating: 4.8, reviews: 223 },
              { name: 'Manhattan Beach Family Dental', phone: '(310) 555-1111', website: 'https://mbfamilydental.com', rating: 4.7, reviews: 187 },
              { name: 'Redondo Beach Dental Practice', phone: '(310) 555-1212', website: 'https://redondobeachdental.com', rating: 4.8, reviews: 267 },
            ],
            'Chicago, IL': [
              { name: 'Chicago Downtown Dental', phone: '(312) 555-2001', website: 'https://chicagodowntowndental.com', rating: 4.7, reviews: 234 },
              { name: 'North Shore Smile Specialists', phone: '(847) 555-2002', website: 'https://northshoresmile.com', rating: 4.8, reviews: 289 },
              { name: 'Loop Dental Excellence', phone: '(312) 555-2003', website: 'https://loopdentalexcellence.com', rating: 4.6, reviews: 178 },
              { name: 'Naperville Advanced Dentistry', phone: '(630) 555-2004', website: 'https://napervilledental.com', rating: 4.9, reviews: 312 },
              { name: 'Evanston Family Dentists', phone: '(847) 555-2005', website: 'https://evanstondentalcare.com', rating: 4.7, reviews: 201 },
            ]
          },
          'plumber': {
            'Los Angeles County, CA': [
              { name: 'LA Pro Plumbing Services', phone: '(213) 555-3001', website: 'https://laproplumbing.com', rating: 4.8, reviews: 267 },
              { name: 'Emergency 24/7 Plumbing LA', phone: '(323) 555-3002', website: 'https://emergency247plumbing.com', rating: 4.6, reviews: 145 },
              { name: 'Santa Monica Plumbing Experts', phone: '(424) 555-3003', website: 'https://smplumbingexperts.com', rating: 4.9, reviews: 298 },
              { name: 'Long Beach Master Plumbers', phone: '(562) 555-3004', website: 'https://lbmasterplumbers.com', rating: 4.7, reviews: 212 },
              { name: 'Pasadena Rooter & Plumbing', phone: '(626) 555-3005', website: 'https://pasadenarooter.com', rating: 4.8, reviews: 256 },
              { name: 'West LA Pipe Specialists', phone: '(310) 555-3006', website: 'https://westlapipe.com', rating: 4.6, reviews: 189 },
            ]
          },
          'electrician': {
            'Los Angeles County, CA': [
              { name: 'LA Licensed Electric Co', phone: '(213) 555-4001', website: 'https://lalicensedelectric.com', rating: 4.8, reviews: 289 },
              { name: 'South Bay Electrical Services', phone: '(310) 555-4002', website: 'https://southbayelectric.com', rating: 4.7, reviews: 234 },
              { name: 'Santa Monica Power Solutions', phone: '(424) 555-4003', website: 'https://smpowersolutions.com', rating: 4.9, reviews: 267 },
              { name: 'Long Beach Electrical Experts', phone: '(562) 555-4004', website: 'https://lbelectricalexperts.com', rating: 4.6, reviews: 156 },
              { name: 'Pasadena Master Electricians', phone: '(626) 555-4005', website: 'https://pasadenamasterelectric.com', rating: 4.8, reviews: 278 },
            ]
          }
        };
        
        const nicheKey = (niche || '').toLowerCase().trim();
        const locationKey = location ? location.trim() : '';
        
        let results = [];
        
        // Try exact match first
        if (mockBusinessDatabase[nicheKey] && mockBusinessDatabase[nicheKey][locationKey]) {
          const businesses = mockBusinessDatabase[nicheKey][locationKey];
          results = businesses.map(biz => ({
            id: crypto.createHash('md5').update(biz.name + biz.website).digest('hex').substring(0, 12),
            name: biz.name,
            niche: niche || 'Business',
            location: location || 'USA',
            website: biz.website,
            phone: biz.phone,
            whatsapp: '',
            email: '',
            rating: biz.rating,
            reviews_count: biz.reviews,
            status: 'active',
            outreach_status: 'pending',
            customized_pitch: ''
          }));
        }
        
        // Add to mock leads list
        mockLeadsList = [...results, ...mockLeadsList.filter(l => l.niche !== niche || l.location !== location)];
        
        const filteredLeads = mockLeadsList.filter(l => l.niche === niche && l.location === location);
        
        console.log(`✅ B2B Search returned ${filteredLeads.length} leads for "${niche}" in "${location}" (Offline Mode)`);
        return res.json({ 
          success: true, 
          savedCount: filteredLeads.length, 
          leads: filteredLeads 
        });
      } catch (err) {
        console.error('Local leads search error:', err.message);
        return res.json({ success: false, error: err.message, leads: [] });
      }
    }

    if (req.path.startsWith('/api/local-leads/')) {
      const parts = req.path.split('/');
      const id = parts[3];
      const action = parts[4];
      
      const leadIdx = mockLeadsList.findIndex(l => l.id === id);
      const lead = leadIdx !== -1 ? mockLeadsList[leadIdx] : null;

      if (action === 'scrape') {
        // Scrape action moved to real endpoint handler below (/api/local-leads/:id/scrape)
        // This allows real website scraping instead of returning fake data
      }

      if (action === 'pitch') {
        const pitchText = `Hi,

I noticed your business, ${lead ? lead.name : 'your company'}, on Google Maps and wanted to reach out.

I specialize in building and optimizing React and WordPress websites for local businesses like yours. I would love to help improve your web presence.

Best regards,
${mockSettingsObj.sender_name}`;
        if (lead) {
          lead.customized_pitch = pitchText;
        }
        return res.json({ pitch: pitchText });
      }

      if (action === 'action') {
        const { outreach_status, customized_pitch, email } = req.body;
        if (lead) {
          lead.outreach_status = outreach_status;
          if (customized_pitch) lead.customized_pitch = customized_pitch;
          if (email) lead.email = email;
        }
        return res.json({ success: true });
      }

      // B2B lead email sending moved to real endpoint handler below (/api/local-leads/:id/send-outreach)
      // This allows the middleware to pass through to the real handler
    }
  }
  next();
});

const PORT = config.port;

// JWT Token Helper
function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '7d' });
}

// ----------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await LoginLog.create({
        email,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        action: 'signup_failed',
        failureReason: 'User with this email already exists'
      });
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create User (hashed automatically in Mongoose schema pre-save)
    const user = await User.create({ name, email, password });

    // Initialize Default Empty Settings for user
    const defaultTemplate = `Hi,

I hope you are doing well.

I came across your posting for {job_title} at {company} and noticed you are looking for a developer with skills matching my stack.

I am a Full Stack Developer specializing in WordPress, React, HTML, CSS, JavaScript (JS), Node.js, and Flutter. I have built several high-performance web applications and websites. You can review my work at:
- Portfolio: {portfolio_url}
- GitHub: {github_url}
- Resume: {resume_url}

I would love to help you build and scale your project. Are you available for a brief call to discuss how we can work together?

Best regards,
{sender_name}`;

    await Settings.create({
      userId: user._id,
      sender_name: user.name,
      default_template: defaultTemplate
    });

    // Log successful signup
    await LoginLog.create({
      userId: user._id,
      name: user.name,
      email,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      action: 'signup_success'
    });

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      await LoginLog.create({
        email,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        action: 'login_failed',
        failureReason: 'User not found'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await LoginLog.create({
        userId: user._id,
        name: user.name,
        email,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        action: 'login_failed',
        failureReason: 'Incorrect password'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Log successful login
    await LoginLog.create({
      userId: user._id,
      name: user.name,
      email,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      action: 'login_success'
    });

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
        niche: user.niche,
        portfolioUrl: user.portfolioUrl,
        githubUrl: user.githubUrl,
        resumeUrl: user.resumeUrl,
        targetKeywords: user.targetKeywords
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    isOnboarded: req.user.isOnboarded,
    niche: req.user.niche,
    portfolioUrl: req.user.portfolioUrl,
    githubUrl: req.user.githubUrl,
    resumeUrl: req.user.resumeUrl,
    targetKeywords: req.user.targetKeywords
  });
});

app.post('/api/auth/onboard', requireAuth, async (req, res) => {
  try {
    const { niche, portfolioUrl, githubUrl, resumeUrl, targetKeywords } = req.body;

    if (!niche || !targetKeywords) {
      return res.status(400).json({ error: 'Niche and keywords are required' });
    }

    // Update User Onboarding info
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        niche,
        portfolioUrl: portfolioUrl || '',
        githubUrl: githubUrl || '',
        resumeUrl: resumeUrl || '',
        targetKeywords,
        isOnboarded: true
      },
      { new: true }
    );

    // Sync to user Settings
    await Settings.findOneAndUpdate(
      { userId: user._id },
      {
        sender_name: user.name,
        niche: user.niche,
        portfolio_url: user.portfolioUrl,
        github_url: user.githubUrl,
        resume_url: user.resumeUrl,
        target_keywords: user.targetKeywords
      },
      { upsert: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOnboarded: user.isOnboarded,
        niche: user.niche,
        portfolioUrl: user.portfolioUrl,
        githubUrl: user.githubUrl,
        resumeUrl: user.resumeUrl,
        targetKeywords: user.targetKeywords
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Core Protected SaaS API Routes
// ----------------------------------------------------

// 1. Settings Endpoints
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.user._id });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    // Mask sensitive credentials before returning
    const safeSettings = settings.toObject();
    if (safeSettings.smtp_pass) safeSettings.smtp_pass = '••••••••';
    if (safeSettings.gemini_api_key) safeSettings.gemini_api_key = '••••••••';
    if (safeSettings.google_places_api_key) safeSettings.google_places_api_key = '••••••••';
    if (safeSettings.groq_api_key) safeSettings.groq_api_key = '••••••••';
    res.json(safeSettings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const newSettings = req.body;
    
    // If sensitive credentials are masked, preserve existing ones from database
    const current = await Settings.findOne({ userId: req.user._id });
    if (current) {
      if (newSettings.smtp_pass === '••••••••') {
        newSettings.smtp_pass = current.smtp_pass;
      }
      if (newSettings.gemini_api_key === '••••••••') {
        newSettings.gemini_api_key = current.gemini_api_key;
      }
      if (newSettings.google_places_api_key === '••••••••') {
        newSettings.google_places_api_key = current.google_places_api_key;
      }
      if (newSettings.groq_api_key === '••••••••') {
        newSettings.groq_api_key = current.groq_api_key;
      }
    } else {
      if (newSettings.smtp_pass === '••••••••') newSettings.smtp_pass = '';
      if (newSettings.gemini_api_key === '••••••••') newSettings.gemini_api_key = '';
      if (newSettings.google_places_api_key === '••••••••') newSettings.google_places_api_key = '';
      if (newSettings.groq_api_key === '••••••••') newSettings.groq_api_key = '';
    }

    await Settings.findOneAndUpdate(
      { userId: req.user._id },
      { ...newSettings, userId: req.user._id, updated_at: Date.now() },
      { upsert: true, new: true }
    );
    
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/test-smtp', requireAuth, async (req, res) => {
  try {
    const credentials = req.body;
    
    // If password is masked, use existing password from DB
    if (credentials.smtp_pass === '••••••••') {
      const current = await Settings.findOne({ userId: req.user._id });
      credentials.smtp_pass = current ? current.smtp_pass : '';
    }

    const testResult = await testSMTPConnection(credentials);
    res.json(testResult);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 2. Jobs Endpoints
app.get('/api/jobs', requireAuth, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const jobs = await Job.find({ userId: req.user._id, status }).sort({ posted_at: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/fetch', requireAuth, async (req, res) => {
  try {
    const result = await fetchJobs(req.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/run-automation', requireAuth, async (req, res) => {
  try {
    // Run automation pipeline in background for this specific user
    runUserAutomation(req.user);
    res.json({ success: true, message: 'Scheduled automation triggered in background' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to lookup company official website on Google Search if not in job post
async function searchCompanyDomain(companyName) {
  if (!companyName || companyName.toLowerCase().includes('client') || companyName.toLowerCase().includes('undisclosed') || companyName.toLowerCase().includes('weworkremotely') || companyName.toLowerCase().includes('remoteok')) {
    return null;
  }
  try {
    const query = `"${companyName}" official website -site:wikipedia.org -site:linkedin.com -site:twitter.com -site:facebook.com`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const urlRegex = /href=["'](https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}[^"']*)["']/gi;
    const matches = html.matchAll(urlRegex);
    
    for (const match of matches) {
      const fullUrl = match[1];
      try {
        const urlObj = new URL(fullUrl);
        const host = urlObj.hostname.toLowerCase();
        if (
          host.includes('google') ||
          host.includes('youtube') ||
          host.includes('linkedin') ||
          host.includes('twitter') ||
          host.includes('facebook') ||
          host.includes('instagram') ||
          host.includes('wikipedia') ||
          host.includes('weworkremotely') ||
          host.includes('remoteok') ||
          host.includes('remotive') ||
          host.includes('crypto.jobs') ||
          host.includes('greenhouse') ||
          host.includes('lever') ||
          host.includes('workable') ||
          host.includes('ashbyhq')
        ) {
          continue;
        }
        return `${urlObj.protocol}//${urlObj.hostname}`;
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error fetching company domain from Google:', err.message);
  }
  return null;
}

// Helper to extract the company corporate domain from job URL, description, or search fallback
async function extractCompanyDomain(job) {
  const blacklist = [
    'greenhouse.io', 'lever.co', 'weworkremotely.com', 'remoteok.com', 
    'remotive.com', 'crypto.jobs', 'workable.com', 'ashbyhq.com', 
    'bamboohr.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 
    'linkedin.com', 'github.com', 'gitlab.com', 'twitter.com', 'x.com', 
    'facebook.com', 'instagram.com', 'medium.com', 'dribbble.com', 
    'behance.com', 'figma.com', 'youtube.com', 'google.com', 'sentry.io',
    'imgix.net', 'wp.com', 'wp-content', 'amazonaws.com', 'cloudfront.net',
    'web3.career', 'remote3.co', 'schema.org', 'w3.org', 'slack.com',
    'zoom.us', 'discord.gg', 'discord.com', 'telegram.org', 't.me', 'reddit.com'
  ];

  function isBlacklisted(urlStr) {
    try {
      const host = new URL(urlStr).hostname.toLowerCase();
      return blacklist.some(item => host.includes(item));
    } catch (e) {
      return true;
    }
  }

  if (job.url && !isBlacklisted(job.url)) {
    try {
      const urlObj = new URL(job.url);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch (e) {}
  }

  if (job.description) {
    const urlRegex = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}[^\s"']*/gi;
    const urls = job.description.match(urlRegex) || [];
    for (const rawUrl of urls) {
      let cleanUrl = rawUrl.replace(/[.,;:)("'>]$/, '');
      if (!isBlacklisted(cleanUrl)) {
        try {
          const urlObj = new URL(cleanUrl);
          return `${urlObj.protocol}//${urlObj.hostname}`;
        } catch (e) {}
      }
    }
  }

  if (job.company) {
    console.log(`No domain found. Running Google fallback lookup for: "${job.company}"`);
    const domain = await searchCompanyDomain(job.company);
    if (domain) {
      console.log(`Found domain: ${domain}`);
      return domain;
    }
  }

  return null;
}

app.post('/api/jobs/:id/extract-email', requireAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ id: req.params.id, userId: req.user._id });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const companyUrl = await extractCompanyDomain(job);
    if (!companyUrl) {
      return res.status(400).json({ error: 'Could not extract valid company website domain' });
    }

    const contacts = await scrapeBusinessContacts(companyUrl);
    
    const updatedJob = await Job.findOneAndUpdate(
      { id: req.params.id, userId: req.user._id },
      { company_url: companyUrl, email: contacts.email || null },
      { new: true }
    );

    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/pitch', requireAuth, async (req, res) => {
  try {
    const job = await Job.findOne({ id: req.params.id, userId: req.user._id });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const settings = await Settings.findOne({ userId: req.user._id });
    const pitch = await generatePitch(job, settings);
    res.json({ pitch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/action', requireAuth, async (req, res) => {
  try {
    const { status, customized_pitch } = req.body;
    await Job.findOneAndUpdate(
      { id: req.params.id, userId: req.user._id },
      { status, customized_pitch: customized_pitch || null }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/send-email', requireAuth, async (req, res) => {
  try {
    const { recipientEmail, subject, body } = req.body;
    const result = await sendOutreachEmail({
      jobId: req.params.id,
      recipientEmail,
      subject,
      body,
      userId: req.user._id
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Stats & Logs
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const stats = await getDailyOutreachStats(req.user._id);
    
    // Status counts for this user
    const counts = { pending: 0, applied: 0, rejected: 0, skipped: 0 };
    const statusCounts = await Job.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    statusCounts.forEach(item => {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count;
      }
    });

    // 7-day success logs count
    const startOf7DaysAgo = new Date();
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);
    startOf7DaysAgo.setHours(0, 0, 0, 0);

    const historyLogs = await OutreachLog.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: 'success',
          sent_at: { $gte: startOf7DaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$sent_at" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const history = historyLogs.map(item => ({ date: item._id, count: item.count }));

    // Success Rate calculation
    const totalLogsCount = await OutreachLog.countDocuments({ userId: req.user._id });
    const successLogsCount = await OutreachLog.countDocuments({ userId: req.user._id, status: 'success' });
    const successRate = totalLogsCount > 0 
      ? Math.round((successLogsCount / totalLogsCount) * 100) 
      : 100;

    res.json({
      dailyLimit: stats.limit,
      sentToday: stats.sent,
      remainingToday: stats.remaining,
      jobsCount: counts,
      successRate,
      chartData: history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', requireAuth, async (req, res) => {
  try {
    const logs = await OutreachLog.aggregate([
      { $match: { userId: req.user._id } },
      { $sort: { sent_at: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: 'jobs',
          let: { jobId: '$job_id', uId: '$userId' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$id', '$$jobId'] }, { $eq: ['$userId', '$$uId'] } ] } } }
          ],
          as: 'jobDetails'
        }
      },
      {
        $project: {
          _id: 1,
          job_id: 1,
          recipient_email: 1,
          subject: 1,
          body: 1,
          status: 1,
          error_message: 1,
          sent_at: 1,
          title: { $arrayElemAt: ['$jobDetails.title', 0] },
          company: { $arrayElemAt: ['$jobDetails.company', 0] },
          url: { $arrayElemAt: ['$jobDetails.url', 0] }
        }
      }
    ]);
    
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. B2B Local Leads Finder Endpoints
app.get('/api/local-leads', requireAuth, async (req, res) => {
  try {
    const leads = await LocalLead.find({ userId: req.user._id }).sort({ created_at: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/local-leads/search', requireAuth, async (req, res) => {
  try {
    const { niche, location, source } = req.body;
    const settings = await Settings.findOne({ userId: req.user._id });
    const apiKey = settings ? settings.google_places_api_key : null;
    
    console.log(`B2B Lead Search: Niche="${niche}", Location="${location}" (User: ${req.user.email})`);
    const leads = await searchLocalLeads(niche, location, apiKey, source || 'google');
    
    let savedCount = 0;
    for (const lead of leads) {
      const existing = await LocalLead.findOne({ id: lead.id, userId: req.user._id });
      if (!existing) {
        await LocalLead.create({
          ...lead,
          userId: req.user._id,
          outreach_status: 'pending'
        });
        savedCount++;
      }
    }
    
    const updatedLeads = await LocalLead.find({ userId: req.user._id, niche, location }).sort({ created_at: -1 });
    res.json({ success: true, savedCount, leads: updatedLeads });
  } catch (err) {
    console.error('Error during B2B search:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/local-leads/:id/scrape', requireAuth, async (req, res) => {
  try {
    const leadId = req.params.id;
    
    // Try to find lead in database with timeout
    let lead = null;
    const dbTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 2000)
    );
    
    try {
      const dbPromise = LocalLead.findOne({ id: leadId, userId: req.user._id });
      lead = await Promise.race([dbPromise, dbTimeoutPromise]);
    } catch (dbErr) {
      console.log('⚠️  Could not query database, checking mock data');
      // Fallback to mock data if DB is offline
      lead = mockLeadsList.find(l => l.id === leadId);
    }
    
    if (!lead) {
      return res.status(404).json({ error: 'B2B Lead not found' });
    }
    
    // Scrape the website for contacts
    console.log(`📧 Scraping ${lead.website} for contact info...`);
    const contacts = await scrapeBusinessContacts(lead.website);
    
    // Update lead with scraped contact info
    const updatedLead = {
      ...lead,
      email: contacts.email || lead.email,
      phone: lead.phone || contacts.phone,
      whatsapp: contacts.whatsapp || lead.whatsapp,
      instagram_url: contacts.instagram || lead.instagram,
      facebook_url: contacts.facebook || lead.facebook,
      needs_optimization: contacts.needs_optimization || 0,
      optimization_reasons: contacts.optimization_reasons || ''
    };
    
    // Try to update database but don't fail if it's offline
    try {
      const dbUpdatePromise = LocalLead.findOneAndUpdate(
        { id: leadId, userId: req.user._id },
        updatedLead,
        { new: true }
      );
      const dbTimeoutPromise2 = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      );
      await Promise.race([dbUpdatePromise, dbTimeoutPromise2]);
    } catch (dbErr) {
      console.log('⚠️  Could not update database, returning scraped data only');
      // Database is offline, just return the scraped data
    }
    
    // Update mock data if using offline mode
    const mockIdx = mockLeadsList.findIndex(l => l.id === leadId);
    if (mockIdx !== -1) {
      mockLeadsList[mockIdx] = updatedLead;
    }
    
    res.json(updatedLead);
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/local-leads/:id/pitch', requireAuth, async (req, res) => {
  try {
    const lead = await LocalLead.findOne({ id: req.params.id, userId: req.user._id });
    if (!lead) {
      return res.status(404).json({ error: 'B2B Lead not found' });
    }
    const settings = await Settings.findOne({ userId: req.user._id });
    const pitch = await generateB2BPitch(lead, settings);
    res.json({ pitch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/local-leads/:id/action', requireAuth, async (req, res) => {
  try {
    const { outreach_status, customized_pitch, email, whatsapp } = req.body;
    const updateData = { outreach_status };
    if (customized_pitch !== undefined) updateData.customized_pitch = customized_pitch || null;
    if (email !== undefined) updateData.email = email;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;

    await LocalLead.findOneAndUpdate(
      { id: req.params.id, userId: req.user._id },
      updateData
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/local-leads/:id/send-outreach', requireAuth, async (req, res) => {
  try {
    const { recipientEmail, subject, body } = req.body;
    
    const lead = await LocalLead.findOne({ id: req.params.id, userId: req.user._id });
    if (!lead) {
      return res.status(404).json({ error: 'B2B Lead not found' });
    }
    
    const result = await sendOutreachEmail({
      jobId: null,
      recipientEmail,
      subject,
      body,
      userId: req.user._id
    });
    
    await LocalLead.findOneAndUpdate(
      { id: req.params.id, userId: req.user._id },
      { outreach_status: 'emailed', customized_pitch: body, email: recipientEmail }
    );
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Connect to Database and Start Server
async function startServer() {
  console.log(`\n🚀 Starting Auto-Outreach Backend Server...`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 MongoDB: ${config.skipMongoDB ? '⏭️ SKIPPED (Mock Data Mode)' : config.mongodbUri}`);
  
  if (!config.skipMongoDB) {
    try {
      await connectDB();
    } catch (err) {
      console.error('⚠️  MongoDB connection failed, running in offline mode');
    }
  } else {
    console.log('✅ Running with Mock Data (No MongoDB Connection)');
  }
  
  const server = app.listen(PORT, () => {
    console.log(`\n✅ Server is running in ${config.nodeEnv} mode`);
    console.log(`🌐 Listening on: http://localhost:${PORT}`);
    console.log(`\n📝 Available Endpoints:`);
    console.log(`   - POST   /api/auth/signup`);
    console.log(`   - POST   /api/auth/login`);
    console.log(`   - GET    /api/jobs (Protected)`);
    console.log(`   - POST   /api/local-leads/search (Protected)`);
    console.log(`   - POST   /api/local-leads/:id/scrape (Protected) ← Email scraping`);
    console.log(`\n`);
    
    // Only start scheduler in production or long-running environments
    if (config.nodeEnv === 'production' && process.env.DEPLOYMENT !== 'vercel') {
      startScheduler();
    }
  });
  
  return server;
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start server if not in Vercel serverless environment
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Fatal error during startup:', err);
    process.exit(1);
  });
}

// Export app for Vercel serverless
export default app;
