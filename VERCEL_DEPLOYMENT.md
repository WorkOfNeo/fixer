# 🚀 Vercel + Supabase Deployment Guide

This guide sets up automatic Git-based deployments with database migrations.

## 📋 Prerequisites

- GitHub repository: `WorkOfNeo/fixer` ✅
- Supabase project: `MVP-FIXER` ✅
- Vercel account (free tier works)

## 🔗 Step 1: Connect to Vercel

1. **Go to**: [vercel.com](https://vercel.com)
2. **Sign in** with GitHub
3. **Import Project** → **From Git Repository**
4. **Select**: `WorkOfNeo/fixer`
5. **Framework**: Next.js (auto-detected)
6. **Don't deploy yet** - we need to set environment variables first

## ⚙️ Step 2: Configure Environment Variables

### **Production Environment Variables**

In Vercel project settings → Environment Variables, add:

#### **Public Variables (Frontend)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ssatnrhoymqyzjkfuubj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzYXRucmhveW1xeXpqa2Z1dWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjE5NTgsImV4cCI6MjA2OTczNzk1OH0.iD_NZoqzjCekxOTdPql5khaS0kDWrJ98ccfGeJYss-s
```

#### **Build Variables (Database Migrations)**
```bash
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
SUPABASE_DB_PASSWORD=your_database_password
SUPABASE_PROJECT_REF=ssatnrhoymqyzjkfuubj
```

#### **Application Variables**
```bash
SPY_USER=your_spy_username
SPY_PASS=your_spy_password
OPENAI_API_KEY=your_openai_api_key
SYSTEM_URL=https://2-biz.spysystem.dk
CUSTOMER_STORAGE_TYPE=supabase
NODE_ENV=production
```

### **How to Get Missing Credentials**

#### **Supabase Access Token**
1. Go to: [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
2. Click "Generate new token"
3. Copy the token

#### **Database Password**
1. Go to: [MVP-FIXER Database Settings](https://supabase.com/dashboard/project/ssatnrhoymqyzjkfuubj/settings/database)
2. Reset password if needed
3. Copy the password

## 🌿 Step 3: Set Up Staging Environment

### **Create Preview Environment**
1. **Environment**: Preview (for `develop` branch)
2. **Add same variables** as production
3. **Different database** (optional): Create separate Supabase project for staging

## 🚀 Step 4: Deploy

1. **Click "Deploy"** in Vercel
2. **Watch build logs** - should see:
   ```
   ✅ Running migrations...
   ✅ Next.js build starting...
   ✅ Deployment successful!
   ```

## 🔄 Your New Workflow

### **Automatic Deployments**
```bash
# Development
git checkout develop
# Make changes
git add .
git commit -m "Add new feature"
git push origin develop
# → Vercel deploys to preview URL with staging database

# Production
git checkout main
git merge develop
git push origin main  
# → Vercel deploys to production URL with production database
```

### **Database Migrations**
- **Migrations run automatically** during Vercel build
- **Add new migration**: Create `supabase/migrations/YYYYMMDD_description.sql`
- **Push to Git** → **Auto-deploy with migration**

## 🎯 Benefits

✅ **Automatic deployments** when pushing to Git  
✅ **Database migrations** run during build  
✅ **Environment separation** (staging vs production)  
✅ **Zero-downtime deployments**  
✅ **Preview deployments** for pull requests  
✅ **Rollback capability** through Git  
✅ **Free hosting** (Vercel) + database (Supabase)  

## 🔧 Troubleshooting

### **Migration Fails**
- Check Supabase credentials in Vercel environment variables
- Verify database password is correct
- Check build logs for specific SQL errors

### **App Won't Connect to Database**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check if environment variables are set for the correct environment

### **Build Timeout**
- Playwright install might be slow - build should succeed on retry
- Consider using Docker build for faster installs

## 🎉 You're Done!

Your AI-powered stock checker now has:
- **Git-based deployments** 🔄
- **Automatic database migrations** 📊  
- **Multi-environment support** 🌿
- **Enterprise-grade CI/CD** 🚀

**All for free!** 💰