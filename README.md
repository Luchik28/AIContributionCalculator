# AI Contribution Calculator

A web application that calculates the estimated value of your social media content as AI training data. This project aims to raise awareness about how tech companies use public social media posts to train large language models, often without compensating the content creators.

## About

AI companies like OpenAI, Google, and Meta scrape billions of posts from social media platforms to train their language models. While these companies profit billions from AI systems, the people who created the training data receive nothing.

This tool helps you:
- Discover your social media profiles across platforms
- Calculate how many words you've contributed
- Estimate the monetary value of your content as training data (~$0.0001 per word)
- Learn about AI training data and your digital footprint

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/Luchik28/AIContributionCalculator.git
cd AIContributionCalculator
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up API keys (optional but recommended for better data)**

### GitHub API (Free - Highly Recommended)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `public_repo`, `read:user`
4. Copy the token and set environment variable:

```bash
# Linux/Mac
export GITHUB_TOKEN="your_token_here"

# Windows PowerShell
$env:GITHUB_TOKEN = "your_token_here"
```

### Reddit API (Optional - Free)
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "script" type
4. Set redirect URI to `http://localhost:3000`
5. Copy client ID and secret:

```bash
# Linux/Mac
export REDDIT_CLIENT_ID="your_client_id"
export REDDIT_CLIENT_SECRET="your_secret"

# Windows PowerShell
$env:REDDIT_CLIENT_ID = "your_client_id"
$env:REDDIT_CLIENT_SECRET = "your_secret"
```

4. **Start the server**
```bash
node server.js
```

5. **Open in browser**
Navigate to http://localhost:3000

## Usage

1. **Enter Your Name**: Type your full name on the first page
2. **Review Profiles**: The app will search for your profiles across platforms
3. **Add Missing Profiles**: Manually add any profiles that weren't found
4. **Enter Post Counts**: For platforms like Twitter/X and Instagram that can't be scraped, enter your post count manually
5. **Calculate**: View your total contribution value and breakdown by platform
6. **Learn More**: Read about how AI companies use your data

## How It Works

### Profile Discovery
The app searches for social media profiles using either:
- DuckDuckGo HTML search (default, no API key needed)
- Bing Web Search API (optional, set `BING_API_KEY` for better results)

### Data Collection
For each profile:
- **GitHub**: Uses official API to count commits, issues, and PRs (requires `GITHUB_TOKEN`)
- **Reddit**: Uses public JSON endpoints to count posts and comments
- **Other platforms**: Attempts HTML scraping or requires manual post count entry

### Value Calculation
- Word count estimated at ~25 words per post (varies by platform)
- Training data value: **$0.0001 per word** (based on industry estimates)
- Example: 10,000 posts × 25 words × $0.0001 = ~$25

## Limitations

- **Modern platforms require authentication**: Twitter/X, Instagram, Facebook block scrapers
- **Manual entry required**: Some platforms need you to enter post counts manually
- **Estimates**: Word counts and values are approximations based on industry data
- **Rate limiting**: Some platforms may block requests if used too frequently

## Technology Stack

- **Backend**: Node.js, Express
- **Web Scraping**: Axios, Cheerio
- **APIs**: GitHub REST API, Reddit JSON API
- **Frontend**: Vanilla JavaScript, CSS
- **Data Storage**: Local JSON file for usage counter

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Add support for additional platforms
- Improve scraping accuracy
- Enhance the UI/UX

## License

MIT License - Feel free to use this project for educational or commercial purposes.

## Disclaimer

This tool is for educational purposes to raise awareness about AI training data. It provides estimates based on publicly available information and industry pricing. Actual data value may vary. Always respect platform Terms of Service when scraping or accessing data.
- Domain specificity
- Recency and relevance

Real AI training data is often licensed in bulk, and individual contribution value is nearly impossible to calculate precisely.