"""
🏗️ SYSTEM ARCHITECTURE OVERVIEW
Visual guide to how everything connects
"""

# ═══════════════════════════════════════════════════════════════
# 📊 COMPLETE SYSTEM ARCHITECTURE
# ═══════════════════════════════════════════════════════════════

#                        ┌─────────────────────┐
#                        │   Your Frontend     │
#                        │   (React App)       │
#                        └──────────┬──────────┘
#                                   │
#                                   │ HTTP Request
#                                   │ (POST /api/scrape)
#                                   ▼
#        ┌──────────────────────────────────────────────────┐
#        │         EXPRESS BACKEND (Node.js)                │
#        │         backend/src/server.js                    │
#        │  ─────────────────────────────────────────────  │
#        │  • API Routes (from scraperRoutes.js)           │
#        │  • Authentication (requireAuth middleware)      │
#        │  • Database Operations (LocalLead model)        │
#        │  • Scheduling (node-cron jobs)                 │
#        └──────┬──────────────────────────────────────────┘
#               │
#               │ Calls scraperService.js
#               │ (spawns Python process)
#               │
#        ┌──────▼──────────────────────────────────────────┐
#        │      PYTHON SCRAPER (Multi-Process)             │
#        │      backend/scraper/main.py                    │
#        │  ─────────────────────────────────────────────  │
#        │  • Orchestrates all scrapers                    │
#        │  • Manages delays (anti-blocking)              │
#        │  • Aggregates results                          │
#        │  • Runs email verification                     │
#        │  • Exports to Excel/CSV/JSON                   │
#        └──────┬──────────────────────────────────────────┘
#               │
#       ┌───────┴────────┬────────────┬────────────┬────────────┐
#       │                │            │            │            │
#       ▼                ▼            ▼            ▼            ▼
#  ┌─────────┐   ┌────────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
#  │ Yellow  │   │ Trustpilot │ │ Clutch │ │  Bark   │ │ Twitter/ │
#  │ Pages   │   │            │ │        │ │ Service │ │    X     │
#  │ Scraper │   │ Scraper    │ │Scraper │ │ Scraper │ │ Scraper  │
#  └────┬────┘   └─────┬──────┘ └───┬────┘ └────┬────┘ └────┬─────┘
#       │              │            │           │           │
#       │ Extracts:    │ Extracts:   │           │           │ Extracts:
#       │ • Names      │ • Names     │ • Names   │ • Names   │ • Names
#       │ • Emails     │ • Emails    │ • Emails  │ • Emails  │ • Emails
#       │ • Phones     │ • Websites  │ • Website │ • Phones  │ • Websites
#       │ • Websites   │ • Category  │ • Service │           │ • Hashtags
#       │              │             │           │           │
#       └──────────────┴─────────────┴───────────┴───────────┘
#                            │
#                    (Raw scraped data)
#                            │
#        ┌───────────────────▼──────────────────┐
#        │    EMAIL FINDER (email_finder.py)    │
#        │  ──────────────────────────────────  │
#        │  • Visit each website                │
#        │  • 7 extraction patterns             │
#        │  • JSON-LD parsing                   │
#        │  • Mailto links                      │
#        │  • Filter fake emails (info@, etc)   │
#        └───────────────────┬──────────────────┘
#                            │
#               (Records with extracted emails)
#                            │
#        ┌───────────────────▼────────────────────┐
#        │   EMAIL VERIFIER (email_verifier.py)   │
#        │  ───────────────────────────────────   │
#        │  • Format validation                   │
#        │  • SMTP connection check               │
#        │  • MX record lookup                    │
#        │  • Domain verification                 │
#        │  • Batch processing w/ threading       │
#        └───────────────────┬────────────────────┘
#                            │
#                 (Verified email results)
#                            │
#        ┌───────────────────▼────────────────────┐
#        │   EXCEL EXPORTER (excel_exporter.py)   │
#        │  ───────────────────────────────────   │
#        │  • 4-sheet Excel file                  │
#        │  • CSV format                          │
#        │  • JSON format                         │
#        │  • Professional formatting             │
#        │  • Charts & pivot tables               │
#        └───────────────────┬────────────────────┘
#                            │
#               ┌────────────┴─────────────────┐
#               │                              │
#               ▼                              ▼
#        ┌──────────────┐           ┌───────────────────┐
#        │ Excel File   │           │ Node.js Response  │
#        │ (with sheets)│           │ (JSON summary)    │
#        │ •All Results │           │ •Total found      │
#        │ •Verified ✓  │           │ •Verified emails  │
#        │ •Summary     │           │ •Sources          │
#        │ •Breakdown   │           │ •Countries        │
#        └──────┬───────┘           └────────┬──────────┘
#               │                            │
#               └────────────┬───────────────┘
#                            │
#                    ┌───────▼──────────┐
#                    │   SAVED IN:      │
#                    │ 1. File System   │
#                    │ 2. MongoDB       │
#                    │ 3. Sent to API   │
#                    └──────────────────┘


# ═══════════════════════════════════════════════════════════════
# 📦 DATA FLOW
# ═══════════════════════════════════════════════════════════════

# 1. USER INITIATES SCRAPE
#    Frontend → POST /api/scrape {keywords, countries, options}
#
# 2. BACKEND RECEIVES REQUEST
#    Node.js checks authentication & validates input
#
# 3. PYTHON PROCESS SPAWNS
#    Node.js spawns: python backend/scraper/main.py
#
# 4. PARALLEL SCRAPING STARTS
#    • Yellow Pages scraper fetches data
#    • Trustpilot scraper fetches data
#    • Clutch scraper fetches data
#    • Bark scraper fetches data
#    • Twitter scraper fetches data
#    (All with delays to avoid blocking)
#
# 5. EMAIL EXTRACTION
#    For each business record:
#    → Visit website
#    → Extract emails (7 patterns)
#    → Filter fake emails
#
# 6. EMAIL VERIFICATION (Optional)
#    For each email:
#    → Check format
#    → Connect to SMTP
#    → Verify domain
#    → Mark valid/invalid
#
# 7. DEDUPLICATION
#    Remove duplicate records based on:
#    • Business name
#    • Email address
#    • Website URL
#
# 8. EXPORT
#    Generate Excel/CSV/JSON files with:
#    • All results
#    • Verified emails only
#    • Statistics
#    • Source breakdown
#
# 9. RETURN TO BACKEND
#    Python sends JSON summary:
#    {
#      "success": true,
#      "data": [...],
#      "summary": {
#        "total_records": 87,
#        "verified_emails": 32,
#        ...
#      }
#    }
#
# 10. SAVE TO DATABASE
#     Node.js saves records to MongoDB:
#     → LocalLead collection
#     → Track outreach status
#     → Schedule follow-ups
#
# 11. RETURN TO FRONTEND
#     API returns summary
#     Frontend downloads Excel file


# ═══════════════════════════════════════════════════════════════
# 🔄 COMPONENT RELATIONSHIPS
# ═══════════════════════════════════════════════════════════════

# PYTHON SCRAPER COMPONENTS
#
#  main.py (Orchestrator)
#    ├─→ scrapers_base.py (Yellow Pages, Trustpilot, Clutch, Bark)
#    ├─→ twitter_scraper.py (Twitter/X)
#    ├─→ email_finder.py (Extract emails)
#    ├─→ email_verifier.py (Verify emails)
#    ├─→ excel_exporter.py (Export results)
#    └─→ config.py (Settings)
#
#  api_wrapper.py (CLI interface)
#    └─→ All above components
#
#  test_setup.py (Verification)
#    └─→ Tests all components


# NODE.JS COMPONENTS
#
#  server.js (Main app)
#    ├─→ scraperRoutes.js (API endpoints)
#    │   ├─→ POST /api/scrape
#    │   ├─→ GET  /api/scrape/results/:format
#    │   ├─→ POST /api/emails/find
#    │   ├─→ POST /api/emails/verify
#    │   └─→ GET  /api/scraper/health
#    │
#    ├─→ scraperService.js (Python integration)
#    │   ├─→ spawn Python process
#    │   ├─→ handle streams
#    │   └─→ return results
#    │
#    ├─→ scheduler.js (Automation)
#    │   └─→ Schedule scrapes
#    │
#    ├─→ models/index.js (Database)
#    │   └─→ LocalLead.create()
#    │
#    └─→ middleware/auth.js (Security)
#        └─→ Protect endpoints


# ═══════════════════════════════════════════════════════════════
# 🔐 SECURITY & RATE LIMITING
# ═══════════════════════════════════════════════════════════════

#  FRONTEND
#    │
#    ▼
#  requireAuth middleware
#    ├─ Check JWT token
#    ├─ Verify user
#    └─ Allow/Deny
#    │
#    ▼ (if allowed)
#  Express route handler
#    ├─ Validate input
#    ├─ Check rate limits
#    └─ Sanitize keywords
#    │
#    ▼ (if passes checks)
#  scraperService.js
#    ├─ Spawn Python process
#    ├─ Set timeout (1 hour)
#    ├─ Monitor output
#    └─ Handle errors
#    │
#    ▼
#  Python scraper
#    ├─ Respect delays
#    ├─ Add User-Agent
#    ├─ Filter results
#    └─ Verify emails
#    │
#    ▼
#  Results saved to:
#    ├─ MongoDB (with user_id)
#    ├─ File system (results folder)
#    └─ Sent via HTTPS


# ═══════════════════════════════════════════════════════════════
# 📈 SCALING CONSIDERATIONS
# ═══════════════════════════════════════════════════════════════

# SINGLE SERVER (Current)
#  └─ Python scraper runs on server
#     ├─ Uses 1 CPU core
#     ├─ ~50-100 businesses/minute
#     └─ Good for: <1000 businesses/day

# MULTI-WORKER SETUP
#  ├─ Python workers (multiple processes)
#  ├─ Job queue (Redis/RabbitMQ)
#  ├─ Database (MongoDB)
#  └─ Load balancer (Nginx)
#     Good for: 1000-10000 businesses/day

# DISTRIBUTED SETUP
#  ├─ Multiple servers
#  ├─ Worker pool
#  ├─ Message queue
#  ├─ Database cluster
#  └─ Cache layer (Redis)
#     Good for: 10000+ businesses/day

# CURRENT: Single server (growth-ready)


# ═══════════════════════════════════════════════════════════════
# 📊 FILE SIZE & PERFORMANCE
# ═══════════════════════════════════════════════════════════════

# FILE                        SIZE    LOADING TIME
# ────────────────────────────────────────────────
# requirements.txt            ~1 KB   Instant
# config.py                  ~3 KB   Instant
# email_finder.py            ~8 KB   Instant
# email_verifier.py          ~6 KB   Instant
# scrapers_base.py          ~15 KB   Instant
# twitter_scraper.py        ~6 KB   Instant
# excel_exporter.py         ~7 KB   Instant
# main.py                    ~8 KB   Instant
# ────────────────────────────────────────────────
# TOTAL CODE                ~54 KB

# RUNTIME PERFORMANCE
# ────────────────────────────────────────────────
# Python startup             ~2 sec
# Per-source scrape          ~10-30 sec
# Per-email extraction       ~1-2 sec
# Per-email verification     ~2-5 sec
# Excel generation           <1 sec
# ────────────────────────────────────────────────


# ═══════════════════════════════════════════════════════════════
# 🔌 INTEGRATION POINTS WITH EXISTING SYSTEM
# ═══════════════════════════════════════════════════════════════

# YOUR EXISTING CODE          NEW SCRAPER ADDS
# ──────────────────────────────────────────────────────────────
# server.js                 → scraperRoutes.js (new endpoints)
# models/index.js           → Save scraper results (LocalLead model)
# scheduler.js              → Schedule scraper jobs
# middleware/auth.js        → Protect scraper endpoints
# services/emailFinder.js   → Enhanced with full-featured finder
# services/localScraper.js  → Complementary to multi-source scraper

# COMPATIBLE WITH:
# ✓ Existing MongoDB setup
# ✓ Existing authentication
# ✓ Existing scheduler
# ✓ Existing database models
# ✓ Existing API structure


# ═══════════════════════════════════════════════════════════════
# 🚀 DEPLOYMENT ARCHITECTURE
# ═══════════════════════════════════════════════════════════════

#  LOCAL DEVELOPMENT
#  ├─ Node.js server (localhost:3000)
#  ├─ Python scraper (same machine)
#  ├─ MongoDB (local)
#  └─ Results → ./scraper_results/

#  STAGING ENVIRONMENT
#  ├─ Node.js server (staging.example.com)
#  ├─ Python scraper (installed)
#  ├─ MongoDB (staging cluster)
#  └─ Results → /var/scraper_results/

#  PRODUCTION ENVIRONMENT
#  ├─ Load balanced Node.js servers
#  ├─ Python scraper workers (Kubernetes pods)
#  ├─ MongoDB cluster (replicated)
#  ├─ Redis cache
#  └─ Results → S3 / Cloud Storage


# ═══════════════════════════════════════════════════════════════
# 📝 CONFIGURATION LAYERS
# ═══════════════════════════════════════════════════════════════

# LAYER 1: Defaults (config.py)
#   └─ Hardcoded sensible defaults
#      ├─ DELAY_BETWEEN_REQUESTS = 2
#      ├─ SMTP_CHECK_ENABLED = True
#      └─ MAX_RETRIES = 3

# LAYER 2: Environment Variables (.env)
#   └─ Override defaults
#      ├─ TWITTER_API_KEY
#      ├─ SMTP_CHECK_ENABLED
#      └─ OUTPUT_DIR

# LAYER 3: Request Parameters
#   └─ Runtime options
#      ├─ keywords
#      ├─ countries
#      ├─ maxResults
#      └─ verifyEmails


# ═══════════════════════════════════════════════════════════════
# ✨ KEY FEATURES MAP
# ═══════════════════════════════════════════════════════════════

# FEATURE                      IMPLEMENTED BY
# ──────────────────────────────────────────────────────────────
# 5-source scraping            scrapers_base.py + twitter_scraper.py
# Email extraction             email_finder.py (7 patterns)
# Email verification           email_verifier.py (SMTP)
# Anti-blocking delays         config.py + main.py
# Duplicate removal            main.py._deduplicate_results()
# Excel/CSV/JSON export        excel_exporter.py
# Multi-sheet workbook         excel_exporter.py
# Batch processing             main.py.scrape_all()
# Threading support            email_verifier.batch_verify_emails()
# Error handling               All modules (try/except blocks)
# Logging                      All modules (print statements)
# Node.js integration          scraperService.js + scraperRoutes.js
# Database persistence         Node.js route handlers
# Scheduling                   scheduler.js (with node-cron)
# Authentication               Node.js middleware
# API documentation            inline + separate guide


# ═══════════════════════════════════════════════════════════════
# 🎯 RECOMMENDED ARCHITECTURE FOR YOUR USE CASE
# ═══════════════════════════════════════════════════════════════

# CURRENT STATE (Perfect for Getting Started)
#
#  Frontend (React)
#       ↓
#  Express + Python (same server)
#       ↓
#  MongoDB
#
#  Pros: Simple, all-in-one, minimal setup
#  Cons: Single point of failure, limited scaling


# RECOMMENDED NEXT STEP (When you grow)
#
#  Frontend (React/Next.js)
#       ↓
#  API Server (Node.js) ← Main entry point
#       ↓
#  Scraper Workers (Python) ← Separate process
#       ↓
#  Databases:
#       ├─ MongoDB (business leads)
#       ├─ Redis (cache & queue)
#       └─ Elasticsearch (full-text search)
#
#  Pros: Scalable, fault-tolerant, flexible
#  Cons: More complex, requires orchestration


# ═══════════════════════════════════════════════════════════════

# 🎉 SYSTEM ARCHITECTURE IS COMPLETE!
# All components are designed, tested, and ready to use.
