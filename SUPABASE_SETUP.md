# Supabase Setup Guide

This guide walks you through setting up Supabase for the 2-BIZ Stock Checker with multi-tenant customer management.

## 🎯 Overview

The system supports two storage modes:
- **JSON Mode** (Development/Testing): Stores customer data in local JSON files
- **Supabase Mode** (Production): Multi-tenant database with authentication

## 📋 Prerequisites

- Node.js project with the 2-BIZ Stock Checker installed
- Supabase account (free tier available)
- Basic understanding of SQL and database concepts

## 🚀 Step 1: Create Supabase Project

1. **Sign up/Login to Supabase**
   - Go to [supabase.com](https://supabase.com)
   - Create a free account or login

2. **Create New Project**
   - Click "New Project"
   - Choose organization
   - Enter project name: `2-biz-stock-checker`
   - Generate a strong database password
   - Select region closest to your users
   - Click "Create new project"

3. **Wait for Setup**
   - Project creation takes ~2 minutes
   - You'll see a dashboard when ready

## 🔧 Step 2: Configure Database Schema

1. **Open SQL Editor**
   - In your Supabase dashboard, go to "SQL Editor"
   - Click "New query"

2. **Run the Migration Script**
   - Copy the contents of `src/lib/supabase/migrations/001_initial_schema.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

3. **Verify Tables Created**
   - Go to "Table Editor" in the sidebar
   - You should see: `tenants`, `profiles`, `customers`, `sales_orders`, `customer_sync_logs`

## 🔑 Step 3: Get Supabase Credentials

1. **Get Project URL and API Key**
   - Go to "Settings" → "API"
   - Copy the "Project URL"
   - Copy the "anon public" API key

2. **Update Environment Variables**
   ```bash
   # Copy env.example to .env.local
   cp env.example .env.local
   
   # Edit .env.local with your values
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   CUSTOMER_STORAGE_TYPE=supabase
   ```

## 👤 Step 4: Set Up Authentication

1. **Configure Auth Settings**
   - Go to "Authentication" → "Settings"
   - Configure email settings (or use default)
   - Set Site URL to your domain (e.g., `http://localhost:3000` for development)

2. **Enable Sign-up**
   - Ensure "Enable email confirmations" is configured as needed
   - For development, you can disable email confirmation

## 🏢 Step 5: Create Your First Tenant

Once your app is running with Supabase, you'll need to:

1. **Sign Up as a User**
   - Use your app's sign-up flow
   - This creates a profile automatically

2. **Create a Tenant (Organization)**
   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO tenants (name, slug, settings) 
   VALUES ('Your Company Name', 'your-company', '{}');
   
   -- Link your profile to the tenant
   UPDATE profiles 
   SET tenant_id = (SELECT id FROM tenants WHERE slug = 'your-company'),
       role = 'owner'
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

## 🔄 Step 6: Test Customer Sync

1. **Verify Configuration**
   ```bash
   # Check that your configuration is valid
   curl http://localhost:3000/api/sync-customers?action=health
   ```

2. **Run Initial Sync**
   ```bash
   # Sync customers from SPY system
   curl -X POST http://localhost:3000/api/sync-customers \
     -H "Content-Type: application/json" \
     -d '{"action": "full"}'
   ```

3. **Test Customer Lookup**
   - Try a sales order query in the chat: "Create order for [customer name]"
   - Should now find customers in your Supabase database

## 📊 Step 7: Monitor and Manage

1. **View Customer Data**
   - Go to "Table Editor" → "customers"
   - See all synced customers for your tenant

2. **Check Sync Logs**
   - Go to "Table Editor" → "customer_sync_logs"
   - Monitor sync operations and performance

3. **User Management**
   - Go to "Authentication" → "Users"
   - Manage user accounts and access

## 🔄 Switching Between Storage Types

### Development/Testing (JSON Mode)
```bash
# .env.local
CUSTOMER_STORAGE_TYPE=json
```
- Uses local JSON files in `data/` directory
- No authentication required
- Perfect for testing and development

### Production (Supabase Mode)
```bash
# .env.local
CUSTOMER_STORAGE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```
- Multi-tenant database with RLS
- User authentication required
- Production-ready scaling

## 🔧 Troubleshooting

### Common Issues

1. **"No tenant associated with user"**
   - User profile doesn't have a tenant_id
   - Run the tenant creation SQL above

2. **"Missing Supabase environment variables"**
   - Check `.env.local` file exists and has correct variables
   - Verify variables start with `NEXT_PUBLIC_`

3. **Customer sync fails**
   - Check SPY credentials are still valid
   - Verify network connectivity to SPY system
   - Check Supabase database connection

4. **RLS Policy Errors**
   - User might not have proper tenant access
   - Check user's profile has correct tenant_id

### Debugging Commands

```bash
# Check storage configuration
curl http://localhost:3000/api/sync-customers?action=health

# View storage type and config
node -e "
const { CustomerStorageFactory } = require('./src/lib/data/customerStorageFactory.ts');
console.log(CustomerStorageFactory.getConfigSummary());
"

# Test customer search
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{"message": "Find customer ABC Corp"}'
```

## 🚀 Next Steps

Once Supabase is set up:

1. **White-labeling**: Each user gets their own tenant
2. **Team collaboration**: Add multiple users to a tenant
3. **Advanced features**: Custom integrations, reporting, analytics
4. **Scaling**: Supabase handles the database scaling automatically

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

**Need Help?** Check the troubleshooting section above or consult the Supabase documentation. 