# 🚀 LeadReach AI - Complete Vercel Deployment Guide

**Your app is NOW ready for live deployment on Vercel!** 

This guide will walk you through the entire process step by step.

---

## 📋 Pre-Deployment Checklist

Before you deploy, ensure you have:

- [ ] GitHub account (https://github.com)
- [ ] Vercel account (https://vercel.com)
- [ ] MongoDB Atlas account (https://mongodb.com/cloud/atlas)
- [ ] Google Cloud account (https://console.cloud.google.com)
- [ ] Gmail account with 2FA enabled

---

## 🔧 Part A: Prepare Your Code for GitHub

### Step 1: Create a GitHub Repository

Open PowerShell and run:

```powershell
cd C:\Users\CH_SHAMII\Desktop\SaaS
git init
git add .
git commit -m "Initial commit: LeadReach AI SaaS Application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leadreach-ai.git
git push -u origin main
```

**Note:** Replace `YOUR_USERNAME` with your GitHub username.

Your code is now on GitHub! ✅

---

## 🗄️ Part B: Setup Database (MongoDB Atlas)

### Step 1: Create MongoDB Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up"
3. Create an account (use email)

### Step 2: Create a Free Cluster
1. After signing in, click "Create a deployment"
2. Select **M0 (Free)** tier
3. Choose your region (closest to you)
4. Click "Create"

### Step 3: Setup Network Access
1. In MongoDB dashboard, go to **Network Access**
2. Click "Add IP Address"
3. Enter `0.0.0.0/0` (allows access from anywhere)
4. Click "Confirm"

### Step 4: Create Database User
1. Go to **Database Access**
2. Click "Add New Database User"
3. Set username: `leadreach_user`
4. Set password: (copy this, you'll need it)
5. Click "Create User"

### Step 5: Get Connection String
1. Go back to **Databases** → Your cluster
2. Click "Connect"
3. Select "Drivers" → "Node.js"
4. Copy the connection string
5. Replace `<password>` with your password
6. Replace `myFirstDatabase` with `auto-outreach-saas`

**Your MongoDB URI will look like:**
```
mongodb+srv://leadreach_user:YOUR_PASSWORD@cluster.mongodb.net/auto-outreach-saas
```

Save this! You'll need it later. ✅

---

## 🗺️ Part C: Setup Google Places API

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project: "LeadReach AI"
3. Wait for it to be created

### Step 2: Enable Required APIs
1. Search for "Places API"
2. Click on it → "Enable"
3. Search for "Maps JavaScript API"
4. Click on it → "Enable"

### Step 3: Create API Key
1. Go to **Credentials** (left sidebar)
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. Click "Edit" and add restrictions:
   - Application restrictions: HTTP referrers
   - Add: `*.vercel.app`, `localhost`
5. Save

**Your Google API Key:**
```
AIzaSy...xyzABC (about 40 characters)
```

Save this! ✅

---

## 🤖 Part D: Setup Gemini AI API

### Step 1: Get API Key
1. Go to https://ai.google.dev
2. Click "Get API Key"
3. Create a new API key
4. Copy the key

**Your Gemini API Key:**
```
AIzaSy...xyzABC
```

Save this! ✅

---

## 📧 Part E: Setup Gmail SMTP

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already done)

### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Click "Generate"
4. Copy the password (16 characters)

**Your Gmail credentials:**
```
Email:     your-email@gmail.com
Password:  xxxx xxxx xxxx xxxx (16 chars)
```

Save this! ✅

---

## 🚀 Part F: Deploy Backend to Vercel

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "GitHub" as sign-up method
4. Authorize Vercel to access your GitHub

### Step 2: Add GitHub Project
1. In Vercel Dashboard, click "Add New" → "Project"
2. Find your `leadreach-ai` repository
3. Click "Import"

### Step 3: Configure Backend Project
1. **Project Name:** `leadreach-ai-backend`
2. **Framework:** Express.js (or Other)
3. **Root Directory:** `backend` (important!)
4. Click "Deploy"

**Wait for deployment to complete** (2-3 minutes)

Your backend URL will be: `https://leadreach-ai-backend.vercel.app`

### Step 4: Add Environment Variables
After deployment completes:

1. Go to **Project Settings** → **Environment Variables**
2. Add these variables:

```
NODE_ENV = production
MONGODB_URI = mongodb+srv://leadreach_user:PASSWORD@cluster.mongodb.net/auto-outreach-saas
JWT_SECRET = your-super-secret-key-change-this
GOOGLE_API_KEY = AIzaSy...xyzABC (from Part C)
GEMINI_API_KEY = AIzaSy...xyzABC (from Part D)
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 465
SMTP_USER = your-email@gmail.com
SMTP_PASS = xxxx xxxx xxxx xxxx (from Part E)
FRONTEND_URL = https://leadreach-ai.vercel.app (we'll set this soon)
```

3. After adding all variables, go to **Deployments**
4. Click on the latest deployment
5. Click **Redeploy** (to apply env vars)

**Backend is now live!** ✅

---

## 🎨 Part G: Deploy Frontend to Vercel

### Step 1: Create Frontend Project
1. In Vercel Dashboard, click "Add New" → "Project"
2. Find your `leadreach-ai` repository again
3. Click "Import"

### Step 2: Configure Frontend Project
1. **Project Name:** `leadreach-ai`
2. **Framework:** React (or Vite)
3. **Root Directory:** `frontend`
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. Click "Deploy"

**Wait for deployment** (2-3 minutes)

Your frontend URL will be: `https://leadreach-ai.vercel.app`

### Step 3: Add Frontend Environment Variables
After deployment:

1. Go to **Project Settings** → **Environment Variables**
2. Add this variable:

```
VITE_API_URL = https://leadreach-ai-backend.vercel.app/api
```

3. Go to **Deployments** → Latest
4. Click **Redeploy** (to apply env var)

**Frontend is now live!** ✅

---

## ✅ Part H: Verify Everything Works

### Step 1: Test Frontend
1. Open https://leadreach-ai.vercel.app
2. Should see login page
3. If it loads successfully → ✅

### Step 2: Test Backend
1. Open https://leadreach-ai-backend.vercel.app/api
2. Should show an error (that's okay, means backend is running)
3. If you get a response → ✅

### Step 3: Test Authentication
1. On frontend, try to sign up
2. Fill in: name, email, password
3. If it creates account → ✅

### Step 4: Test Lead Scraping
1. Login to your account
2. Go to "B2B Leads Finder"
3. Select "Dentist" and "Cook County, IL"
4. Click "Search B2B Leads"
5. Click on a lead
6. If emails and info show → ✅

---

## 🎉 You're LIVE!

### Your URLs:
- **Frontend:** https://leadreach-ai.vercel.app
- **Backend API:** https://leadreach-ai-backend.vercel.app/api
- **Admin Dashboard:** https://leadreach-ai.vercel.app/dashboard

### What Users Can Do:
✅ Sign up and create account
✅ Search for local business leads (Dentists, Plumbers, etc.)
✅ Scrape websites for emails and contact info
✅ Generate AI pitches
✅ Send cold emails
✅ Track outreach history

---

## 🔧 Troubleshooting

### Frontend not connecting to backend?
**Solution:** Check `VITE_API_URL` in frontend env vars

### "Cannot reach database"?
**Solution:** 
1. Check MongoDB IP whitelist (should be 0.0.0.0/0)
2. Verify `MONGODB_URI` connection string
3. Ensure MongoDB cluster is active

### "Emails not scraping"?
**Solution:**
1. Verify `GOOGLE_API_KEY` is correct
2. Check Google Cloud project has Places API enabled
3. Wait 5 minutes after enabling API

### "Can't send emails"?
**Solution:**
1. Use Gmail App Password (not regular password)
2. Verify 2FA is enabled on Gmail
3. Check `SMTP_PASS` is correct in env vars

---

## 📱 Monitoring Your App

### Check Deployment Logs:
1. Go to Vercel Dashboard
2. Select your project
3. Click on a deployment
4. View **Logs** tab for errors/warnings

### View Live Metrics:
1. Go to **Analytics** tab
2. See traffic, response times, errors

---

## 🚀 Next Steps (Optional Enhancements)

- [ ] Add custom domain (buydomainname.com)
- [ ] Setup email notifications
- [ ] Add payment integration (Stripe)
- [ ] Setup CI/CD pipeline for auto-deploy
- [ ] Add authentication with OAuth
- [ ] Setup database backups

---

## 📞 Support

**Something not working?**

1. Check the logs in Vercel dashboard
2. Verify all environment variables are set
3. Make sure all API keys are valid
4. Check MongoDB Atlas network access

---

**Congratulations! Your app is now LIVE on Vercel!** 🎊

Share your deployment URLs:
- Frontend: `https://leadreach-ai.vercel.app`
- Backend: `https://leadreach-ai-backend.vercel.app`

**You're ready to start getting leads!** 💪
