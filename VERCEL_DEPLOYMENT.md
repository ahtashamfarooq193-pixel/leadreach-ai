# 🚀 Vercel Deployment Guide - LeadReach AI

## Part 1: Setup GitHub Repository

### Step 1: Create GitHub Repo
```bash
cd C:\Users\CH_SHAMII\Desktop\SaaS
git init
git add .
git commit -m "Initial commit: LeadReach AI SaaS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leadreach-ai.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Part 2: Deploy Backend to Vercel

### Step 1: Create Vercel Account
- Visit https://vercel.com
- Sign up with GitHub account
- Authorize Vercel to access GitHub

### Step 2: Create Backend Project
```
1. Go to Vercel Dashboard → "Add New..." → "Project"
2. Import Repository → Select your GitHub repo
3. Choose "Express.js or Node" as the framework
4. Root Directory: Select "backend"
5. Click "Deploy"
```

### Step 3: Add Environment Variables
After deployment, go to **Project Settings → Environment Variables** and add:

```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/auto-outreach-saas
JWT_SECRET = your-super-secret-key-change-this
GOOGLE_API_KEY = your-google-places-api-key
GEMINI_API_KEY = your-gemini-api-key
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 465
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-specific-password
FRONTEND_URL = https://leadreach-ai.vercel.app
NODE_ENV = production
```

### Step 4: Update Backend for Vercel
The backend needs to be tweaked to work with Vercel's serverless architecture.

**Key changes needed in backend/src/server.js:**
- Add PORT handling: `const PORT = process.env.PORT || 5000;`
- Export handler for serverless: `export default app;`

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Create Separate Frontend Project
```
1. Go to Vercel Dashboard → "Add New..." → "Project"
2. Import Repository → Select your GitHub repo
3. Choose "React" or "Vite" as the framework
4. Root Directory: Select "frontend"
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click "Deploy"
```

### Step 2: Add Frontend Environment Variables
Go to **Project Settings → Environment Variables**:

```
VITE_API_URL = https://your-backend.vercel.app/api
```

### Step 3: Update Frontend Config
In `frontend/vite.config.js`, ensure backend URL is configured.

---

## Part 4: Connect Backend & Frontend URLs

### In Frontend (.env or config):
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

### In Backend CORS:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));
```

---

## Part 5: Required APIs & Services

Before deploying, ensure you have:

### 1. **MongoDB Atlas** (Database)
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get connection string: `mongodb+srv://...`

### 2. **Google Places API** (For lead searching)
- Go to https://console.cloud.google.com
- Enable "Places API" and "Maps JavaScript API"
- Create API key with restrictions
- Add to Vercel env vars

### 3. **Gemini AI API** (For pitch generation)
- Sign up at https://ai.google.dev
- Get your API key
- Add to Vercel env vars

### 4. **Gmail SMTP** (For email sending)
- Enable 2-Factor Authentication on Gmail
- Generate App Password: https://myaccount.google.com/apppasswords
- Use as `SMTP_PASS`

---

## Part 6: Quick Deploy Checklist

- [ ] GitHub repo created and pushed
- [ ] Vercel account created
- [ ] Backend project deployed on Vercel
- [ ] Frontend project deployed on Vercel
- [ ] MongoDB Atlas cluster created
- [ ] Google Places API key generated
- [ ] Gemini API key generated
- [ ] Gmail App Password generated
- [ ] All environment variables added to Vercel
- [ ] CORS URLs properly configured
- [ ] Frontend API endpoint pointing to backend

---

## Part 7: Troubleshooting

### Backend not connecting to frontend?
✅ Check CORS origin in backend/src/server.js
✅ Verify FRONTEND_URL env var is correct

### Can't find leads?
✅ Ensure GOOGLE_API_KEY is valid
✅ Check Google Cloud project has Places API enabled

### Emails not sending?
✅ Verify Gmail App Password (not regular password)
✅ Check SMTP_* env vars are correct
✅ Enable "Less secure app access" if using regular password

### Database timeout?
✅ Add IP whitelist to MongoDB Atlas: Allow from anywhere (0.0.0.0/0)
✅ Check MONGODB_URI connection string

---

## Part 8: Your Live URLs

After deployment:
- **Frontend**: https://leadreach-ai.vercel.app
- **Backend API**: https://leadreach-ai-backend.vercel.app/api
- **Admin Dashboard**: https://leadreach-ai.vercel.app/dashboard

---

## Quick Commands

```bash
# Test locally before deploying
cd backend && npm start
cd ../frontend && npm run dev

# Build frontend for production
cd frontend && npm run build

# Check for errors
npm run lint
```

---

**Need Help?** Message me and I'll guide you through any step! 🚀
