# Browser Automation Server

This is a dedicated server for handling browser automation and customer sync functionality that cannot run on Vercel's serverless environment.

## Features

- **Browser Automation**: Uses Playwright to scrape customer data from SPY system
- **REST API**: Provides HTTP endpoints for sync operations
- **Docker Support**: Ready for deployment on Railway, Render, or any Docker-compatible platform
- **TypeScript**: Full TypeScript support with proper type checking

## Quick Deployment

### Option 1: Railway (Recommended)

1. **Create Railway Account**: Go to [railway.app](https://railway.app)
2. **Deploy from GitHub**:
   ```bash
   # Push this browser-server folder to a separate GitHub repository
   git init
   git add .
   git commit -m "Initial browser automation server"
   git remote add origin https://github.com/your-username/browser-automation-server.git
   git push -u origin main
   ```
3. **Connect to Railway**:
   - Click "Deploy from GitHub"
   - Select your repository
   - Railway will auto-detect and deploy using the Dockerfile

4. **Set Environment Variables** in Railway:
   ```
   SPY_USER=your_spy_username
   SPY_PASS=your_spy_password
   CUSTOMER_STORAGE_TYPE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Get Your Server URL**: Railway will provide a URL like `https://your-app.railway.app`

### Option 2: Render

1. **Create Render Account**: Go to [render.com](https://render.com)
2. **Create New Web Service**: 
   - Connect your GitHub repository
   - Choose "Docker" as environment
   - Set build command: `docker build -t browser-server .`
   - Set start command: `docker run -p $PORT:3001 browser-server`

3. **Set Environment Variables** (same as Railway)

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp environment.example .env

# Edit .env with your actual credentials
nano .env

# Start development server
npm run dev

# Or build and start production server
npm run build
npm start
```

## Configure Your Vercel App

After deploying the browser automation server, add this environment variable to your Vercel project:

```
BROWSER_SERVER_URL=https://your-browser-server-url.railway.app
```

**In Vercel Dashboard**:
1. Go to your project → Settings → Environment Variables
2. Add: `BROWSER_SERVER_URL` = `https://your-deployed-server-url`
3. Deploy again

## How It Works

```
Vercel App (Frontend + APIs)
    ↓ HTTP POST /sync-customers
Railway/Render (Browser Automation Server)
    ↓ Playwright automation
SPY System (2-biz.spysystem.dk)
    ↓ Customer data
Storage (Supabase/JSON)
```

## API Endpoints

### `GET /health`
Health check endpoint
```json
{
  "status": "healthy",
  "service": "browser-automation-server",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": {
    "node_version": "v18.17.0",
    "has_spy_credentials": true,
    "storage_type": "supabase"
  }
}
```

### `POST /sync-customers`
Run customer sync
```json
{
  "action": "enhanced"  // or "quick", "standard"
}
```

Response:
```json
{
  "success": true,
  "customersFound": 150,
  "customersSaved": 150,
  "errors": [],
  "lastSync": "2024-01-01T00:00:00.000Z",
  "operation": "enhanced",
  "duration": 45000,
  "requestId": "abc123"
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPY_USER` | ✅ | SPY system username |
| `SPY_PASS` | ✅ | SPY system password |
| `CUSTOMER_STORAGE_TYPE` | ✅ | `supabase` or `json` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅* | Supabase project URL (*if using Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅* | Supabase anon key (*if using Supabase) |
| `PORT` | ❌ | Server port (default: 3001) |
| `NODE_ENV` | ❌ | `production` or `development` |

## Troubleshooting

### Common Issues

1. **"Missing SPY credentials"**
   - Make sure `SPY_USER` and `SPY_PASS` are set in your deployment platform

2. **"Playwright browser not found"**
   - The Docker build should handle this automatically
   - For local development: `npx playwright install --with-deps chromium`

3. **"Connection timeout"**
   - SPY system might be slow - this is normal for browser automation
   - Increase timeout in your Vercel app if needed

4. **"Storage errors"**
   - Check Supabase credentials if using Supabase storage
   - Ensure proper permissions in your Supabase project

### Logs

Check your deployment platform's logs:
- **Railway**: Project → Deploy Logs
- **Render**: Service → Logs tab

## Benefits of This Architecture

✅ **Separation of Concerns**: Browser automation isolated from main app  
✅ **Scalability**: Can scale browser automation independently  
✅ **Reliability**: Dedicated resources for heavy browser operations  
✅ **Cost Effective**: Only pay for automation server when needed  
✅ **Flexibility**: Can switch deployment platforms easily  

## Security Notes

- Never commit `.env` files to Git
- Use environment variables for all sensitive data
- Consider IP whitelisting if SPY system supports it
- Monitor server logs for unusual activity