# Quick Deployment Instructions

## What I've Done

✅ Installed `@vercel/kv` package
✅ Updated server code to support both local file storage (development) and Vercel KV (production)
✅ Created `vercel.json` configuration file
✅ Added detailed deployment guide in `DEPLOYMENT.md`
✅ Updated `.gitignore` to exclude local counter file

## To Deploy to Vercel

### Quick Steps:

1. **Push your code to GitHub** (if you haven't already)
   ```bash
   git add .
   git commit -m "Add Vercel KV support for persistent counter"
   git push
   ```

2. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Import your GitHub repository
   - Click "Deploy"

3. **Set Up Vercel KV Database** (THIS IS CRITICAL!)
   - Go to your project → "Storage" tab
   - Click "Create Database" → Choose "KV"
   - Name it (e.g., "usage-counter")
   - Click "Create"
   - Vercel automatically connects it to your project

4. **Done!** Your counter will now persist across all deployments

### Optional: Add API Keys

If you want GitHub/Reddit data:
- Go to Settings → Environment Variables
- Add `GITHUB_TOKEN`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`
- Redeploy

## How It Works

- **Locally**: Uses `usage-counter.json` file (works as before)
- **On Vercel**: Automatically uses Vercel KV (Redis database)
- **Counter persists**: Even when you deploy new versions!

## No Code Changes Needed for Future Deployments

The code automatically detects the environment and uses the right storage method. Just deploy normally and the counter keeps working!
