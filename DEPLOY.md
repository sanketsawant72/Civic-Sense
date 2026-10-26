# CivicSense — Deployment Guide

## Architecture

```
Netlify          → Frontend (React + Vite)
Render (Web 1)   → Express API + MongoDB Atlas
Render (Web 2)   → Python FastAPI + Gemini Vision
MongoDB Atlas    → Database (free tier)
```

---

## Step 1 — MongoDB Atlas (free)

1. Go to https://cloud.mongodb.com
2. Create free M0 cluster (choose Singapore region)
3. Create database user + password
4. Whitelist all IPs: `0.0.0.0/0`
5. Copy connection string:
   `mongodb+srv://user:pass@cluster.mongodb.net/civicsense`

---

## Step 2 — Get Gemini API Key (free)

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

---

## Step 3 — Deploy Backend on Render

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Configure:
   - **Name**: `civicsense-api`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build**: `npm install`
   - **Start**: `node index.js`
4. Add Environment Variables:
   ```
   MONGO_URI        = mongodb+srv://...your atlas string...
   JWT_SECRET       = any-long-random-string-min-32-chars
   CLIENT_ORIGIN    = https://your-app.netlify.app
   AI_SERVICE_URL   = https://civicsense-ai.onrender.com  (after step 4)
   NODE_ENV         = production
   ```
5. Deploy — note the URL: `https://civicsense-api.onrender.com`

After first deploy, run seed:
```
curl -X POST https://civicsense-api.onrender.com/api/auth/seed
```
Or connect locally and run: `MONGO_URI=<atlas_url> node server/seed.js`

---

## Step 4 — Deploy AI Service on Render

1. Render → New → Web Service
2. Same repo
3. Configure:
   - **Name**: `civicsense-ai`
   - **Root Directory**: `ai-service`
   - **Runtime**: Python 3
   - **Build**: `pip install -r requirements.txt`
   - **Start**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   ```
   GEMINI_API_KEY = your-gemini-api-key
   ```
5. Deploy — note the URL: `https://civicsense-ai.onrender.com`
6. Go back to **Step 3** service → update `AI_SERVICE_URL` to this URL

---

## Step 5 — Deploy Frontend on Netlify

1. Go to https://netlify.com → New site from Git
2. Connect your GitHub repo
3. Configure:
   - **Base directory**: `.` (root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add Environment Variables:
   ```
   VITE_API_BASE = https://civicsense-api.onrender.com
   ```
5. Deploy

---

## Step 6 — Update CORS on Render API

Go to civicsense-api on Render → Environment:
```
CLIENT_ORIGIN = https://your-app.netlify.app
```
Redeploy.

---

## Local dev

```bash
# Start all 3 services
npm run dev:full

# Seed local database
node server/seed.js
```

---

## Login credentials (after seed)

| Role       | Email                     | Password       |
|------------|---------------------------|----------------|
| Admin      | admin@civicsense.in       | Admin@1234     |
| Citizen    | citizen@civicsense.in     | Citizen@1234   |
| All Depts  | pwd@civicsense.in etc.    | Dept@1234      |
