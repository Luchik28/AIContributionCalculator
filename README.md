# AI Contribution Calculator (Demo)

This demo estimates how much text a person has produced on public profiles and provides a rough "AI training data value" calculation in USD.

## Important Limitations

- **Modern social platforms require authentication**: Twitter/X, Instagram, Facebook, and LinkedIn all hide most content behind login walls. Simple HTML scraping (what this demo does) only sees placeholder text.
- **JavaScript rendering**: Many platforms render content client-side with JavaScript, which means server-side scraping gets empty pages.
- **Rate limiting**: Platforms actively block scrapers and bots.

### For accurate data, you need official APIs:
- **Twitter/X**: [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api) (requires approval, paid tiers for extensive access)
- **Instagram**: [Instagram Graph API](https://developers.facebook.com/docs/instagram-api) (requires Facebook app + permissions)
- **LinkedIn**: [LinkedIn API](https://docs.microsoft.com/en-us/linkedin/) (requires OAuth, limited access)
- **GitHub**: [GitHub REST API](https://docs.github.com/en/rest) (generous free tier, easy to use)

### What this demo does:
When it detects a login wall or JS-only page (very few words scraped), it provides **conservative estimates** based on typical user activity:
- Twitter/X active users: ~5,000 tweets estimate
- Instagram: ~1,000 posts estimate  
- LinkedIn: ~200 posts estimate
- Word counts estimated at platform-typical averages (30 words/tweet, 150 words/LinkedIn post, etc.)

## Run locally

1. Install dependencies

```powershell
cd "c:\Users\28taidan\OneDrive - Hawken School\Documents\GitHub\AIContributionCalculator"
npm install
```

2. **(RECOMMENDED) Set up API keys for accurate data**

### GitHub API (Free - No approval needed)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `public_repo`, `read:user`
4. Copy the token

```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

### Reddit API (Free - Instant approval)
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" type
4. Fill in name, description, redirect uri: `http://localhost:3000`
5. Copy the client ID (under app name) and secret

```powershell
$env:REDDIT_CLIENT_ID = "your_client_id"
$env:REDDIT_CLIENT_SECRET = "your_secret"
```

### Bing Search API (Optional - for automated name search)
```powershell
$env:BING_API_KEY = "your_bing_key"
```

3. Start server

```powershell
node server.js
```

4. Open http://localhost:3000 in your browser.

**Pro tip**: If you don't set API keys, the app will fall back to scraping/estimates. But with GitHub and Reddit tokens, you'll get **real, accurate data** for those platforms!

## How it works

1. **Search**: Enter a name and the server searches for profile URLs (using Bing API if `BING_API_KEY` is set, otherwise DuckDuckGo HTML fallback)
2. **Scrape**: Server fetches each profile page and tries to extract:
   - Visible text and word counts
   - Post/tweet counts from page text (e.g., "25,347 Tweets")
   - Platform-specific selectors for content
3. **Estimate**: If scraping fails (login wall detected), provides conservative estimates
4. **Calculate**: Aggregates by platform and estimates rough USD value (~$0.0001/word for training data)

## Better alternatives for real data

### Option 1: Use official APIs
I can help you integrate real APIs if you want accurate data:
- Set up Twitter API access (you'll need to apply for developer account)
- Use Instagram Graph API (requires Facebook Developer app)
- GitHub API (easiest, no approval needed)

### Option 2: Provide manual profile URLs
Instead of searching, paste direct profile URLs in the textarea. The scraper will try to extract visible stats from those specific pages.

### Option 3: Browser extension approach
A browser extension could access pages while you're logged in, giving access to real data (but raises privacy/ToS concerns).

## Value calculation

The app estimates AI training data value at ~$0.0001 per word. This is a **very rough industry estimate** and actual value varies based on:
- Data quality and uniqueness
- Licensing and legal clarity
- Domain specificity
- Recency and relevance

Real AI training data is often licensed in bulk, and individual contribution value is nearly impossible to calculate precisely.

If you want me to wire up real API access (e.g., help you get a Bing key, or integrate fullcontact/pipl/people-search APIs) or to add more accurate per-platform parsers, tell me which providers you prefer and I will extend the implementation.
