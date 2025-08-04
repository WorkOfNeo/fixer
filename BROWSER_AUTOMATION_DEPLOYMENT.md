# 🚀 Browser Automation Server Deployment Guide

## Why This Solution?

Vercel serverless functions **cannot** run browsers due to:
- ❌ No persistent filesystem for browser binaries
- ❌ Limited execution time (10s free / 60s pro)
- ❌ Memory constraints (browsers need 100MB+ RAM)
- ❌ Missing system dependencies (libnss, libatk, etc.)
- ❌ Security restrictions on executable binaries

**Solution**: Dedicated server for browser automation + Vercel for everything else.

## 🎯 Quick Deployment Steps

### 1. Deploy Browser Automation Server

#### Option A: Railway (Recommended - Free Tier Available)

1. **Create Railway Account**: [railway.app](https://railway.app)

2. **Create New Repository** for browser server:
   ```bash
   # Go to the separate browser automation server directory
   cd ../browser-automation-server
   git init
   git add .
   git commit -m "Browser automation server"
   git remote add origin https://github.com/WorkOfNeo/browser-automation-server.git
   git push -u origin main
   ```

3. **Deploy on Railway**:
   - Click "Deploy from GitHub"
   - Select your new repository
   - Railway will auto-detect Docker and deploy

4. **Set Environment Variables** in Railway Dashboard:
   ```
   SPY_USER=your_spy_username
   SPY_PASS=your_spy_password
   CUSTOMER_STORAGE_TYPE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://ssatnrhoymqyzjkfuubj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Get Your Server URL**: Railway provides a URL like `https://browser-automation-server-production.up.railway.app`

#### Option B: Render

1. **Create Render Account**: [render.com](https://render.com)
2. **New Web Service** → Connect GitHub → Select Docker
3. Set environment variables (same as Railway)

### 2. Configure Vercel App

Add this environment variable to your Vercel project:

**In Vercel Dashboard**:
1. Go to your project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Name**: `BROWSER_SERVER_URL`
   - **Value**: `https://your-railway-app-url.railway.app`
   - **Environments**: Production, Preview, Development

3. **Redeploy** your Vercel app

### 3. Test the Setup

1. **Check browser server health**:
   ```bash
   curl https://your-railway-app-url.railway.app/health
   ```

2. **Test sync from your Vercel app**:
   - Go to your deployed Vercel app
   - Try the customer sync functionality
   - Check logs in both Vercel and Railway dashboards

## 🔧 How It Works

```
User → Vercel App (Frontend) 
         ↓ 
      Vercel API (/api/sync-customers)
         ↓ (detects serverless environment)
      Railway Server (/sync-customers)
         ↓ (Playwright browser automation)
      SPY System (2-biz.spysystem.dk)
         ↓ (customer data)
      Supabase Storage
```

## 🎉 Benefits

✅ **Vercel handles**: Frontend, APIs, database operations  
✅ **Railway handles**: Browser automation, heavy processing  
✅ **Cost effective**: Railway free tier + Vercel free tier  
✅ **Scalable**: Each service scales independently  
✅ **Reliable**: No more browser binary issues  

## 🛠️ Environment Variables Summary

### Vercel (Your main app)
```
BROWSER_SERVER_URL=https://your-railway-app.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://ssatnrhoymqyzjkfuubj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Railway (Browser automation server)
```
SPY_USER=your_spy_username
SPY_PASS=your_spy_password
CUSTOMER_STORAGE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://ssatnrhoymqyzjkfuubj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔍 Troubleshooting

### "Browser automation server URL not configured"
- Make sure `BROWSER_SERVER_URL` is set in Vercel environment variables
- Redeploy Vercel app after adding the variable

### "Failed to connect to browser automation server"
- Check if Railway deployment is successful
- Test the health endpoint: `curl https://your-app.railway.app/health`
- Check Railway logs for errors

### "Missing SPY credentials"
- Ensure `SPY_USER` and `SPY_PASS` are set in Railway environment variables
- Check Railway dashboard → Variables

## 🎯 Success Indicators

✅ Railway deployment successful  
✅ Health endpoint returns 200 OK  
✅ Vercel environment variable set  
✅ Sync requests work without browser errors  
✅ Customer data syncs successfully  

**You're done!** Your app now has reliable browser automation that works in production! 🚀