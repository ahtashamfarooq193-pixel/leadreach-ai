# 🚀 LeadReach AI - Vercel Deployment (Quick Start)

## What's Done ✅
- ✅ Backend configured for Vercel serverless
- ✅ Frontend ready for Vercel CDN
- ✅ API URL routing configured
- ✅ Environment variables structured
- ✅ CORS setup for cross-origin requests

---

## Step 1: Push Code to GitHub

```bash
cd C:\Users\CH_SHAMII\Desktop\SaaS
git init
git add .
git commit -m "LeadReach AI - Ready for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leadreach-ai.git
git push -u origin main
```

---

## Step 2: Deploy Backend (5 minutes)

### 2.1 Create Backend Project on Vercel
```
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your GitHub repo
4. Choose "Express.js" or "Other" as framework
5. Set Root Directory to: backend
6. Click "Deploy"
```

### 2.2 Add Backend Environment Variables
After deployment, go to **Settings → Environment Variables** and add:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/auto-outreach
JWT_SECRET=your-secret-key-here
GOOGLE_API_KEY=your-google-places-key
GEMINI_API_KEY=your-gemini-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 2.3 Get Your Backend URL
Your backend will be deployed at something like:
```
https://leadreach-ai-backend.vercel.app/api
```

---

## Step 3: Deploy Frontend (5 minutes)

### 3.1 Create Frontend Project on Vercel
```
1. Click "Add New" → "Project" again
2. Select same GitHub repo
3. Choose "React" or "Vite" as framework
4. Set Root Directory to: frontend
5. Build Command: npm run build
6. Output Directory: dist
7. Click "Deploy"
```

### 3.2 Add Frontend Environment Variables
Go to **Settings → Environment Variables**:

```
VITE_API_URL=https://leadreach-ai-backend.vercel.app/api
```

---

## Step 4: Get Required API Keys

Before things work, you MUST set up:

### 🔐 MongoDB Atlas (Database)
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free tier available)
3. Create a cluster
4. Get connection string: `mongodb+srv://...`
5. Add to backend env vars

### 🗺️ Google Places API
1. Go to https://console.cloud.google.com
2. Enable "Places API" and "Maps JavaScript API"
3. Create API key
4. Add restrictions (optional)
5. Copy key → Add to backend env vars

### 🤖 Gemini AI API
1. Go to https://ai.google.dev
2. Sign up
3. Get API key
4. Add to backend env vars

### 📧 Gmail App Password
1. Enable 2FA on your Gmail: https://myaccount.google.com/security
2. Go to App passwords: https://myaccount.google.com/apppasswords
3. Select Mail & App (Windows Computer)
4. Copy password
5. Use as `SMTP_PASS` in backend env vars

---

## Step 5: Verify & Test

After deployment:

1. **Test Frontend**: Open https://your-frontend.vercel.app
2. **Test Backend**: Visit https://your-backend.vercel.app/api
3. **Check Logs**: 
   - Frontend: Vercel Dashboard → Deployments → Logs
   - Backend: Vercel Dashboard → Deployments → Logs

---

## Your Live URLs 🎉

After everything is deployed:

```
Frontend:  https://leadreach-ai.vercel.app
Backend:   https://leadreach-ai-backend.vercel.app
API Base:  https://leadreach-ai-backend.vercel.app/api
```

---

## Troubleshooting

### ❌ "Cannot reach backend"
- Check `VITE_API_URL` in frontend env vars
- Verify backend is deployed successfully
- Check backend logs for errors

### ❌ "Database connection failed"
- Verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0)
- Check `MONGODB_URI` is correct
- Ensure MongoDB Atlas cluster is running

### ❌ "Leads not showing"
- Verify `GOOGLE_API_KEY` is valid
- Check Google Cloud project has Places API enabled
- Test API key locally first

### ❌ "Can't send emails"
- Use Gmail App Password (not regular password)
- Verify SMTP credentials in backend env vars
- Check Gmail 2FA is enabled

---

## Need Help?

For detailed deployment guide, see: **VERCEL_DEPLOYMENT.md**

For local development guide, see: **SETUP_CHECKLIST.md**

---

**Questions?** DM me on the platform! 🚀
