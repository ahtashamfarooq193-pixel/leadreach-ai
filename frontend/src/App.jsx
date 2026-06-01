import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Send, 
  Settings, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  Mail, 
  ShieldCheck, 
  Cpu, 
  TrendingUp, 
  Clock, 
  Code,
  Search,
  History,
  FileCheck
} from 'lucide-react';

// Determine API base URL
const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  // Production: same Vercel domain (frontend + backend together)
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

console.log('🔗 Using API Base URL:', API_BASE);

// Global Fetch Interceptor to automatically add JWT headers
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  let token = localStorage.getItem('token');
  if (!token) {
    token = 'demo-bypass-token';
  }
  const headers = { ...options.headers };
  if (token && typeof url === 'string' && url.includes('/api/')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  options.headers = headers;
  
  const response = await originalFetch(url, options);
  if (response.status === 401 && typeof url === 'string' && url.includes('/api/') && !url.includes('/auth/')) {
    if (token !== 'demo-bypass-token') {
      localStorage.removeItem('token');
      window.location.reload();
    } else {
      console.error('Auth Bypass Token failed. Please verify if the backend database is connected and running.');
    }
  }
  return response;
};

const POPULAR_NICHES = [
  { value: 'Dentist', label: 'Dentist 🦷' },
  { value: 'Roofer', label: 'Roofer 🏠' },
  { value: 'Plumber', label: 'Plumber 🪠' },
  { value: 'HVAC Contractor', label: 'HVAC Contractor ❄️' },
  { value: 'Chiropractor', label: 'Chiropractor 🦴' },
  { value: 'Gym & Fitness', label: 'Gym & Fitness 🏋️‍♂️' },
  { value: 'Restaurant', label: 'Restaurant 🍔' },
  { value: 'Real Estate Agent', label: 'Real Estate Agent 🏢' },
  { value: 'Auto Repair', label: 'Auto Repair 🚗' },
  { value: 'Lawyer & Attorney', label: 'Lawyer & Attorney ⚖️' },
  { value: 'Cleaning Service', label: 'Cleaning Service 🧹' },
  { value: 'Landscaping Service', label: 'Landscaping Service 🌿' },
  { value: 'Electrician', label: 'Electrician ⚡' },
  { value: 'Veterinarian', label: 'Veterinarian 🐾' },
  { value: 'Beauty Salon & Spa', label: 'Beauty Salon & Spa 💇‍♀️' },
  { value: 'Medical Clinic', label: 'Medical Clinic 🏥' }
];

const POPULAR_COUNTIES = [
  // US Counties
  { value: 'Cook County, IL', label: 'Cook County, IL (Chicago, Evanston) 🇺🇸' },
  { value: 'Los Angeles County, CA', label: 'Los Angeles County, CA (LA, Long Beach) 🇺🇸' },
  { value: 'Orange County, CA', label: 'Orange County, CA (Anaheim, Irvine) 🇺🇸' },
  { value: 'Harris County, TX', label: 'Harris County, TX (Houston, Pasadena) 🇺🇸' },
  { value: 'Maricopa County, AZ', label: 'Maricopa County, AZ (Phoenix, Scottsdale) 🇺🇸' },
  { value: 'Miami-Dade County, FL', label: 'Miami-Dade County, FL (Miami, Miami Beach) 🇺🇸' },
  { value: 'King County, WA', label: 'King County, WA (Seattle, Bellevue) 🇺🇸' },
  { value: 'Dallas County, TX', label: 'Dallas County, TX (Dallas, Irving) 🇺🇸' },
  { value: 'San Diego County, CA', label: 'San Diego County, CA (San Diego) 🇺🇸' },
  { value: 'Fulton County, GA', label: 'Fulton County, GA (Atlanta, Alpharetta) 🇺🇸' },
  { value: 'Travis County, TX', label: 'Travis County, TX (Austin) 🇺🇸' },
  { value: 'Clark County, NV', label: 'Clark County, NV (Las Vegas, Henderson) 🇺🇸' },
  { value: 'Hillsborough County, FL', label: 'Hillsborough County, FL (Tampa) 🇺🇸' },
  { value: 'Broward County, FL', label: 'Broward County, FL (Fort Lauderdale) 🇺🇸' },
  // UK Counties
  { value: 'Greater London, UK', label: 'Greater London, UK (London, Croydon) 🇬🇧' },
  { value: 'West Midlands, UK', label: 'West Midlands, UK (Birmingham, Coventry) 🇬🇧' },
  { value: 'Greater Manchester, UK', label: 'Greater Manchester, UK (Manchester, Salford) 🇬🇧' },
  { value: 'West Yorkshire, UK', label: 'West Yorkshire, UK (Leeds, Bradford) 🇬🇧' },
  { value: 'Merseyside, UK', label: 'Merseyside, UK (Liverpool, St Helens) 🇬🇧' },
  // Canada Regions
  { value: 'York Region, ON', label: 'York Region, ON (Toronto, Markham) 🇨🇦' },
  { value: 'Metro Vancouver, BC', label: 'Metro Vancouver, BC (Vancouver, Burnaby) 🇨🇦' },
  { value: 'Peel Region, ON', label: 'Peel Region, ON (Mississauga, Brampton) 🇨🇦' }
];

const DEMO_USER = {
  id: 'demo-user-001',
  name: 'Ahtasham Farooq',
  email: 'ahtashamfarooq@gmail.com',
  isOnboarded: true,
  niche: 'React Developer',
  portfolioUrl: 'https://ahtashamfarooq.netlify.app/',
  githubUrl: 'https://github.com/ahtashamfarooq193-pixel',
  resumeUrl: 'https://ahtashamfarooq.framer.website/',
  targetKeywords: 'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter'
};

export default function App() {
  const [token, setToken] = useState('demo-bypass-token');
  const [user, setUser] = useState(DEMO_USER);
  const [authMode, setAuthMode] = useState('dashboard'); // DEMO MODE: skipping login/signup
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Onboarding fields
  const [onboardNiche, setOnboardNiche] = useState('React Developer');
  const [onboardKeywords, setOnboardKeywords] = useState('React, HTML, CSS, JavaScript, Node.js');
  const [onboardPortfolio, setOnboardPortfolio] = useState('');
  const [onboardGithub, setOnboardGithub] = useState('');
  const [onboardResume, setOnboardResume] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [serverOnline, setServerOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Stats State
  const [stats, setStats] = useState({
    dailyLimit: 30,
    sentToday: 0,
    remainingToday: 30,
    jobsCount: { pending: 0, applied: 0, rejected: 0, skipped: 0 },
    successRate: 100,
    chartData: []
  });
  
  // Jobs & Selection State
  const [jobs, setJobs] = useState([]);
  const [jobFilter, setJobFilter] = useState('pending');
  const [selectedJob, setSelectedJob] = useState(null);
  const [pitchDraft, setPitchDraft] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [extractingEmail, setExtractingEmail] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_user: '',
    smtp_pass: '',
    sender_name: 'Ahtasham Farooq',
    niche: 'React Developer',
    portfolio_url: 'https://ahtashamfarooq.netlify.app/',
    github_url: 'https://github.com/ahtashamfarooq193-pixel/',
    resume_url: 'https://ahtashamfarooq.framer.website/',
    daily_limit: 30, // Default increased to 30 as requested
    target_keywords: 'WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter',
    default_template: '',
    gemini_api_key: '',
    google_places_api_key: '',
    groq_api_key: '',
    auto_apply: 0
  });

  // SMTP Testing State
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);

  // B2B Leads State
  const [b2bLeads, setB2bLeads] = useState([]);
  const [b2bCurrentPage, setB2bCurrentPage] = useState(1);
  const b2bItemsPerPage = 5;
  const [b2bNiche, setB2bNiche] = useState('Dentist');
  const [b2bLocation, setB2bLocation] = useState('Cook County, IL');
  const [b2bSource, setB2bSource] = useState('google');
  const [customNiche, setCustomNiche] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [isCustomNiche, setIsCustomNiche] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [b2bSearching, setB2bSearching] = useState(false);
  const [selectedB2BLead, setSelectedB2BLead] = useState(null);
  const [b2bPitchDraft, setB2bPitchDraft] = useState('');
  const [b2bGeneratingPitch, setB2bGeneratingPitch] = useState(false);
  const [b2bSendingEmail, setB2bSendingEmail] = useState(false);
  const [b2bScrapingBatch, setB2bScrapingBatch] = useState(false);
  const [b2bScrapingProgress, setB2bScrapingProgress] = useState(0);

  // Logs & History State
  const [logs, setLogs] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryLog, setSelectedHistoryLog] = useState(null);

  // Auth Handler Functions
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        if (!data.user.isOnboarded) {
          setAuthMode('onboarding');
        } else {
          setAuthMode('dashboard');
        }
      } else {
        setAuthError(data.error || 'Invalid login details');
      }
    } catch (err) {
      setAuthError('Could not connect to backend server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!authName || !authEmail || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setAuthMode('onboarding');
      } else {
        setAuthError(data.error || 'Sign up failed');
      }
    } catch (err) {
      setAuthError('Could not connect to backend server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardNiche || !onboardKeywords) {
      setAuthError('Please fill in your Niche and keywords');
      return;
    }
    setOnboardLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          niche: onboardNiche,
          portfolioUrl: onboardPortfolio,
          githubUrl: onboardGithub,
          resumeUrl: onboardResume,
          targetKeywords: onboardKeywords
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setAuthMode('dashboard');
        // Initial fetch after onboarding
        fetchStats();
        fetchSettings();
        fetchLogs();
      } else {
        setAuthError(data.error || 'Onboarding failed');
      }
    } catch (err) {
      setAuthError('Could not connect to backend server');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setAuthMode('login');
  };

  // Fetch Dashboard Stats & Health Check
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
    } catch (err) {
      setServerOnline(false);
    }
  };

  // Fetch Jobs list based on filter
  const fetchJobsList = async (status = jobFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
        if (data.length > 0) {
          // Keep current selection if still in list, otherwise select first
          const stillExists = selectedJob && data.find(j => j.id === selectedJob.id);
          if (!stillExists) {
            handleSelectJob(data[0]);
          }
        } else {
          setSelectedJob(null);
          setPitchDraft('');
          setRecipientEmail('');
          setEmailSubject('');
        }
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Fetch System Logs (Outreach History)
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        if (data.length > 0 && !selectedHistoryLog) {
          setSelectedHistoryLog(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch B2B Local Leads
  const fetchB2BLeads = async () => {
    try {
      const res = await fetch(`${API_BASE}/local-leads`);
      if (res.ok) {
        const data = await res.json();
        setB2bLeads(data);
        setB2bCurrentPage(1);
      }
    } catch (err) {
      console.error('Error fetching B2B leads:', err);
    }
  };

  // Search B2B local business leads
  const handleB2BSearch = async (e) => {
    if (e) e.preventDefault();
    if (!b2bNiche || !b2bNiche.trim() || !b2bLocation || !b2bLocation.trim()) {
      alert('Please select or enter both niche and county/location');
      return;
    }
    setB2bSearching(true);
    try {
      const res = await fetch(`${API_BASE}/local-leads/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: b2bNiche, location: b2bLocation, source: b2bSource })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setB2bLeads(data.leads);
        setB2bCurrentPage(1);
        alert(`B2B Search Complete! Found and saved ${data.savedCount} new active businesses in ${b2bLocation}.`);
        if (data.leads.length > 0) {
          handleSelectB2BLead(data.leads[0]);
        }
      } else {
        alert('Search failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      alert('Error searching B2B leads: ' + err.message);
    } finally {
      setB2bSearching(false);
    }
  };

  // Scrape single website contacts
  const handleB2BScrape = async (lead) => {
    if (!lead || !lead.website) return;
    try {
      const res = await fetch(`${API_BASE}/local-leads/${lead.id}/scrape`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        // Update leads list
        setB2bLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
        if (selectedB2BLead && selectedB2BLead.id === updated.id) {
          setSelectedB2BLead(updated);
        }
        return updated;
      }
    } catch (err) {
      console.error('Error scraping B2B lead contacts:', err);
    }
    return lead;
  };

  // Scrape all websites in batch (Bulk Scrape)
  const handleB2BScrapeBatch = async () => {
    const unscrapedLeads = b2bLeads.filter(l => !l.email && l.website && l.outreach_status === 'pending');
    if (unscrapedLeads.length === 0) {
      alert('No pending leads require email scraping!');
      return;
    }

    setB2bScrapingBatch(true);
    setB2bScrapingProgress(0);
    
    let scrapedCount = 0;
    for (let i = 0; i < unscrapedLeads.length; i++) {
      const lead = unscrapedLeads[i];
      await handleB2BScrape(lead);
      scrapedCount++;
      setB2bScrapingProgress(Math.round((scrapedCount / unscrapedLeads.length) * 100));
    }
    
    setB2bScrapingBatch(false);
    alert(`Bulk Website Scraping complete! Scraped ${scrapedCount} business sites for contact details.`);
  };

  // Select B2B lead and generate tailored AI pitch
  const handleSelectB2BLead = async (lead) => {
    setSelectedB2BLead(lead);
    
    if (lead.customized_pitch) {
      setB2bPitchDraft(lead.customized_pitch);
      return;
    }

    setB2bGeneratingPitch(true);
    setB2bPitchDraft('Drafting professional B2B outreach pitch with Gemini...');
    try {
      const res = await fetch(`${API_BASE}/local-leads/${lead.id}/pitch`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setB2bPitchDraft(data.pitch);
      } else {
        setB2bPitchDraft('Error generating AI B2B pitch. Please check your settings.');
      }
    } catch (err) {
      setB2bPitchDraft('Error generating B2B pitch: ' + err.message);
    } finally {
      setB2bGeneratingPitch(false);
    }
  };

  // Regenerate AI Pitch
  const handleRegenerateB2BAI = async () => {
    if (!selectedB2BLead) return;
    setB2bGeneratingPitch(true);
    setB2bPitchDraft('Regenerating highly customized B2B pitch with Gemini...');
    try {
      const res = await fetch(`${API_BASE}/local-leads/${selectedB2BLead.id}/pitch`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setB2bPitchDraft(data.pitch);
      }
    } catch (err) {
      setB2bPitchDraft('Failed to generate pitch: ' + err.message);
    } finally {
      setB2bGeneratingPitch(false);
    }
  };

  // Update lead action
  const handleB2BUpdateAction = async (status, customizedPitch = b2bPitchDraft) => {
    if (!selectedB2BLead) return;
    try {
      const res = await fetch(`${API_BASE}/local-leads/${selectedB2BLead.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreach_status: status,
          customized_pitch: customizedPitch,
          email: selectedB2BLead.email,
          whatsapp: selectedB2BLead.whatsapp
        })
      });
      if (res.ok) {
        // Update local state
        setB2bLeads(prev => prev.map(l => l.id === selectedB2BLead.id ? {
          ...l,
          outreach_status: status,
          customized_pitch: customizedPitch,
          email: selectedB2BLead.email,
          whatsapp: selectedB2BLead.whatsapp
        } : l));
        setSelectedB2BLead(prev => prev ? {
          ...prev,
          outreach_status: status,
          customized_pitch: customizedPitch,
          email: selectedB2BLead.email,
          whatsapp: selectedB2BLead.whatsapp
        } : null);
      }
    } catch (err) {
      console.error('Error updating B2B lead action:', err);
    }
  };

  // Send Email B2B
  const handleSendB2BEmail = async () => {
    if (!selectedB2BLead || !selectedB2BLead.email) {
      alert('Please make sure the lead has a valid email address.');
      return;
    }
    setB2bSendingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/local-leads/${selectedB2BLead.id}/send-outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: selectedB2BLead.email,
          subject: `Website & App Optimization for ${selectedB2BLead.name}`,
          body: b2bPitchDraft
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Cold outreach email successfully sent directly to: ' + selectedB2BLead.email);
        fetchStats();
        // Update local state to mailed
        setB2bLeads(prev => prev.map(l => l.id === selectedB2BLead.id ? { ...l, outreach_status: 'emailed', customized_pitch: b2bPitchDraft } : l));
        setSelectedB2BLead(prev => prev ? { ...prev, outreach_status: 'emailed', customized_pitch: b2bPitchDraft } : null);
      } else {
        alert('Failed to send email: ' + (data.error || 'SMTP Connection Error'));
      }
    } catch (err) {
      alert('Error sending B2B outreach email: ' + err.message);
    } finally {
      setB2bSendingEmail(false);
    }
  };

  // DEMO MODE: Auth verification skipped - going straight to dashboard
  // useEffect(() => { verifyUser(); }, [token]);

  // Init Data on Mount (demo mode - no token check needed)
  useEffect(() => {
    if (authMode === 'dashboard') {
      fetchStats();
      fetchSettings();
      fetchLogs();
    }
  }, [authMode]);

  // Fetch Jobs when jobFilter changes (demo mode)
  useEffect(() => {
    if (authMode === 'dashboard') {
      fetchJobsList(jobFilter);
    }
  }, [jobFilter, authMode]);

  // Handle manual job fetching (trigger fetch engine)
  const handleTriggerFetch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/fetch`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Successfully fetched jobs! Match Stats: Matched ${data.stats.matchedAndScreened} new fresh job listings.`);
        fetchStats();
        fetchJobsList(jobFilter);
      }
    } catch (err) {
      alert('Error fetching jobs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual automation execution (Auto-apply)
  const handleRunAutomation = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/run-automation`, { method: 'POST' });
      if (res.ok) {
        alert('Automation triggered! Running deep scan, stack matching, AI pitch drafting, and auto emailing in the background. Check Outreach History in a few moments.');
        setTimeout(() => {
          fetchStats();
          fetchJobsList(jobFilter);
          fetchLogs();
        }, 4000);
      }
    } catch (err) {
      alert('Error running automation: ' + err.message);
    }
  };

  // Select job and pre-load/generate email drafts
  const handleSelectJob = async (job) => {
    setSelectedJob(job);
    setRecipientEmail('');
    setEmailSubject(`Developer Outreach: Pitch for ${job.title} at ${job.company}`);
    
    // Check if job already has a saved pitch
    if (job.customized_pitch) {
      setPitchDraft(job.customized_pitch);
      detectEmailInJob(job);
      return;
    }

    // Otherwise, load draft pitch
    setGeneratingPitch(true);
    setPitchDraft('Drafting professional email pitch...');
    try {
      const res = await fetch(`${API_BASE}/jobs/${job.id}/pitch`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPitchDraft(data.pitch);
      } else {
        setPitchDraft('Error generating pitch draft. Please check your settings.');
      }
    } catch (err) {
      setPitchDraft('Error connecting to backend API: ' + err.message);
    } finally {
      setGeneratingPitch(false);
      detectEmailInJob(job);
    }
  };

  // Helper to extract email and set state
  const detectEmailInJob = (job) => {
    if (job.email) {
      setRecipientEmail(job.email);
      return;
    }
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const match = job.description.match(emailRegex);
    if (match && match.length > 0) {
      setRecipientEmail(match[0]);
    } else {
      setRecipientEmail('');
    }
  };

  // Trigger backend scraper to parse company website and extract direct email
  const handleExtractJobEmail = async (jobId) => {
    if (!jobId) return;
    setExtractingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/extract-email`, {
        method: 'POST',
      });
      if (res.ok) {
        const updatedJob = await res.json();
        // Update local jobs state
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
        // Keep selection updated
        setSelectedJob(updatedJob);
        if (updatedJob.email) {
          setRecipientEmail(updatedJob.email);
          alert(`Success! Found and extracted direct company contact: ${updatedJob.email}`);
        } else {
          alert('Successfully scraped corporate site but no contact emails were found. You can still input one manually.');
        }
      } else {
        const data = await res.json();
        alert('Email extraction failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      alert('Error extracting company email: ' + err.message);
    } finally {
      setExtractingEmail(false);
    }
  };

  // AI Regenerate Pitch
  const handleRegenerateAIPitch = async () => {
    if (!selectedJob) return;
    setGeneratingPitch(true);
    setPitchDraft('Regenerating highly tailored AI email pitch using Gemini...');
    try {
      const res = await fetch(`${API_BASE}/jobs/${selectedJob.id}/pitch`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPitchDraft(data.pitch);
      } else {
        setPitchDraft('Failed to generate pitch. Ensure settings have a valid Gemini Key or SMTP credentials.');
      }
    } catch (err) {
      setPitchDraft('Failed: ' + err.message);
    } finally {
      setGeneratingPitch(false);
    }
  };

  // Save changes to the pitch draft locally
  const handleUpdateJobAction = async (status, customizedPitch = pitchDraft) => {
    if (!selectedJob) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${selectedJob.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, customized_pitch: customizedPitch })
      });
      if (res.ok) {
        fetchStats();
        fetchJobsList(jobFilter);
      }
    } catch (err) {
      console.error('Error updating job status:', err);
    }
  };

  // Copy customized pitch to clipboard and open Application Link in new tab
  const handleCopyAndOpenURL = () => {
    if (!selectedJob) return;
    navigator.clipboard.writeText(pitchDraft);
    
    // Open target job listing URL
    window.open(selectedJob.url, '_blank');

    // Automatically transition to 'applied' status
    handleUpdateJobAction('applied', pitchDraft);
    alert('Pitch draft copied to clipboard! Opening job application portal in a new tab.');
  };

  // Send Email (SMTP Outreach)
  const handleSendEmailOutreach = async () => {
    if (!selectedJob || !recipientEmail) {
      alert('Please specify a recipient email address.');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${selectedJob.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          subject: emailSubject,
          body: pitchDraft
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Email successfully sent directly to: ' + recipientEmail);
        fetchStats();
        fetchJobsList(jobFilter);
        fetchLogs();
      } else {
        alert('Failed to send email: ' + (data.error || 'SMTP Connection Error'));
      }
    } catch (err) {
      alert('Error sending outreach email: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
        fetchStats();
      }
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test SMTP connection
  const handleTestSMTP = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/settings/test-smtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setSmtpTestResult(data);
    } catch (err) {
      setSmtpTestResult({ success: false, error: err.message });
    } finally {
      setSmtpTesting(false);
    }
  };

  // Filter logs for History search
  const filteredLogs = logs.filter(log => {
    const query = historySearch.toLowerCase();
    return (
      (log.recipient_email && log.recipient_email.toLowerCase().includes(query)) ||
      (log.title && log.title.toLowerCase().includes(query)) ||
      (log.company && log.company.toLowerCase().includes(query)) ||
      (log.subject && log.subject.toLowerCase().includes(query))
    );
  });

  // Paginated B2B leads calculations
  const startIndex = (b2bCurrentPage - 1) * b2bItemsPerPage;
  const endIndex = startIndex + b2bItemsPerPage;
  const paginatedB2BLeads = b2bLeads.slice(startIndex, endIndex);
  const totalB2BPages = Math.ceil(b2bLeads.length / b2bItemsPerPage) || 1;

  // Render Auth screens
  if (authMode === 'login' || authMode === 'signup' || authMode === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(at_center_center,_rgba(138,_43,_226,_0.18)_0px,_transparent_70%)]">
        {authMode === 'verify' ? (
          <div className="glass-panel p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <h2 className="text-xl font-bold">Verifying Session...</h2>
            <p className="text-xs text-slate-400">Please wait while we secure your connection.</p>
          </div>
        ) : (
          <div className="glass-panel p-8 max-w-md w-full animate-fade-in text-left">
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-900/30">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-400 text-center">
                {authMode === 'login' 
                  ? 'Access your automated lead generator & email outreach engine' 
                  : 'Get started with your personal outreach and job application SaaS'}
              </p>
            </div>

            {authError && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-red-400 p-3 rounded-lg text-xs mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLoginSubmit : handleSignupSubmit} className="flex flex-col gap-4">
              {authMode === 'signup' && (
                <div className="form-group mb-0">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Enter your name"
                    className="form-control"
                    required
                  />
                </div>
              )}

              <div className="form-group mb-0">
                <label>Email Address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label>Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-control"
                  required
                />
              </div>

              <button type="submit" disabled={authLoading} className="btn btn-primary w-full py-3 mt-2">
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  authMode === 'login' ? 'Login' : 'Sign Up'
                )}
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-slate-400">
              {authMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <span 
                    onClick={() => { setAuthMode('signup'); setAuthError(''); }} 
                    className="text-cyan-400 font-semibold cursor-pointer hover:underline"
                  >
                    Sign Up
                  </span>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <span 
                    onClick={() => { setAuthMode('login'); setAuthError(''); }} 
                    className="text-cyan-400 font-semibold cursor-pointer hover:underline"
                  >
                    Log In
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (authMode === 'onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(at_center_center,_rgba(138,_43,_226,_0.18)_0px,_transparent_70%)]">
        <div className="glass-panel p-8 max-w-xl w-full animate-fade-in text-left">
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Set Up Your Outreach Profile
            </h2>
            <p className="text-xs text-slate-400 text-center">
              Provide your details to customize the AI pitch engine and matching filters.
            </p>
          </div>

          {authError && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-red-400 p-3 rounded-lg text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleOnboardSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label>Target Niche (e.g. Developer role)</label>
                <input
                  type="text"
                  value={onboardNiche}
                  onChange={(e) => setOnboardNiche(e.target.value)}
                  placeholder="e.g. WordPress Developer"
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group mb-0">
                <label>Target Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={onboardKeywords}
                  onChange={(e) => setOnboardKeywords(e.target.value)}
                  placeholder="React, HTML, CSS, JavaScript, Node.js"
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-group mb-0">
              <label>Portfolio URL</label>
              <input
                type="url"
                value={onboardPortfolio}
                onChange={(e) => setOnboardPortfolio(e.target.value)}
                placeholder="https://myportfolio.com"
                className="form-control"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label>GitHub Profile URL</label>
                <input
                  type="url"
                  value={onboardGithub}
                  onChange={(e) => setOnboardGithub(e.target.value)}
                  placeholder="https://github.com/username"
                  className="form-control"
                />
              </div>

              <div className="form-group mb-0">
                <label>Resume (PDF/Framer link) (Optional)</label>
                <input
                  type="url"
                  value={onboardResume}
                  onChange={(e) => setOnboardResume(e.target.value)}
                  placeholder="https://myresume.com"
                  className="form-control"
                />
              </div>
            </div>

            <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-900 mt-2 text-center">
              <p className="text-[10px] text-slate-500">
                These settings can be updated at any time in the Config Panel.
              </p>
            </div>

            <button type="submit" disabled={onboardLoading} className="btn btn-primary w-full py-3 mt-2">
              {onboardLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Complete Onboarding'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 1. Header Navigation Bar */}
      <header className="glass-panel sticky top-0 z-50 rounded-none border-t-0 border-x-0 px-8 py-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">LeadReach AI</h1>
            <p className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">Lead Gen & Automated Outreach Engine</p>
          </div>
        </div>

        {/* Server Status Indicators & Manual Fetch Trigger */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${serverOnline ? 'bg-green-400 shadow-green-900' : 'bg-red-500 shadow-red-950'} animate-pulse`} />
            <span className="text-xs font-semibold text-slate-400">
              {serverOnline ? 'Engine Online' : 'Engine Offline'}
            </span>
          </div>

          {serverOnline && (
            <div className="flex gap-2">
              <button onClick={handleTriggerFetch} disabled={loading} className="btn btn-secondary py-2 px-4 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Scan Fresh Jobs
              </button>
              <button onClick={handleRunAutomation} className="btn btn-primary py-2 px-4 text-xs">
                <Cpu className="w-3.5 h-3.5" />
                Run Full Automation
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Core View Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-8 flex gap-8">
        
        {/* Sidebar Nav Panels */}
        <aside className="w-64 flex flex-col gap-2 shrink-0">
          <div className="glass-panel p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Navigation</p>
            
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`btn btn-ghost w-full justify-start py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-violet-950/40 text-violet-300 border-l-4 border-l-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Overview Control
            </button>

            <button 
              onClick={() => { setActiveTab('leads'); fetchJobsList('pending'); }} 
              className={`btn btn-ghost w-full justify-start py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'leads' ? 'bg-violet-950/40 text-violet-300 border-l-4 border-l-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Leads Hub
              {stats.jobsCount.pending > 0 && (
                <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {stats.jobsCount.pending}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('b2b'); fetchB2BLeads(); }} 
              className={`btn btn-ghost w-full justify-start py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'b2b' ? 'bg-violet-950/40 text-violet-300 border-l-4 border-l-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Search className="w-4 h-4 mr-2" />
              B2B Leads Finder
              {b2bLeads.length > 0 && (
                <span className="ml-auto bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {b2bLeads.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('history'); fetchLogs(); }} 
              className={`btn btn-ghost w-full justify-start py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'history' ? 'bg-violet-950/40 text-violet-300 border-l-4 border-l-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <History className="w-4 h-4 mr-2" />
              Outreach History
              {logs.length > 0 && (
                <span className="ml-auto bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {logs.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('template')} 
              className={`btn btn-ghost w-full justify-start py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'template' ? 'bg-violet-950/40 text-violet-300 border-l-4 border-l-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Template Studio
            </button>

            <button 
              onClick={() => { setActiveTab('settings'); fetchSettings(); }} 
              className={`btn btn-ghost w-full justify-start py-3 px-4 rounded-lg font-medium transition-all ${activeTab === 'settings' ? 'bg-violet-950/40 text-violet-300 border-l-4 border-l-violet-500' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Config Panel
            </button>
          </div>

          {/* Quick Profile Summary Display */}
          <div className="glass-panel p-4 flex flex-col gap-3 mt-4 text-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Candidate Profile</p>
            <div className="flex flex-col gap-1.5 text-slate-300">
              <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-semibold">{user?.name || settings.sender_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Stack:</span> <span className="text-violet-300 font-semibold truncate max-w-[120px]">{settings.target_keywords}</span></div>
              <div className="border-t border-slate-800 my-1"></div>
              {settings.portfolio_url ? (
                <a href={settings.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center text-cyan-400 font-semibold hover:underline">
                  Portfolio <ExternalLink className="w-3 h-3 ml-auto text-cyan-400" />
                </a>
              ) : (
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('settings'); setTimeout(() => document.getElementById('portfolio_url')?.focus(), 150); }} 
                  className="flex items-center text-slate-500 font-semibold hover:text-cyan-400 w-full text-left"
                >
                  Portfolio: <span className="text-[10px] text-cyan-400 font-bold ml-auto hover:underline flex items-center gap-0.5">➕ Add Link</span>
                </button>
              )}
              {settings.github_url ? (
                <a href={settings.github_url} target="_blank" rel="noreferrer" className="flex items-center text-cyan-400 font-semibold hover:underline">
                  GitHub <ExternalLink className="w-3 h-3 ml-auto text-cyan-400" />
                </a>
              ) : (
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('settings'); setTimeout(() => document.getElementById('github_url')?.focus(), 150); }} 
                  className="flex items-center text-slate-500 font-semibold hover:text-cyan-400 w-full text-left"
                >
                  GitHub: <span className="text-[10px] text-cyan-400 font-bold ml-auto hover:underline flex items-center gap-0.5">➕ Add Link</span>
                </button>
              )}
              {settings.resume_url ? (
                <a href={settings.resume_url} target="_blank" rel="noreferrer" className="flex items-center text-cyan-400 font-semibold hover:underline">
                  Resume / Framer <ExternalLink className="w-3 h-3 ml-auto text-cyan-400" />
                </a>
              ) : (
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('settings'); setTimeout(() => document.getElementById('resume_url')?.focus(), 150); }} 
                  className="flex items-center text-slate-500 font-semibold hover:text-cyan-400 w-full text-left"
                >
                  Resume: <span className="text-[10px] text-cyan-400 font-bold ml-auto hover:underline flex items-center gap-0.5">➕ Add Link</span>
                </button>
              )}
              <div className="border-t border-slate-800 my-1"></div>
              <button onClick={handleLogout} className="btn btn-ghost py-1.5 px-3 text-[10px] w-full text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 font-bold mt-1">
                Log Out Session
              </button>
            </div>
          </div>

          {/* Elegant Footer Credits */}
          <div className="mt-auto pt-6 pb-2 text-[10px] text-slate-500 text-center flex flex-col gap-1 leading-relaxed">
            <p>&copy; 2026 LeadReach AI Engine.</p>
            <p>Custom Engineered for <span className="text-cyan-400 font-semibold">Ahtasham Farooq</span></p>
          </div>
        </aside>

        {/* 2. Primary Tab Panel Renderers */}
        <main className="flex-1 min-w-0">
          {!serverOnline ? (
            <div className="glass-panel p-12 text-center flex flex-col items-center gap-6 animate-fade-in">
              <AlertCircle className="w-16 h-16 text-rose-500 animate-bounce" />
              <div>
                <h3 className="text-2xl font-bold mb-2">Backend Connection Lost</h3>
                <p className="text-slate-400 max-w-md">The job fetching outreach backend service is currently offline. Please run the backend server first to start searching, drafting, and sending out automated pitches!</p>
              </div>
              <button onClick={fetchStats} className="btn btn-primary px-6">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW CONTROL */}
              {activeTab === 'dashboard' && (
                <div className="flex flex-col gap-6 animate-fade-in">
                  
                  {/* Dashboard Header Banner */}
                  <div className="glass-panel p-6 bg-gradient-to-r from-violet-950/20 to-indigo-950/20 flex justify-between items-center border-l-4 border-l-cyan-400">
                    <div>
                      <h2 className="text-2xl font-extrabold mb-1">Welcome back, Ahtasham</h2>
                      <p className="text-sm text-slate-400">Auto-Outreach engine is fully primed. You have sent <span className="text-cyan-400 font-bold">{stats.sentToday}</span> out of your <span className="text-violet-400 font-bold">{stats.dailyLimit}</span> daily cold email cap.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Remaining Today</span>
                        <span className="text-2xl font-extrabold text-cyan-400">{stats.remainingToday} Emails</span>
                      </div>
                    </div>
                  </div>

                  {/* Missing Profiles Onboarding Alert */}
                  {(!settings.portfolio_url || !settings.github_url || !settings.resume_url) && (
                    <div className="glass-panel p-4 bg-gradient-to-r from-cyan-950/20 via-slate-900/30 to-violet-950/15 border-l-4 border-l-violet-500 flex justify-between items-center text-xs gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">✨</span>
                        <div>
                          <h4 className="font-extrabold text-slate-200">Optimize Your Pitch Conversion Rate!</h4>
                          <p className="text-slate-400 mt-0.5">
                            You haven't fully linked your professional profiles. Adding your{' '}
                            {!settings.portfolio_url && <span className="text-cyan-400 font-bold">Portfolio</span>}
                            {!settings.portfolio_url && !settings.github_url && ' / '}
                            {!settings.github_url && <span className="text-cyan-400 font-bold">GitHub</span>}
                            {((!settings.portfolio_url || !settings.github_url) && !settings.resume_url) && ' / '}
                            {!settings.resume_url && <span className="text-cyan-400 font-bold">Resume</span>}{' '}
                            allows the AI Outreach engine to automatically embed them in cold email proposals to clients.
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setActiveTab('settings');
                          setTimeout(() => {
                            const firstEmpty = !settings.portfolio_url ? 'portfolio_url' : (!settings.github_url ? 'github_url' : 'resume_url');
                            document.getElementById(firstEmpty)?.focus();
                          }, 150);
                        }}
                        className="btn btn-secondary text-[11px] font-bold py-1.5 px-3 whitespace-nowrap bg-violet-600/10 border-violet-500/20 text-violet-300 hover:bg-violet-600 hover:text-white"
                      >
                        ✏️ Add Links Now
                      </button>
                    </div>
                  )}

                  {/* Widget Stat Cards grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="glass-panel p-5 flex flex-col justify-between min-h-[120px] bg-indigo-950/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Leads</span>
                        <Mail className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-extrabold text-amber-400">{stats.jobsCount.pending}</h4>
                        <p className="text-[10px] text-slate-400">Fresh jobs pending review</p>
                      </div>
                    </div>

                    <div className="glass-panel p-5 flex flex-col justify-between min-h-[120px] bg-violet-950/10">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sent (Applied)</span>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-extrabold text-emerald-400">{stats.jobsCount.applied}</h4>
                        <p className="text-[10px] text-slate-400">Successful emails & applications</p>
                      </div>
                    </div>

                    <div className="glass-panel p-5 flex flex-col justify-between min-h-[120px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outreach Limit</span>
                        <ShieldCheck className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-extrabold text-cyan-400">{stats.sentToday} / {stats.dailyLimit}</h4>
                        <p className="text-[10px] text-slate-400">Daily sends today (Up to 30)</p>
                      </div>
                    </div>

                    <div className="glass-panel p-5 flex flex-col justify-between min-h-[120px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outreach Delivery</span>
                        <TrendingUp className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-extrabold text-violet-300">{stats.successRate}%</h4>
                        <p className="text-[10px] text-slate-400">SMTP deliverability score</p>
                      </div>
                    </div>
                  </div>

                  {/* Charts & Activity Logs split panel */}
                  <div className="grid grid-cols-12 gap-6">
                    {/* Visual custom css chart */}
                    <div className="col-span-7 glass-panel p-6 flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg font-extrabold">Weekly Lead Conversion Activity</h3>
                        <p className="text-xs text-slate-400">Successfully sent email pitches over the past 7 days</p>
                      </div>
                      
                      <div className="h-44 flex items-end justify-between gap-3 border-b border-slate-800 pb-2 pt-6">
                        {stats.chartData.length === 0 ? (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-semibold">
                            No sending history logs recorded yet. Run outreach to see logs.
                          </div>
                        ) : (
                          stats.chartData.map((day, idx) => {
                            const maxVal = Math.max(...stats.chartData.map(d => d.count), 1);
                            const percentHeight = (day.count / maxVal) * 100;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                <span className="text-[10px] font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {day.count}
                                </span>
                                <div 
                                  style={{ height: `${percentHeight}%` }} 
                                  className="w-full min-h-[8px] bg-gradient-to-t from-violet-600 to-cyan-400 rounded-t-md shadow-lg shadow-violet-900/20 group-hover:from-cyan-400 group-hover:to-white transition-all duration-300"
                                />
                                <span className="text-[9px] font-semibold text-slate-500 group-hover:text-slate-300 truncate max-w-full">
                                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Quick Logs Feed widget */}
                    <div className="col-span-5 glass-panel p-6 flex flex-col gap-4">
                      <div>
                        <h3 className="text-lg font-extrabold">Recent Outreach logs</h3>
                        <p className="text-xs text-slate-400">Real-time status updates of active applications</p>
                      </div>
                      
                      <div className="flex flex-col gap-3 max-h-[190px] overflow-y-auto pr-1">
                        {logs.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs font-semibold">No recent logs available.</div>
                        ) : (
                          logs.slice(0, 4).map((log, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs border-b border-slate-900 pb-2">
                              {log.status === 'success' ? (
                                <span className="w-2 h-2 rounded-full bg-green-400 mt-1 shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-300 truncate">Pitch sent to: {log.recipient_email}</p>
                                <p className="text-[10px] text-slate-500 truncate">{log.title} at {log.company}</p>
                              </div>
                              <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                                {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LEADS & OUTREACH LISTING */}
              {activeTab === 'leads' && (
                <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-fade-in">
                  
                  {/* Left Column - Leads List */}
                  <div className="col-span-5 glass-panel flex flex-col overflow-hidden h-full">
                    {/* Header tabs filters */}
                    <div className="p-4 border-b border-slate-900 flex justify-between items-center shrink-0">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Leads Hub</h3>
                      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                        <button 
                          onClick={() => setJobFilter('pending')} 
                          className={`px-3 py-1.5 rounded-md font-semibold ${jobFilter === 'pending' ? 'bg-violet-950/70 text-violet-300 font-bold' : 'text-slate-400'}`}
                        >
                          New ({stats.jobsCount.pending})
                        </button>
                        <button 
                          onClick={() => setJobFilter('applied')} 
                          className={`px-3 py-1.5 rounded-md font-semibold ${jobFilter === 'applied' ? 'bg-violet-950/70 text-violet-300 font-bold' : 'text-slate-400'}`}
                        >
                          Applied ({stats.jobsCount.applied})
                        </button>
                        <button 
                          onClick={() => setJobFilter('skipped')} 
                          className={`px-3 py-1.5 rounded-md font-semibold ${jobFilter === 'skipped' ? 'bg-violet-950/70 text-violet-300 font-bold' : 'text-slate-400'}`}
                        >
                          Skipped
                        </button>
                      </div>
                    </div>

                    {/* Jobs card listings */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                          <span className="text-xs font-semibold">Loading job listings...</span>
                        </div>
                      ) : jobs.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-xs font-semibold flex flex-col items-center gap-3">
                          <Briefcase className="w-10 h-10 text-slate-600" />
                          <span>No jobs found matching your stack. Try clicking "Scan Fresh Jobs" at the top to search.</span>
                        </div>
                      ) : (
                        jobs.map((job) => (
                          <div 
                            key={job.id} 
                            onClick={() => handleSelectJob(job)}
                            className={`glass-card p-4 cursor-pointer text-left transition-all ${selectedJob?.id === job.id ? 'border-violet-500 bg-violet-950/15 shadow-md shadow-violet-950/20' : 'hover:bg-slate-900/10'}`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className="font-bold text-sm text-slate-200 line-clamp-1 flex-1">{job.title}</h4>
                              <span className={`badge text-[9px] shrink-0 ${job.status === 'applied' ? 'badge-applied' : job.status === 'skipped' ? 'badge-skipped' : 'badge-pending'}`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-400">
                              <span className="font-semibold text-cyan-400/90">{job.company}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">{job.platform}</span>
                            </div>
                            
                            <div className="border-t border-slate-900/50 mt-2.5 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                              <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-1" /> {new Date(job.posted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              {job.description.includes('@') && <span className="flex items-center text-cyan-400/80"><Mail className="w-2.5 h-2.5 mr-1" /> Auto-Email ready</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column - Detail & Actions Panel */}
                  <div className="col-span-7 glass-panel flex flex-col overflow-hidden h-full">
                    {selectedJob ? (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        
                        {/* Selected Job Title details header */}
                        <div className="p-5 border-b border-slate-900 shrink-0">
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <div>
                              <span className="text-[9px] bg-violet-950/50 text-violet-300 border border-violet-800/40 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedJob.platform} Listing</span>
                              <h2 className="text-xl font-extrabold text-white mt-1.5">{selectedJob.title}</h2>
                              <p className="text-xs font-semibold text-cyan-400">{selectedJob.company}</p>
                            </div>
                            
                            <a href={selectedJob.url} target="_blank" rel="noreferrer" className="btn btn-secondary py-2 px-3 text-xs shrink-0">
                              Open Source Post <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Scrollable details tab */}
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                          
                          {/* Pitch Generator Section */}
                          <div className="glass-panel p-5 bg-violet-950/5 border-violet-950/30 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-violet-400" />
                                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">Outreach Proposal Pitch</h3>
                              </div>
                              <button 
                                onClick={handleRegenerateAIPitch} 
                                disabled={generatingPitch}
                                className="btn btn-ghost py-1.5 px-3 text-xs text-cyan-400 hover:text-cyan-300"
                              >
                                <RefreshCw className={`w-3 h-3 mr-1 ${generatingPitch ? 'animate-spin' : ''}`} />
                                Regenerate AI Pitch
                              </button>
                            </div>

                            {/* Email configuration fields */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="form-group mb-0">
                                <label className="flex justify-between items-center w-full">
                                  <span>Recipient Email Address</span>
                                  {selectedJob.company_url && (
                                    <span className="text-[9px] text-cyan-400 font-bold">
                                      Site: {selectedJob.company_url.replace(/^https?:\/\/(www\.)?/, '')}
                                    </span>
                                  )}
                                </label>
                                <div className="flex gap-2 items-center">
                                  <input 
                                    type="text" 
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    placeholder="client@company.com (or enter manually)"
                                    className="form-control py-2 px-3 text-xs flex-1"
                                  />
                                  {!recipientEmail && (
                                    <button
                                      onClick={() => handleExtractJobEmail(selectedJob.id)}
                                      disabled={extractingEmail}
                                      className="btn btn-primary py-2 px-3 text-xs font-bold shrink-0 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 border-none shadow-md shadow-violet-950/20"
                                      type="button"
                                    >
                                      {extractingEmail ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        "🔍 Find Direct Email"
                                      )}
                                    </button>
                                  )}
                                </div>
                                {extractingEmail && (
                                  <span className="text-[10px] text-cyan-400 font-semibold animate-pulse block mt-1.5">
                                    ✨ Scanning corporate domain for direct contacts...
                                  </span>
                                )}
                              </div>
                              <div className="form-group mb-0">
                                <label>Outreach Subject Line</label>
                                <input 
                                  type="text" 
                                  value={emailSubject}
                                  onChange={(e) => setEmailSubject(e.target.value)}
                                  className="form-control py-2 px-3 text-xs"
                                />
                              </div>
                            </div>

                            {/* Pitch text editor */}
                            <div className="form-group mb-0">
                              <textarea
                                value={pitchDraft}
                                onChange={(e) => setPitchDraft(e.target.value)}
                                disabled={generatingPitch}
                                className="form-control text-xs min-h-[180px] font-mono leading-relaxed bg-slate-950/50"
                                placeholder="Generating email draft proposal..."
                              />
                            </div>

                            {/* Execution triggers */}
                            <div className="flex gap-3 justify-end pt-2 border-t border-slate-900">
                              <button 
                                onClick={() => handleUpdateJobAction('skipped')} 
                                className="btn btn-ghost py-2 px-4 text-xs"
                              >
                                Skip Lead
                              </button>
                              <button 
                                onClick={() => handleUpdateJobAction('rejected')} 
                                className="btn btn-danger py-2 px-4 text-xs"
                              >
                                Reject
                              </button>

                              <button 
                                onClick={handleCopyAndOpenURL} 
                                className="btn btn-secondary py-2 px-4 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Pitch & Open URL
                              </button>

                              {recipientEmail && (
                                <button 
                                  onClick={handleSendEmailOutreach} 
                                  disabled={sendingEmail}
                                  className="btn btn-primary py-2 px-4 text-xs"
                                >
                                  <Send className={`w-3.5 h-3.5 ${sendingEmail ? 'animate-spin' : ''}`} />
                                  Send Direct Email
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Raw Job Description info display */}
                          <div>
                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-cyan-400" />
                              Job Posting Details
                            </h3>
                            <div className="text-xs text-slate-300 leading-relaxed font-body whitespace-pre-line bg-black/20 p-4 rounded-xl border border-slate-900 max-h-[300px] overflow-y-auto">
                              {selectedJob.description}
                            </div>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-slate-500 py-32">
                        <Mail className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
                        <h4 className="text-lg font-bold">Select a job lead from the left</h4>
                        <p className="text-xs max-w-xs text-center text-slate-600 mt-1">Select a job from the list to view its description, customize its pitch with Gemini, and send out outreach emails!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: OUTREACH HISTORY LOGS (DEDICATED ADVANCED VIEW AS REQUESTED!) */}
              {activeTab === 'history' && (
                <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-fade-in">
                  
                  {/* Left Column - History Logs List */}
                  <div className="col-span-5 glass-panel flex flex-col overflow-hidden h-full">
                    {/* Search bar header */}
                    <div className="p-4 border-b border-slate-900 flex flex-col gap-3 shrink-0">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <History className="w-4 h-4 text-cyan-400" />
                        Outreach History Logs
                      </h3>
                      <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 px-3 py-2 text-xs gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <input 
                          type="text" 
                          value={historySearch} 
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search sent emails, company, job..."
                          className="bg-transparent border-0 outline-none w-full text-slate-200"
                        />
                      </div>
                    </div>

                    {/* History logs card list */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-xs font-semibold flex flex-col items-center gap-3">
                          <FileCheck className="w-10 h-10 text-slate-600" />
                          <span>No outreach records matched your search.</span>
                        </div>
                      ) : (
                        filteredLogs.map((log) => (
                          <div 
                            key={log.id} 
                            onClick={() => setSelectedHistoryLog(log)}
                            className={`glass-card p-4 cursor-pointer text-left transition-all ${selectedHistoryLog?.id === log.id ? 'border-violet-500 bg-violet-950/15' : 'hover:bg-slate-900/10'}`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className="font-bold text-sm text-slate-200 line-clamp-1 flex-1">{log.title || 'Outreach Email'}</h4>
                              <span className={`badge text-[9px] shrink-0 ${log.status === 'success' ? 'badge-applied' : 'badge-rejected'}`}>
                                {log.status === 'success' ? 'Sent' : 'Failed'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mb-2 truncate">
                              To: <span className="text-cyan-400 font-semibold">{log.recipient_email}</span>
                            </div>
                            
                            <div className="border-t border-slate-900/50 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-semibold">
                              <span className="text-violet-300 font-semibold">{log.company}</span>
                              <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-1" /> {new Date(log.sent_at).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column - History Details Inspector */}
                  <div className="col-span-7 glass-panel flex flex-col overflow-hidden h-full">
                    {selectedHistoryLog ? (
                      <div className="flex-grow flex flex-col overflow-hidden">
                        
                        {/* Header details block */}
                        <div className="p-5 border-b border-slate-900 shrink-0">
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <div>
                              <span className={`badge text-[9px] font-bold ${selectedHistoryLog.status === 'success' ? 'badge-applied' : 'badge-rejected'}`}>
                                SMTP Outreach {selectedHistoryLog.status === 'success' ? 'SUCCESS' : 'FAILED'}
                              </span>
                              <h2 className="text-xl font-extrabold text-white mt-1.5">{selectedHistoryLog.title || 'Custom Email Pitch'}</h2>
                              <p className="text-xs font-semibold text-cyan-400">{selectedHistoryLog.company || 'Direct Contact'}</p>
                            </div>
                            
                            {selectedHistoryLog.url && (
                              <a href={selectedHistoryLog.url} target="_blank" rel="noreferrer" className="btn btn-secondary py-2 px-3 text-xs shrink-0">
                                View Job Post <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Scrollable logs details pane */}
                        <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-6">
                          
                          {/* Sending status and SMTP errors display */}
                          {selectedHistoryLog.status === 'failed' && (
                            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-3 text-xs text-rose-300">
                              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-bold mb-0.5 text-rose-400">SMTP Send Failure</h4>
                                <p>Reason: {selectedHistoryLog.error_message}</p>
                                <p className="text-[10px] text-slate-500 mt-1">Check your SMTP port, login credentials, and daily email send limit in the config panel.</p>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5 text-xs text-slate-400 border-b border-slate-900 pb-4">
                            <div><span className="font-bold text-slate-500">Recipient Email:</span> <span className="text-slate-200 font-semibold">{selectedHistoryLog.recipient_email}</span></div>
                            <div><span className="font-bold text-slate-500">Subject Line:</span> <span className="text-slate-200 font-semibold">{selectedHistoryLog.subject}</span></div>
                            <div><span className="font-bold text-slate-500">Date/Time Sent:</span> <span className="text-slate-200 font-semibold">{new Date(selectedHistoryLog.sent_at).toLocaleString()}</span></div>
                          </div>

                          {/* EXACT BODY SENT */}
                          <div className="flex-1 flex flex-col">
                            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-violet-400" />
                              Exact Pitch Body Sent
                            </h3>
                            <div className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950/60 p-5 rounded-xl border border-slate-900 whitespace-pre-line overflow-y-auto flex-grow max-h-[450px]">
                              {selectedHistoryLog.body}
                            </div>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-slate-500 py-32">
                        <History className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
                        <h4 className="text-lg font-bold">Select a sent log from the left</h4>
                        <p className="text-xs text-center text-slate-600 mt-1">Select any outreach email history log to inspect the recipient, subject line, exact pitch body sent, or debug SMTP delivery errors.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: B2B LOCAL LEADS FINDER & DEEP SCRAPER */}
              {activeTab === 'b2b' && (
                <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-fade-in text-left">
                  
                  {/* Left Column - Leads Finder & List */}
                  <div className="col-span-5 glass-panel flex flex-col overflow-hidden h-full">
                    
                    {/* Search & Bulk Scrape Panel */}
                    <div className="p-4 border-b border-slate-900 flex flex-col gap-3 shrink-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Local Leads Search</h3>
                        {b2bLeads.length > 0 && (
                          <button
                            onClick={handleB2BScrapeBatch}
                            disabled={b2bScrapingBatch}
                            className="btn btn-secondary py-1.5 px-3 text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${b2bScrapingBatch ? 'animate-spin' : ''}`} />
                            Bulk Scrape Sites
                          </button>
                        )}
                      </div>

                      <form onSubmit={handleB2BSearch} className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2">
                          {/* Niche Selection */}
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Business Niche</label>
                            <select
                              value={isCustomNiche ? 'custom' : b2bNiche}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                  setIsCustomNiche(true);
                                  setB2bNiche(customNiche || '');
                                } else {
                                  setIsCustomNiche(false);
                                  setB2bNiche(val);
                                }
                              }}
                              className="form-control py-2 px-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-lg focus:border-violet-500"
                              style={{ colorScheme: 'dark' }}
                            >
                              {POPULAR_NICHES.map((n) => (
                                <option key={n.value} value={n.value} className="bg-slate-900 text-white text-xs">
                                  {n.label}
                                </option>
                              ))}
                              <option value="custom" className="bg-slate-900 text-cyan-400 font-bold text-xs">
                                ✨ Custom Niche...
                              </option>
                            </select>

                            {isCustomNiche && (
                              <input
                                type="text"
                                value={customNiche}
                                onChange={(e) => {
                                  setCustomNiche(e.target.value);
                                  setB2bNiche(e.target.value);
                                }}
                                placeholder="Enter custom niche (e.g. Dentist)"
                                className="form-control py-1.5 px-3 text-xs mt-1.5 bg-slate-950 border border-violet-500/50"
                                required
                              />
                            )}
                          </div>

                          {/* County/Location Selection */}
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Target County / Region</label>
                            <select
                              value={isCustomLocation ? 'custom' : b2bLocation}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'custom') {
                                  setIsCustomLocation(true);
                                  setB2bLocation(customLocation || '');
                                } else {
                                  setIsCustomLocation(false);
                                  setB2bLocation(val);
                                }
                              }}
                              className="form-control py-2 px-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-lg focus:border-violet-500"
                              style={{ colorScheme: 'dark' }}
                            >
                              {POPULAR_COUNTIES.map((c) => (
                                <option key={c.value} value={c.value} className="bg-slate-900 text-white text-xs">
                                  {c.label}
                                </option>
                              ))}
                              <option value="custom" className="bg-slate-900 text-cyan-400 font-bold text-xs">
                                ✨ Custom Location...
                              </option>
                            </select>

                            {isCustomLocation && (
                              <input
                                type="text"
                                value={customLocation}
                                onChange={(e) => {
                                  setCustomLocation(e.target.value);
                                  setB2bLocation(e.target.value);
                                }}
                                placeholder="Enter custom county (e.g. Cook County, IL)"
                                className="form-control py-1.5 px-3 text-xs mt-1.5 bg-slate-950 border border-violet-500/50"
                                required
                              />
                            )}
                          </div>

                          {/* Target Lead Source Selection */}
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Target Lead Channel</label>
                            <select
                              value={b2bSource}
                              onChange={(e) => setB2bSource(e.target.value)}
                              className="form-control py-2 px-3 text-xs bg-slate-950 border border-slate-800 text-white rounded-lg focus:border-violet-500"
                              style={{ colorScheme: 'dark' }}
                            >
                              <option value="google" className="bg-slate-900 text-white text-xs">🔍 Google Maps & Search (Local B2B)</option>
                              <option value="yelp" className="bg-slate-900 text-white text-xs">⭐ Yelp Directory (Local Services)</option>
                              <option value="indeed" className="bg-slate-900 text-white text-xs">💼 Indeed Jobs (Active Hiring Budgets)</option>
                              <option value="clutch" className="bg-slate-900 text-white text-xs">🚀 Clutch.co Profiles (Agencies & B2B)</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={b2bSearching}
                          className="btn btn-primary py-2 px-4 text-xs font-bold w-full bg-gradient-to-r from-violet-600 to-indigo-600 border-none rounded-lg mt-1 h-[36px] flex items-center justify-center align-middle"
                        >
                          {b2bSearching ? 'Searching active local leads...' : 'Search B2B Leads'}
                        </button>
                      </form>

                      {/* Bulk Scraping progress indicator */}
                      {b2bScrapingBatch && (
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[10px]">
                          <div className="flex justify-between font-semibold text-slate-400 mb-1">
                            <span>Deep Scraping Emails & Contacts...</span>
                            <span>{b2bScrapingProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              style={{ width: `${b2bScrapingProgress}%` }}
                              className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full transition-all duration-300"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Leads listings card */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {b2bSearching ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
                          <span className="text-xs font-semibold">Scanning local active businesses...</span>
                        </div>
                      ) : b2bLeads.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-xs font-semibold flex flex-col items-center gap-3">
                          <Search className="w-10 h-10 text-slate-600" />
                          <span>No B2B leads loaded. Search a niche and location (e.g. "Roofing", "Chicago") above to find validated businesses.</span>
                        </div>
                      ) : (
                        paginatedB2BLeads.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => handleSelectB2BLead(lead)}
                            className={`glass-card p-4 cursor-pointer text-left transition-all ${selectedB2BLead?.id === lead.id ? 'border-cyan-500 bg-cyan-950/10 shadow-md shadow-cyan-950/10' : 'hover:bg-slate-900/10'}`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className="font-bold text-sm text-slate-200 line-clamp-1 flex-1">{lead.name}</h4>
                              <span className={`badge text-[9px] shrink-0 uppercase ${lead.outreach_status === 'emailed' ? 'badge-applied' : lead.outreach_status === 'skipped' ? 'badge-skipped' : 'badge-pending'}`}>
                                {lead.outreach_status || 'pending'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                              <span className="text-amber-400 font-bold flex items-center">
                                ★ {lead.rating?.toFixed(1) || '0.0'} 
                              </span>
                              <span className="text-slate-500">({lead.reviews_count || 0} reviews)</span>
                              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800 capitalize truncate max-w-[120px]">
                                {lead.niche}
                              </span>
                            </div>

                            {/* Optimization & Design Audit Badges */}
                            <div className="mb-2">
                              {lead.needs_optimization === 1 && (
                                !lead.website ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-rose-400 font-extrabold bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded select-none">
                                    ⚠️ Lacks Website
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded select-none" title={lead.optimization_reasons}>
                                    ⚠️ Outdated Design ({lead.optimization_reasons ? lead.optimization_reasons.split('|').length : 1} issue{lead.optimization_reasons && lead.optimization_reasons.split('|').length > 1 ? 's' : ''})
                                  </span>
                                )
                              )}
                            </div>

                            <div className="border-t border-slate-900/50 mt-2.5 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                              <div className="flex gap-2">
                                {lead.website ? (
                                  <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center text-cyan-400/80 hover:underline">
                                    <ExternalLink className="w-2.5 h-2.5 mr-0.5" /> Website
                                  </a>
                                ) : (
                                  <span className="text-slate-600 line-through">No Website</span>
                                )}
                              </div>
                              
                              <div>
                                {lead.email ? (
                                  <span className="flex items-center text-emerald-400/90 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                    <Mail className="w-2.5 h-2.5 mr-0.5" /> {lead.email}
                                  </span>
                                ) : lead.website ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleB2BScrape(lead);
                                    }}
                                    className="text-[9px] text-cyan-400 bg-cyan-950/30 border border-cyan-800/40 px-1.5 py-0.5 rounded hover:bg-cyan-950 font-bold"
                                  >
                                    Scrape Email
                                  </button>
                                ) : (
                                  <span className="text-slate-600 text-[9px]">No Contact Email</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {b2bLeads.length > b2bItemsPerPage && (
                      <div className="p-3 border-t border-slate-900 flex items-center justify-between shrink-0 bg-slate-950/40 backdrop-blur-sm rounded-b-xl">
                        <button
                          type="button"
                          onClick={() => setB2bCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={b2bCurrentPage === 1}
                          className="btn btn-ghost py-1.5 px-3 text-[10px] font-bold rounded-lg border border-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white"
                        >
                          Prev
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {(() => {
                            const pages = [];
                            if (totalB2BPages <= 5) {
                              for (let i = 1; i <= totalB2BPages; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              if (b2bCurrentPage > 3) pages.push('...');
                              const start = Math.max(2, b2bCurrentPage - 1);
                              const end = Math.min(totalB2BPages - 1, b2bCurrentPage + 1);
                              for (let i = start; i <= end; i++) pages.push(i);
                              if (b2bCurrentPage < totalB2BPages - 2) pages.push('...');
                              pages.push(totalB2BPages);
                            }
                            return pages.map((p, idx) => {
                              if (p === '...') return <span key={`ellipsis-${idx}`} className="text-slate-600 text-[10px] px-1 select-none">...</span>;
                              return (
                                <button
                                  type="button"
                                  key={p}
                                  onClick={() => setB2bCurrentPage(p)}
                                  className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                                    b2bCurrentPage === p
                                      ? 'bg-violet-600 text-white font-extrabold shadow shadow-violet-900/30'
                                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                                  }`}
                                >
                                  {p}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        <button
                          type="button"
                          onClick={() => setB2bCurrentPage(prev => Math.min(prev + 1, totalB2BPages))}
                          disabled={b2bCurrentPage === totalB2BPages}
                          className="btn btn-ghost py-1.5 px-3 text-[10px] font-bold rounded-lg border border-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-400 hover:text-white"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column - B2B Lead Outreach Details */}
                  <div className="col-span-7 glass-panel flex flex-col overflow-hidden h-full">
                    {selectedB2BLead ? (
                      <div className="flex-grow flex flex-col overflow-hidden h-full">
                        
                        {/* Header metadata details */}
                        <div className="p-5 border-b border-slate-900 shrink-0">
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] bg-cyan-950/50 text-cyan-300 border border-cyan-800/40 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {selectedB2BLead.location} Business
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">• Active Verified Lead</span>
                              </div>
                              <h2 className="text-xl font-extrabold text-white mt-1.5">{selectedB2BLead.name}</h2>
                              <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 capitalize">
                                {selectedB2BLead.niche} Lead 
                                {selectedB2BLead.phone && <span className="text-slate-500">| {selectedB2BLead.phone}</span>}
                              </p>
                            </div>
                            
                            {selectedB2BLead.website && (
                              <a href={selectedB2BLead.website} target="_blank" rel="noreferrer" className="btn btn-secondary py-2 px-3 text-xs shrink-0 bg-slate-900 border-slate-800 hover:bg-slate-800">
                                Open Site <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Scrollable details tab */}
                        <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-6">
                          
                          {/* Contact Cards Info block */}
                          <div className="grid grid-cols-3 gap-4 text-left">
                            <div className="glass-panel p-4 flex flex-col justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Scraped Email</span>
                              {selectedB2BLead.email ? (
                                <span className="text-sm font-extrabold text-emerald-400 select-all truncate">{selectedB2BLead.email}</span>
                              ) : (
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-xs text-slate-500 italic">No Email</span>
                                  {selectedB2BLead.website && (
                                    <button 
                                      onClick={() => handleB2BScrape(selectedB2BLead)}
                                      className="btn btn-secondary py-0.5 px-2 text-[9px] font-bold border-cyan-800 text-cyan-400"
                                    >
                                      Scrape
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="glass-panel p-4 flex flex-col justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">WhatsApp</span>
                              {selectedB2BLead.whatsapp ? (
                                <span className="text-sm font-extrabold text-emerald-400 select-all truncate">{selectedB2BLead.whatsapp}</span>
                              ) : (
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-xs text-slate-500 italic">No WA Link</span>
                                  {selectedB2BLead.website && (
                                    <button 
                                      onClick={() => handleB2BScrape(selectedB2BLead)}
                                      className="btn btn-secondary py-0.5 px-2 text-[9px] font-bold border-cyan-800 text-cyan-400"
                                    >
                                      Scrape
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="glass-panel p-4 flex flex-col justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Social Profiles</span>
                              <div className="flex gap-1.5 items-center text-xs">
                                {selectedB2BLead.instagram_url ? (
                                  <>
                                    <a href={selectedB2BLead.instagram_url} target="_blank" rel="noreferrer" className="text-pink-400 font-bold bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded hover:bg-pink-500/20 truncate text-[10px]">
                                      Instagram
                                    </a>
                                    <button
                                      onClick={() => window.open(selectedB2BLead.instagram_url, "_blank")}
                                      className="btn btn-secondary py-0.5 px-2 text-[9px] font-bold border-pink-800 text-pink-400"
                                      title="Open Instagram profile"
                                    >
                                      DM
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">No IG</span>
                                )}
                                {selectedB2BLead.facebook_url ? (
                                  <a href={selectedB2BLead.facebook_url} target="_blank" rel="noreferrer" className="text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded hover:bg-blue-500/20 truncate text-[10px]">
                                    Facebook
                                  </a>
                                ) : (
                                  <span className="text-slate-600 text-[10px]">No FB</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Website Audit scorecard */}
                          <div className="glass-panel p-5 bg-slate-950/30 border-slate-900 flex flex-col gap-3 text-left">
                            <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                              <Search className="w-4 h-4 text-cyan-400" />
                              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">Website Design & Mobile Audit</h3>
                            </div>
                            
                            {selectedB2BLead.needs_optimization === 1 ? (
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg text-xs font-bold">
                                  <span className="text-base">⚠️</span>
                                  <div>
                                    <p className="text-white font-extrabold">Optimization Required / High-Value Target</p>
                                    <p className="text-slate-400 font-normal mt-0.5">This active local business has website or mobile design optimization opportunities.</p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col gap-2.5">
                                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Identified Design Flaws:</span>
                                  <div className="flex flex-col gap-2">
                                    {selectedB2BLead.optimization_reasons ? (
                                      selectedB2BLead.optimization_reasons.split('|').map((reason, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                                          <span className="text-rose-500 shrink-0 select-none">❌</span>
                                          <span>{reason.trim()}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                                        <span className="text-rose-500 shrink-0 select-none">❌</span>
                                        <span>Website layout requires structure modernization and responsive adjustments</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg text-xs font-bold">
                                <span className="text-base">✓</span>
                                <div>
                                  <p className="text-white font-extrabold">Website is Modern & Optimized</p>
                                  <p className="text-slate-400 font-normal mt-0.5">No critical outdated markers detected. Standard lower-priority pitch profile.</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* AI Outreach Pitch generator */}
                          <div className="glass-panel p-5 bg-violet-950/5 border-violet-950/30 flex flex-col gap-4 text-left">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-violet-400" />
                                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">Customized AI Outreach Pitch</h3>
                              </div>
                              <button 
                                onClick={handleRegenerateB2BAI} 
                                disabled={b2bGeneratingPitch}
                                className="btn btn-ghost py-1.5 px-3 text-xs text-cyan-400 hover:text-cyan-300"
                              >
                                <RefreshCw className={`w-3 h-3 mr-1 ${b2bGeneratingPitch ? 'animate-spin' : ''}`} />
                                Regenerate AI Pitch
                              </button>
                            </div>

                            {/* Email configuration fields */}
                            <div className="grid grid-cols-3 gap-3 text-xs text-left">
                              <div className="form-group mb-0">
                                <label>Recipient Email Address</label>
                                <input 
                                  type="text" 
                                  value={selectedB2BLead.email || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedB2BLead(prev => prev ? { ...prev, email: val } : null);
                                  }}
                                  placeholder="client@business.com (or enter manually)"
                                  className="form-control py-2 px-3 text-xs"
                                />
                              </div>
                              <div className="form-group mb-0">
                                <label>WhatsApp Number</label>
                                <input 
                                  type="text" 
                                  value={selectedB2BLead.whatsapp || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedB2BLead(prev => prev ? { ...prev, whatsapp: val } : null);
                                  }}
                                  placeholder="+923XXXXXXXXX (or enter manually)"
                                  className="form-control py-2 px-3 text-xs"
                                />
                              </div>
                              <div className="form-group mb-0">
                                <label>Outreach Subject Line</label>
                                <input 
                                  type="text" 
                                  value={`Website & App Optimization for ${selectedB2BLead.name}`}
                                  readOnly
                                  className="form-control py-2 px-3 text-xs bg-slate-900 border-slate-800 text-slate-400 select-all"
                                />
                              </div>
                            </div>

                            {/* Pitch text editor */}
                            <div className="form-group mb-0 text-left">
                              <textarea
                                value={b2bPitchDraft}
                                onChange={(e) => setB2bPitchDraft(e.target.value)}
                                disabled={b2bGeneratingPitch}
                                className="form-control text-xs min-h-[220px] font-mono leading-relaxed bg-slate-950/50"
                                placeholder="Generating personalized business optimization proposal with Gemini..."
                              />
                            </div>

                            {/* Execution triggers */}
                            <div className="flex gap-3 justify-end pt-2 border-t border-slate-900">
                              <button 
                                onClick={() => handleB2BUpdateAction('skipped')} 
                                className="btn btn-ghost py-2 px-4 text-xs"
                              >
                                Skip Lead
                              </button>

                              <button 
                                onClick={() => handleB2BUpdateAction('rejected')} 
                                className="btn btn-danger py-2 px-4 text-xs"
                              >
                                Reject
                              </button>

                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(b2bPitchDraft);
                                  alert('B2B cold pitch draft copied to clipboard!');
                                }} 
                                className="btn btn-secondary py-2 px-4 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Pitch
                              </button>

                              {selectedB2BLead.whatsapp ? (
                                <button 
                                  onClick={() => {
                                    handleB2BUpdateAction('contacted_wa');
                                    let cleanWa = selectedB2BLead.whatsapp.replace(/[^0-9]/g, '');
                                    // Auto-normalize local Pakistani numbers starting with 03xx to 923xx for WhatsApp API compatibility
                                    if (cleanWa.startsWith('03') && cleanWa.length === 11) {
                                      cleanWa = '92' + cleanWa.substring(1);
                                    }
                                    const waProtocolUrl = `whatsapp://send?phone=${cleanWa}&text=${encodeURIComponent(b2bPitchDraft)}`;
                                    window.location.href = waProtocolUrl;
                                  }}
                                  className="btn py-2 px-4 text-xs bg-emerald-600 hover:bg-emerald-500 border-none text-white font-bold rounded-lg flex items-center gap-1.5"
                                >
                                  💬 Chat WhatsApp
                                </button>
                              ) : (
                                <button 
                                  disabled
                                  className="btn py-2 px-4 text-xs bg-emerald-950/20 text-emerald-700/50 border-emerald-950/30 opacity-50 cursor-not-allowed font-bold rounded-lg flex items-center gap-1.5"
                                  title="Please scrape or manually input a WhatsApp number"
                                >
                                  💬 Chat WhatsApp
                                </button>
                              )}

                              {selectedB2BLead.email ? (
                                <button 
                                  onClick={handleSendB2BEmail} 
                                  disabled={b2bSendingEmail}
                                  className="btn btn-primary py-2 px-4 text-xs"
                                >
                                  <Send className={`w-3.5 h-3.5 ${b2bSendingEmail ? 'animate-spin' : ''}`} />
                                  Send Direct Email
                                </button>
                              ) : (
                                <button 
                                  disabled
                                  className="btn btn-primary py-2 px-4 text-xs opacity-50 cursor-not-allowed"
                                  title="Please scrape or manually input a recipient email address"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  Send Direct Email
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center text-slate-500 py-32">
                        <Search className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
                        <h4 className="text-lg font-bold">Select a B2B Business Lead</h4>
                        <p className="text-xs max-w-xs text-center text-slate-600 mt-1">Select a business from the search results on the left to inspect extracted web contacts, generate custom Gemini pitching campaigns, and trigger outreach!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: TEMPLATE STUDIO */}
              {activeTab === 'template' && (
                <div className="glass-panel p-8 flex flex-col gap-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-extrabold mb-1">Cold Outreach Template Studio</h2>
                    <p className="text-xs text-slate-400">Customize the baseline fallback email template. This pitch is used when no Gemini key is active or if Gemini fails.</p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                    <div className="form-group mb-0">
                      <textarea
                        value={settings.default_template}
                        onChange={(e) => setSettings({ ...settings, default_template: e.target.value })}
                        className="form-control font-mono text-xs min-h-[300px] leading-relaxed"
                        placeholder="Draft your baseline outreach pitch..."
                      />
                    </div>

                    {/* Placeholder Cheatsheet Guide */}
                    <div className="p-4 rounded-xl border border-slate-900 bg-slate-950/20 text-xs">
                      <h4 className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-2 flex items-center"><Code className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Placeholders Guide</h4>
                      <p className="text-slate-400 mb-2">You can use these tags anywhere in the template. The app will automatically populate them with fresh lead details:</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-300">
                        <div><code className="text-cyan-400 font-bold font-mono">{`{job_title}`}</code>: The exact title of the job listing.</div>
                        <div><code className="text-cyan-400 font-bold font-mono">{`{company}`}</code>: The hiring company name.</div>
                        <div><code className="text-cyan-400 font-bold font-mono">{`{platform}`}</code>: The job board (e.g. RemoteOK, WWR).</div>
                        <div><code className="text-cyan-400 font-bold font-mono">{`{sender_name}`}</code>: Your name (Ahtasham Farooq).</div>
                        <div><code className="text-cyan-400 font-bold font-mono">{`{portfolio_url}`}</code>: Your online portfolio link.</div>
                        <div><code className="text-cyan-400 font-bold font-mono">{`{resume_url}`}</code>: Your resume/Framer website URL.</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 shrink-0">
                      <button type="submit" disabled={loading} className="btn btn-primary px-6">
                        Save Template Settings
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: SYSTEM CONFIGURATION PANEL */}
              {activeTab === 'settings' && (
                <div className="glass-panel p-8 flex flex-col gap-6 animate-fade-in overflow-y-auto max-h-[calc(100vh-140px)]">
                  <div>
                    <h2 className="text-xl font-extrabold mb-1">Outreach Settings & Config</h2>
                    <p className="text-xs text-slate-400">Securely configure your SMTP email account, target skillset filters, and AI credentials directly in the browser.</p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
                    
                    {/* SMTP Credentials Block */}
                    <div className="flex flex-col gap-4">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">SMTP Email Configuration</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="form-group mb-0">
                          <label>SMTP Host Server</label>
                          <input 
                            type="text" 
                            value={settings.smtp_host} 
                            onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                            placeholder="smtp.gmail.com"
                            className="form-control text-xs"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>SMTP Port</label>
                          <input 
                            type="number" 
                            value={settings.smtp_port} 
                            onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                            placeholder="465 (SSL) or 587 (TLS)"
                            className="form-control text-xs"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>Sender Full Name</label>
                          <input 
                            type="text" 
                            value={settings.sender_name} 
                            onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                            placeholder="Ahtasham Farooq"
                            className="form-control text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                          <label>SMTP Login Username (Email Address)</label>
                          <input 
                            type="email" 
                            value={settings.smtp_user} 
                            onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                            placeholder="ahtasham@gmail.com"
                            className="form-control text-xs"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>SMTP Security Password (App Password)</label>
                          <input 
                            type="password" 
                            value={settings.smtp_pass} 
                            onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                            placeholder="Enter SMTP password or App Password"
                            className="form-control text-xs"
                          />
                        </div>
                      </div>

                      {/* SMTP Tester */}
                      <div className="flex items-center gap-4 bg-slate-950/20 p-3 rounded-xl border border-slate-900 justify-between">
                        <div className="text-xs">
                          <h4 className="font-bold text-slate-300">Test SMTP Mailbox Connection</h4>
                          <p className="text-[10px] text-slate-500">Test if your email login works and is ready to send pitches.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {smtpTestResult && (
                            <span className={`text-[10px] font-bold ${smtpTestResult.success ? 'text-green-400' : 'text-red-400'} max-w-[200px] truncate`}>
                              {smtpTestResult.success ? 'SMTP Verified Successfully!' : `Error: ${smtpTestResult.error}`}
                            </span>
                          )}
                          <button 
                            type="button" 
                            onClick={handleTestSMTP} 
                            disabled={smtpTesting}
                            className="btn btn-secondary py-1.5 px-3 text-xs"
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${smtpTesting ? 'animate-spin' : ''}`} />
                            Test Connection
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">Outreach & AI Configuration</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-group mb-0">
                          <label>Target Niche (e.g. Developer role)</label>
                          <input 
                            type="text" 
                            value={settings.niche || ''} 
                            onChange={(e) => setSettings({ ...settings, niche: e.target.value })}
                            placeholder="e.g. React Developer"
                            className="form-control text-xs"
                            required
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>Target Skills Filter Keywords (Comma separated)</label>
                          <input 
                            type="text" 
                            value={settings.target_keywords || ''} 
                            onChange={(e) => setSettings({ ...settings, target_keywords: e.target.value })}
                            placeholder="WordPress, React, HTML, CSS, JavaScript, Node.js, Flutter"
                            className="form-control text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="form-group mb-0">
                          <label>Google Gemini API Key (Primary AI)</label>
                          <input 
                            type="password" 
                            value={settings.gemini_api_key} 
                            onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                            placeholder="Paste your free Gemini API Key"
                            className="form-control text-xs"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>Groq API Key (Llama-3 Fallback)</label>
                          <input 
                            type="password" 
                            value={settings.groq_api_key || ''} 
                            onChange={(e) => setSettings({ ...settings, groq_api_key: e.target.value })}
                            placeholder="Paste your Groq API Key"
                            className="form-control text-xs"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>Google Places API Key (Optional for B2B Maps)</label>
                          <input 
                            type="password" 
                            value={settings.google_places_api_key || ''} 
                            onChange={(e) => setSettings({ ...settings, google_places_api_key: e.target.value })}
                            placeholder="Optional API Key (falls back to free scraper if empty)"
                            className="form-control text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Developer Profiles & Professional Links Block */}
                    <div className="flex flex-col gap-4">
                      <h3 className="font-extrabold text-sm uppercase tracking-wider text-cyan-400 border-b border-slate-900 pb-2">
                        Professional Profiles & Portfolio Links
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="form-group mb-0">
                          <label>Portfolio URL</label>
                          <input 
                            id="portfolio_url"
                            type="url" 
                            value={settings.portfolio_url || ''} 
                            onChange={(e) => setSettings({ ...settings, portfolio_url: e.target.value })}
                            placeholder="https://myportfolio.com"
                            className="form-control text-xs focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>GitHub Profile URL</label>
                          <input 
                            id="github_url"
                            type="url" 
                            value={settings.github_url || ''} 
                            onChange={(e) => setSettings({ ...settings, github_url: e.target.value })}
                            placeholder="https://github.com/username"
                            className="form-control text-xs focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                          />
                        </div>
                        <div className="form-group mb-0">
                          <label>Resume (PDF/Framer link) (Optional)</label>
                          <input 
                            id="resume_url"
                            type="url" 
                            value={settings.resume_url || ''} 
                            onChange={(e) => setSettings({ ...settings, resume_url: e.target.value })}
                            placeholder="https://myresume.com"
                            className="form-control text-xs focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                      <div className="grid grid-cols-2 gap-4 items-center bg-slate-950/20 p-4 rounded-xl border border-slate-900 mt-2">
                        <div className="form-group mb-0 flex justify-between items-center w-full col-span-2">
                          <div>
                            <h4 className="font-bold text-xs text-slate-300">Daily Automation Outreach Send Cap</h4>
                            <p className="text-[10px] text-slate-500">Limit automatic daily email sends to prevent spam filter triggers (Recommended: 15-30).</p>
                          </div>
                          <input 
                            type="number" 
                            value={settings.daily_limit} 
                            onChange={(e) => setSettings({ ...settings, daily_limit: parseInt(e.target.value) })}
                            className="form-control text-xs w-28 text-center"
                          />
                        </div>

                        <div className="form-group mb-0 flex justify-between items-center w-full col-span-2 border-t border-slate-900 pt-3">
                          <div>
                            <h4 className="font-bold text-xs text-slate-300">Toggled Auto-Apply Outreach Mode</h4>
                            <p className="text-[10px] text-slate-500">Automatically send tailored emails as soon as matching jobs with direct emails are fetched.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setSettings({ ...settings, auto_apply: settings.auto_apply === 1 ? 0 : 1 })}
                            className={`btn text-xs py-1.5 px-4 font-bold border rounded-lg ${settings.auto_apply === 1 ? 'btn-primary border-transparent' : 'btn-secondary'}`}
                          >
                            {settings.auto_apply === 1 ? 'Auto-Apply: ENABLED' : 'Auto-Apply: DISABLED'}
                          </button>
                        </div>
                      </div>

                    <div className="flex justify-end gap-2 border-t border-slate-900 pt-4 shrink-0">
                      <button type="submit" disabled={loading} className="btn btn-primary px-8">
                        Save Configuration
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
