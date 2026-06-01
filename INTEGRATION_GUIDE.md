# 🔗 Integration Guide: Connect Scraper to Your Node.js Backend

This guide shows exactly how to integrate the Python business scraper with your existing Node.js backend.

## Overview

Your current setup:
- ✅ Node.js Express server (`backend/src/server.js`)
- ✅ MongoDB for data storage
- ✅ Existing email finder and local scraper
- ✅ Job fetcher and outreach system

New Python scraper adds:
- 🆕 Multi-source business scraping
- 🆕 Professional email verification (SMTP)
- 🆕 Excel export with formatting
- 🆕 Twitter/X integration

---

## Step 1: Install Python Dependencies

```bash
cd backend/scraper
pip install -r requirements.txt
```

Verify installation:
```bash
python test_setup.py
```

---

## Step 2: Add Node.js Routes

Copy the scraper routes to your backend. Edit `backend/src/server.js`:

```javascript
// Add at the top with other imports
import scraperRoutes from '../scraperRoutes.js';

// Add after other route definitions
app.use('/api', scraperRoutes);

// Example: Add to your existing routes section
app.post('/api/scrape', async (req, res) => {
  // Route handler for scraping
});
```

Or create a separate routes file and import it. See `scraperRoutes.js` for full implementation.

---

## Step 3: API Endpoints Now Available

After adding the routes, these endpoints are available:

### 1. Scrape Businesses
```bash
POST /api/scrape

Body:
{
  "keywords": ["plumber", "electrician"],
  "countries": ["USA", "UK"],
  "maxResults": 50,
  "verifyEmails": false
}

Response:
{
  "success": true,
  "data": [
    {
      "business_name": "John's Plumbing",
      "email": "contact@johnsplumbing.com",
      "phone": "555-1234",
      "website": "https://johnsplumbing.com",
      "source": "Yellow Pages",
      "country": "USA",
      "category": "Plumbing",
      "Email_Verified": true
    },
    ...
  ],
  "summary": {
    "total_records": 45,
    "verified_emails": 32,
    "with_phone": 38,
    ...
  }
}
```

### 2. Download Results
```bash
GET /api/scrape/results/xlsx
GET /api/scrape/results/csv
GET /api/scrape/results/json

Response: File download
```

### 3. Find Emails on Website
```bash
POST /api/emails/find

Body:
{
  "website": "https://example-business.com"
}

Response:
{
  "success": true,
  "website": "https://example-business.com",
  "emails": ["contact@example.com", "info@example.com"],
  "count": 2
}
```

### 4. Verify Email Addresses
```bash
POST /api/emails/verify

Body:
{
  "emails": ["contact@company.com", "info@company.com"]
}

Response:
{
  "success": true,
  "total": 2,
  "valid": 1,
  "invalid": 1,
  "results": [
    {
      "email": "contact@company.com",
      "is_valid": true,
      "status": "smtp_verified"
    },
    {
      "email": "info@company.com",
      "is_valid": false,
      "status": "invalid_format"
    }
  ]
}
```

### 5. Check Scraper Status
```bash
GET /api/scraper/health

Response:
{
  "success": true,
  "status": "ready",
  "pythonInstalled": true,
  "message": "Scraper is ready to use"
}
```

---

## Step 4: Save Results to MongoDB

Use your existing models. Example integration:

```javascript
import { LocalLead } from './models/index.js';
import scraperService from '../scraperService.js';

// After scraping, save to database
app.post('/api/scrape-and-save', async (req, res) => {
  try {
    const { keywords, countries } = req.body;
    
    // Run scraper
    const result = await scraperService.scrape(keywords, countries);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Save results to MongoDB
    const savedLeads = [];
    for (const record of result.data) {
      const lead = new LocalLead({
        business_name: record.business_name,
        email: record.email,
        phone: record.phone,
        website: record.website,
        source: record.source,
        country: record.country,
        category: record.category,
        email_verified: record.Email_Verified || false,
        scraped_date: new Date(),
        outreach_status: 'pending'
      });
      
      const saved = await lead.save();
      savedLeads.push(saved);
    }
    
    res.json({
      success: true,
      leads_saved: savedLeads.length,
      total_scraped: result.data.length,
      verified_emails: result.summary.verified_emails
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## Step 5: Use in Your Frontend

Example React component:

```jsx
import React, { useState } from 'react';

export function ScraperComponent() {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.split(',').map(k => k.trim()),
          countries: ['USA'],
          maxResults: 50,
          verifyEmails: false
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data.summary);
      } else {
        setError(data.error || 'Scraping failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    window.location.href = '/api/scrape/results/xlsx';
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Business Scraper</h2>
      
      <input
        type="text"
        placeholder="Enter keywords (comma-separated)"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        style={{ width: '100%', padding: '8px' }}
      />

      <button 
        onClick={handleScrape} 
        disabled={loading}
        style={{ marginTop: '10px', padding: '10px 20px' }}
      >
        {loading ? 'Scraping...' : 'Start Scrape'}
      </button>

      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}

      {results && (
        <div style={{ marginTop: '20px' }}>
          <h3>Results Summary:</h3>
          <p>Total found: {results.total_records}</p>
          <p>Verified emails: {results.verified_emails}</p>
          
          <button onClick={downloadResults} style={{ marginTop: '10px' }}>
            📥 Download Excel
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Step 6: Schedule Automatic Scraping

Use your existing scheduler (`backend/src/scheduler.js`):

```javascript
import scraperService from '../scraperService.js';

// Add to your scheduler
const schedule = require('node-cron');

// Run scrape every day at 9 AM
schedule.schedule('0 9 * * *', async () => {
  console.log('🚀 Running scheduled scrape...');
  
  try {
    const result = await scraperService.scrape(
      ['plumber', 'electrician'],
      ['USA'],
      50,
      false  // no verification for speed
    );
    
    // Save to database
    for (const record of result.data) {
      await LocalLead.create({
        business_name: record.business_name,
        email: record.email,
        phone: record.phone,
        website: record.website,
        source: record.source,
        country: record.country,
        category: record.category,
        email_verified: record.Email_Verified,
        scraped_date: new Date()
      });
    }
    
    console.log(`✅ Scheduled scrape completed: ${result.data.length} leads saved`);
  } catch (error) {
    console.error('❌ Scheduled scrape failed:', error);
  }
});
```

---

## Step 7: Verify Integration

Test the integration:

```bash
# Check if scraper is ready
curl http://localhost:3000/api/scraper/health

# Run a test scrape
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["plumber"],
    "countries": ["USA"],
    "maxResults": 5,
    "verifyEmails": false
  }'
```

---

## Step 8: Optional - Add Authentication

If you want to protect the scraper endpoints:

```javascript
import { requireAuth } from './middleware/auth.js';

// Protect scraper routes
app.post('/api/scrape', requireAuth, async (req, res) => {
  // Only authenticated users can scrape
});

app.post('/api/emails/verify', requireAuth, async (req, res) => {
  // Only authenticated users can verify emails
});
```

---

## Database Schema

Recommended MongoDB schema for LocalLead (if not already defined):

```javascript
const leadSchema = new Schema({
  business_name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  website: { type: String },
  source: { type: String, enum: ['Yellow Pages', 'Trustpilot', 'Clutch', 'Bark', 'Twitter/X', 'Manual'] },
  country: { type: String },
  category: { type: String },
  email_verified: { type: Boolean, default: false },
  
  // Outreach tracking
  outreach_status: { type: String, enum: ['pending', 'contacted', 'interested', 'not_interested', 'ignored'], default: 'pending' },
  emails_sent: { type: Number, default: 0 },
  last_contacted: { type: Date },
  
  // Metadata
  scraped_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
```

---

## File Structure After Integration

```
backend/
├── src/
│   ├── server.js              ← Add scraperRoutes import
│   ├── scheduler.js           ← Add scheduled scraping
│   ├── models/
│   │   └── index.js           ← Ensure LocalLead model defined
│   ├── middleware/
│   │   └── auth.js
│   └── ...
├── scraper/                   ← Python scraper folder
│   ├── main.py
│   ├── config.py
│   ├── email_finder.py
│   ├── email_verifier.py
│   ├── scrapers_base.py
│   ├── twitter_scraper.py
│   ├── excel_exporter.py
│   ├── api_wrapper.py
│   └── requirements.txt
├── scraperService.js          ← Node.js integration layer
├── scraperRoutes.js           ← Express routes (ADD THIS)
└── package.json
```

---

## Troubleshooting

### Python not found
```bash
# Check Python installation
python --version

# If not in PATH, update scraperService.js:
const python = spawn('C:\\Python311\\python.exe', [...])
```

### Permission denied on macOS/Linux
```bash
chmod +x backend/scraper/main.py
```

### Slow scraping
- Reduce `maxResults` in request
- Disable `verifyEmails` for faster results
- Increase `DELAY_BETWEEN_REQUESTS` if getting blocked

### Database connection issues
- Ensure MongoDB is running
- Check connection string in config/index.js
- Test with: `node -e "import('./src/db/mongodb.js').then(m => console.log('Connected'))"`

---

## Performance Tips

1. **Batch operations**: Scrape multiple keywords at once
2. **Disable verification initially**: Set `verifyEmails: false`, verify later
3. **Schedule off-peak hours**: Run heavy scrapes during low-traffic times
4. **Use read replicas**: For database reads during scraping
5. **Cache results**: Store scraped data to avoid re-scraping
6. **Parallel processing**: Multiple workers for different keywords

---

## Security Considerations

✅ **Do:**
- Validate input (keywords, countries)
- Sanitize database input
- Use authentication for API endpoints
- Rate limit scraper endpoints
- Log all scraping activities

❌ **Don't:**
- Expose Python path in errors
- Store unverified emails
- Bypass authentication
- Sell scraped data without consent
- Violate websites' terms of service

---

## Next Steps

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Test setup: `python test_setup.py`
3. ✅ Add routes: Copy code from `scraperRoutes.js` to your server
4. ✅ Create test endpoint and verify it works
5. ✅ Save results to MongoDB
6. ✅ Add frontend UI for scraping
7. ✅ Schedule automated scrapes

---

## Support

For detailed information:
- Python scraper docs: `backend/scraper/README.md`
- Quick start: `backend/scraper/QUICKSTART.md`
- Examples: `backend/scraper/examples.py`

---

**🎉 Your scraper is now integrated with your Node.js backend!**
