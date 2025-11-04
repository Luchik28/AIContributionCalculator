# Vercel Deployment Guide

## Prerequisites
1. A Vercel account (sign up at https://vercel.com)
2. Your GitHub repository pushed to GitHub

## Step 1: Install Vercel CLI (Optional but Recommended)

```bash
npm install -g vercel
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your GitHub repository (`Luchik28/AIContributionCalculator`)
4. Vercel will auto-detect the Node.js project
5. Click "Deploy"

### Option B: Using Vercel CLI

```bash
# In your project directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? AIContributionCalculator
# - Directory? ./
# - Override settings? No
```

## Step 3: Set Up Vercel KV (Critical for Counter)

1. Go to your Vercel Dashboard
2. Select your project
3. Click on the "Storage" tab
4. Click "Create Database"
5. Choose "KV (Redis)"
6. Name it something like "usage-counter"
7. Select a region (pick one close to your users)
8. Click "Create"

**Important:** Vercel will automatically add the environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

## Step 4: Add Environment Variables (Optional)

If you want to use GitHub/Reddit APIs:

1. In your Vercel project dashboard, go to "Settings" → "Environment Variables"
2. Add these variables:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `REDDIT_CLIENT_ID`: Your Reddit app client ID
   - `REDDIT_CLIENT_SECRET`: Your Reddit app secret
3. Make sure to select "Production", "Preview", and "Development" for each

## Step 5: Redeploy (If You Added Environment Variables)

If you added environment variables after the first deployment:

```bash
vercel --prod
```

Or use the Vercel dashboard:
1. Go to "Deployments"
2. Click "..." on the latest deployment
3. Select "Redeploy"

## Step 6: Test Your Deployment

1. Visit your Vercel URL (something like `your-project.vercel.app`)
2. Try the calculator
3. Refresh the page - the counter should persist!

## Troubleshooting

### Counter shows 0 or doesn't increment
- Make sure Vercel KV is set up and connected
- Check the "Storage" tab shows your KV database as "Connected"
- Check deployment logs for errors

### Environment variables not working
- Redeploy after adding environment variables
- Make sure variables are set for "Production" environment

### 404 errors
- Make sure `vercel.json` is in your repository root
- Redeploy the project

## Custom Domain (Optional)

1. Go to "Settings" → "Domains"
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

## Monitoring

- Check deployment logs: Dashboard → Deployments → Select deployment → View Function Logs
- Monitor counter: Dashboard → Storage → Select KV database → Browse data

## Local Development Still Works!

The code automatically detects if it's running locally (without Vercel KV environment variables) and falls back to using the local JSON file. So you can still develop locally without any changes!

```bash
node server.js
# Uses local file: usage-counter.json
```

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Vercel KV Documentation: https://vercel.com/docs/storage/vercel-kv
