"""
SETUP CHECKLIST - Complete Step-by-Step Guide
Follow these steps in order to get your scraper running
"""

# ============================================================
# STEP 1: VERIFY PYTHON INSTALLATION
# ============================================================
# 
# Windows:
#   python --version
#   
# Mac/Linux:
#   python3 --version
#
# Expected output: Python 3.7+ (e.g., Python 3.11.0)
#
# If not installed:
#   Download from: https://www.python.org/downloads/
#   Make sure to check "Add Python to PATH" during installation

# ============================================================
# STEP 2: INSTALL DEPENDENCIES
# ============================================================

# Open terminal/command prompt and run:
# cd backend/scraper
# pip install -r requirements.txt

# This installs:
# - requests        (for HTTP requests)
# - beautifulsoup4  (for HTML parsing)
# - pandas          (for data processing)
# - openpyxl        (for Excel files)
# - lxml            (for parsing)
# - And more...

# Expected output:
# Successfully installed beautifulsoup4-4.12.2 ...
# [2/12] Installing scrapy...
# [3/12] Installing pandas...
# ... etc

# ============================================================
# STEP 3: VERIFY INSTALLATION
# ============================================================

# Run the test script:
# python test_setup.py

# This will check:
# ✓ Python version
# ✓ All dependencies installed
# ✓ Email finder functionality
# ✓ Email verifier functionality
# ✓ Excel export functionality
# ✓ Mini scrape test

# Expected output:
# ============================================================
# 🚀 BUSINESS SCRAPER - SETUP TEST
# ============================================================
# ✓ Python 3.11.0
# ✓ requests
# ✓ beautifulsoup4
# ✓ pandas
# ✓ openpyxl
# ... etc
# ============================================================
# 📊 TEST SUMMARY
# ============================================================
# ✅ PASS: Python Version
# ✅ PASS: Dependencies
# ✅ PASS: Email Finder
# ✅ PASS: Email Verifier
# ✅ PASS: Excel Export
# ✅ PASS: Mini Scrape
# ---------
# Result: 6/6 tests passed
# ============================================================

# ============================================================
# STEP 4: CUSTOMIZE CONFIGURATION
# ============================================================

# Edit: backend/scraper/config.py
# 
# Optional settings to adjust:
# 
# Line 7-10: Delays between requests
#   DELAY_BETWEEN_REQUESTS = 2      # Increase if getting blocked
#   DELAY_BETWEEN_SOURCES = 3
#   
# Line 37-40: Email verification
#   SMTP_CHECK_ENABLED = True       # Set False for faster scraping
#   SMTP_TIMEOUT = 10
#
# Line 96-99: Output directory
#   OUTPUT_DIR = './scraper_results'
#
# For most use cases, defaults are fine!

# ============================================================
# STEP 5: CUSTOMIZE YOUR FIRST SCRAPE
# ============================================================

# Edit: backend/scraper/main.py (BOTTOM OF FILE)
#
# Find this section (around line 280):
#
#   if __name__ == '__main__':
#       scraper = BusinessScraper(
#           verify_emails=False,    # ← Change these
#           export_format='xlsx'
#       )
#       
#       keywords = ['plumber', 'electrician', 'marketing agency']  # ← CUSTOMIZE
#       countries = ['USA']  # ← CUSTOMIZE - Can add: 'UK', 'CANADA', 'AUSTRALIA'
#       max_results = 20     # ← CUSTOMIZE - Per source
#
# EXAMPLES:
#
# Option 1: Local service providers (Fast)
#   keywords = ['plumber', 'electrician', 'locksmith']
#   countries = ['USA']
#   max_results = 50
#   verify_emails = False
#
# Option 2: B2B leads with verification (Slower but accurate)
#   keywords = ['marketing agency', 'web development', 'seo consultant']
#   countries = ['USA', 'UK', 'CANADA']
#   max_results = 100
#   verify_emails = True
#
# Option 3: Quick test (Very fast)
#   keywords = ['pizza']
#   countries = ['USA']
#   max_results = 5
#   verify_emails = False

# ============================================================
# STEP 6: RUN YOUR FIRST SCRAPE
# ============================================================

# In terminal, from backend/scraper folder:
# python main.py

# Expected output:
# ============================================================
# 🚀 STARTING MULTI-SOURCE BUSINESS SCRAPER
# ============================================================
# 🔑 Keywords: plumber, electrician
# 🌍 Countries: USA
# 📊 Max results per source: 50
# ============================================================
#
# 📍 YELLOW PAGES SCRAPING
# --------
#    ✓ Found 12 results in USA
#    ✓ Found 15 results in USA
#
# 📍 TRUSTPILOT SCRAPING
# --------
#    ✓ Found 8 results in USA
#
# [... continues for each source ...]
#
# 📤 EXPORTING DATA
# --------
# ✅ Excel exported successfully: ./scraper_results/business_leads.xlsx
#
# ============================================================
# ✅ SCRAPING COMPLETE
# ============================================================
# 📊 Total records scraped: 87
# 📧 With verified email: 0
# 📱 With phone number: 74
# 🌐 With website: 65
# ============================================================

# ============================================================
# STEP 7: CHECK YOUR RESULTS
# ============================================================

# Results folder: backend/scraper/scraper_results/
#
# Files created:
# ✓ business_leads.xlsx   (Main results file)
# ✓ business_leads.csv    (For CRM import)
# ✓ business_leads.json   (For API integration)
#
# Open: business_leads.xlsx in Excel/Google Sheets
#
# Sheets included:
# 1. "All Results"       - All scraped businesses
# 2. "Verified Emails"   - Only valid emails (if verification enabled)
# 3. "Summary"           - Statistics
# 4. "Source Breakdown"  - Results by source

# ============================================================
# STEP 8: OPTIONAL - ENABLE EMAIL VERIFICATION
# ============================================================

# If Step 6 didn't verify emails, do this:
#
# Edit: backend/scraper/main.py (line ~285)
# 
# Change:
#   scraper = BusinessScraper(verify_emails=False, ...)
#
# To:
#   scraper = BusinessScraper(verify_emails=True, ...)
#
# Then run again:
#   python main.py
#
# WARNING: Email verification takes MUCH longer
# Example: 100 businesses with verification = 10-15 minutes
# Without verification = 2-3 minutes
#
# Recommended:
# - First run: verify_emails=False (get results fast)
# - Selective verification: Run verification on smaller email list

# ============================================================
# STEP 9: INTEGRATE WITH YOUR NODE.JS BACKEND
# ============================================================

# To use the scraper from your Express backend:
#
# 1. Copy to your backend folder:
#    - backend/scraperService.js
#    - backend/scraperRoutes.js
#
# 2. Add to backend/src/server.js (around line 20):
#
#    import scraperRoutes from '../scraperRoutes.js';
#    app.use('/api', scraperRoutes);
#
# 3. Restart your Node.js server
#
# 4. Test the API:
#    curl -X POST http://localhost:3000/api/scraper/health
#
# 5. Now available endpoints:
#    POST   /api/scrape                - Start scraping
#    GET    /api/scrape/results/xlsx  - Download results
#    POST   /api/emails/find          - Find emails on website
#    POST   /api/emails/verify        - Verify emails
#    GET    /api/scraper/health       - Check status

# ============================================================
# STEP 10: SAVE RESULTS TO MONGODB
# ============================================================

# To automatically save scraped results to your database:
#
# Add this route to backend/src/server.js:

"""
import scraperService from '../scraperService.js';

app.post('/api/scrape-and-save', async (req, res) => {
  try {
    const { keywords, countries } = req.body;
    
    // Run scraper
    const result = await scraperService.scrape(keywords, countries);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Save to MongoDB
    for (const record of result.data) {
      await LocalLead.create({
        business_name: record.business_name,
        email: record.email,
        phone: record.phone,
        website: record.website,
        source: record.source,
        country: record.country,
        category: record.category,
        email_verified: record.Email_Verified
      });
    }
    
    res.json({
      success: true,
      saved: result.data.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
"""

# Now test:
# curl -X POST http://localhost:3000/api/scrape-and-save \
#   -H "Content-Type: application/json" \
#   -d '{
#     "keywords": ["plumber"],
#     "countries": ["USA"]
#   }'

# ============================================================
# STEP 11: OPTIONAL - SCHEDULE AUTOMATIC SCRAPING
# ============================================================

# Add to backend/src/scheduler.js:

"""
import scraperService from '../scraperService.js';
import { LocalLead } from './models/index.js';

// Run scrape every day at 9 AM
schedule.schedule('0 9 * * *', async () => {
  console.log('🚀 Running scheduled scrape...');
  
  try {
    const result = await scraperService.scrape(
      ['plumber', 'electrician'],
      ['USA'],
      50
    );
    
    for (const record of result.data) {
      await LocalLead.create({
        business_name: record.business_name,
        email: record.email,
        phone: record.phone,
        website: record.website,
        source: record.source,
        country: record.country,
        category: record.category,
        email_verified: record.Email_Verified
      });
    }
    
    console.log(`✅ Scheduled scrape: ${result.data.length} leads saved`);
  } catch (error) {
    console.error('❌ Scheduled scrape failed:', error);
  }
});
"""

# ============================================================
# STEP 12: VERIFY EVERYTHING WORKS
# ============================================================

# Checklist:
# □ Python installed (python --version works)
# □ Dependencies installed (pip list shows beautifulsoup4, pandas, etc.)
# □ Test passed (python test_setup.py shows all green)
# □ First scrape ran (business_leads.xlsx created)
# □ Results look good (checked xlsx file)
# □ Email verification tested (if enabled)
# □ Node.js integration added (added scraperRoutes.js)
# □ API endpoints tested (curl /api/scraper/health works)
# □ Results saved to MongoDB (verified in database)
# □ Scheduled scraping set up (scheduler job confirmed)

# ============================================================
# COMMON ISSUES & FIXES
# ============================================================

# Issue: "No module named 'requests'"
# Fix: pip install -r requirements.txt

# Issue: "Permission denied" on Mac/Linux
# Fix: chmod +x backend/scraper/main.py

# Issue: No results found
# Fix: Try different keywords, check internet connection

# Issue: Excel file won't open
# Fix: Delete file, run scrape again, check for corrupted file

# Issue: Python not found
# Fix: Add Python to PATH or use full path: C:\Python311\python.exe

# Issue: Very slow scraping
# Fix: Disable email verification (verify_emails=False)

# ============================================================
# NEXT STEPS
# ============================================================

# After completing this checklist:
#
# 1. Analyze results: Who are your best leads?
# 2. Filter data: Focus on verified emails
# 3. Segment: Group by industry/location
# 4. Outreach: Use with your existing email system
# 5. Track: Monitor response rates
# 6. Iterate: Adjust keywords based on results
# 7. Automate: Schedule daily/weekly scrapes
# 8. Scale: Add more sources/keywords

# ============================================================
# HELPFUL COMMANDS
# ============================================================

# Run quick test scrape (5 results)
# python main.py  # (with max_results=5 in main.py)

# Find emails on a specific website
# python api_wrapper.py find_emails https://example.com

# Verify an email address
# python api_wrapper.py verify_email contact@example.com

# Verify multiple emails
# python api_wrapper.py verify_emails '["a@test.com", "b@test.com"]'

# Check installation
# python test_setup.py

# See logs/progress
# python main.py > scraper.log 2>&1

# ============================================================
# 🎉 YOU'RE ALL SET!
# ============================================================

# Your complete business scraper is ready!
#
# Quick recap:
# ✅ Python scraper with 5 sources
# ✅ Email finder & verification
# ✅ Excel export with multiple sheets
# ✅ Node.js API integration
# ✅ MongoDB storage
# ✅ Scheduled automation
#
# Start here:
#   cd backend/scraper
#   python main.py
#
# For detailed docs:
#   - README.md         (comprehensive)
#   - QUICKSTART.md     (5-minute setup)
#   - examples.py       (code examples)
#   - INTEGRATION_GUIDE (with Node.js)
#
# Happy scraping! 🚀
