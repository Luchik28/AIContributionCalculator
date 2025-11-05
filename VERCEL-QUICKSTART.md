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

3. **CRITICAL: Set Up Vercel KV Database** (redis-pink-village)
   - Go to your project → "Storage" tab
   - If "redis-pink-village" is already there and shows "Connected", you're good!
   - If not: Click "Create Database" → Choose "KV"
   - Name it: `redis-pink-village`
   - Click "Create"
   - Vercel automatically connects it to your project

4. **Done!** Your counter will now persist across all deployments

### Optional: Add API Keys for Better Data

**Recommended API Keys:**

1. **GITHUB_TOKEN** (Free, highly recommended)
   - Go to: https://github.com/settings/tokens
   - Generate token (classic) with `public_repo` and `read:user` scopes
   - In Vercel: Settings → Environment Variables
   - Add: `GITHUB_TOKEN` = `ghp_your_token`

2. **REDDIT_CLIENT_ID & REDDIT_CLIENT_SECRET** (Free, optional)
   - Go to: https://www.reddit.com/prefs/apps
   - Create app (type: script)
   - In Vercel: Add both variables

After adding variables, click "Redeploy" in Vercel dashboard.

## How It Works

- **Locally**: Uses `usage-counter.json` file (works as before)
- **On Vercel**: Automatically uses Vercel KV (Redis database)
- **Counter persists**: Even when you deploy new versions!

## No Code Changes Needed for Future Deployments

The code automatically detects the environment and uses the right storage method. Just deploy normally and the counter keeps working!
