const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API tokens from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

// Helper: Bing Web Search (requires BING_API_KEY env var)
async function bingSearch(query, limit = 5) {
  const key = process.env.BING_API_KEY;
  if (!key) throw new Error('Missing BING_API_KEY');
  const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`;
  const res = await axios.get(url, { headers: { 'Ocp-Apim-Subscription-Key': key } });
  const items = (res.data.webPages && res.data.webPages.value) || [];
  return items.slice(0, limit).map(i => i.url);
}

// Fallback: lightweight DuckDuckGo HTML parsing
async function duckDuckGoSearch(query, limit = 5) {
  // Generate name variations to search for
  const baseName = query.replace(/\s+/g, '').toLowerCase();
  const nameVariations = [
    query, // Original name with spaces
    baseName, // No spaces
    'real' + baseName,
    'the' + baseName,
    baseName + '18'
  ];
  
  const allResults = [];
  
  // Try first with exact name, then if not enough results, try variations
  for (const nameVariation of nameVariations) {
    if (allResults.length >= limit) break;
    
    // Add "profile" or social media sites to help find profiles, not posts
    const profileQuery = `${nameVariation} (site:twitter.com OR site:github.com OR site:reddit.com OR site:instagram.com OR site:linkedin.com OR site:tiktok.com OR site:youtube.com)`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(profileQuery)}`;
    
    try {
      const res = await axios.get(url, { headers: { 'User-Agent': 'AIContributionCalculator/1.0' } });
      const $ = cheerio.load(res.data);
      const results = [];
      
      $('a.result__a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && results.length < limit) {
          // DuckDuckGo wraps URLs in redirect - extract the actual URL
          const match = href.match(/uddg=([^&]+)/);
          if (match) {
            const actualUrl = decodeURIComponent(match[1]);
            results.push(actualUrl);
          }
        }
      });
      
      // If no result__a matches, try other link formats
      if (results.length === 0) {
        $('.result__url').each((i, el) => {
          const urlText = $(el).attr('href');
          if (urlText && results.length < limit) {
            // Try to extract from uddg parameter
            const match = urlText.match(/uddg=([^&]+)/);
            if (match) {
              const actualUrl = decodeURIComponent(match[1]);
              results.push(actualUrl);
            } else if (urlText.startsWith('http')) {
              results.push(urlText);
            }
          }
        });
      }
      
      allResults.push(...results);
    } catch (err) {
      console.log(`Search failed for variation "${nameVariation}":`, err.message);
    }
  }
  
  // Dedupe and limit
  return Array.from(new Set(allResults)).slice(0, limit * 2);
}

// Resolve redirect URLs to their final destination
async function resolveRedirectUrl(url) {
  // If it looks like a DuckDuckGo redirect, extract the actual URL
  if (url.includes('duckduckgo.com/l/')) {
    const match = url.match(/uddg=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    
    // Try to follow the redirect
    try {
      const res = await axios.head(url, { 
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 5000 
      });
      if (res.request && res.request.res && res.request.res.responseUrl) {
        return res.request.res.responseUrl;
      }
    } catch (err) {
      // If redirect fails, return original
    }
  }
  
  return url;
}

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes('twitter.com') || u.includes('x.com')) return 'Twitter/X';
  if (u.includes('facebook.com')) return 'Facebook';
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('linkedin.com')) return 'LinkedIn';
  if (u.includes('github.com')) return 'GitHub';
  if (u.includes('reddit.com')) return 'Reddit';
  if (u.includes('tiktok.com')) return 'TikTok';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('medium.com')) return 'Medium';
  if (u.includes('stackoverflow.com')) return 'StackOverflow';
  if (u.includes('dev.to')) return 'Dev.to';
  return 'Other';
}

function isKnownSocialPlatform(url) {
  const platform = detectPlatform(url);
  return platform !== 'Other';
}

// Check if URL is a profile page (not a post/video)
function isProfileUrl(url) {
  const u = url.toLowerCase();
  
  // Exclude individual posts/videos/articles
  if (u.includes('/status/')) return false; // Twitter individual tweet
  if (u.includes('/post/') && !u.includes('reddit.com')) return false; // Generic posts
  if (u.includes('/watch?v=') || u.includes('/shorts/')) return false; // YouTube videos
  if (u.includes('/video/')) return false; // TikTok individual videos
  if (u.includes('/p/') && u.includes('instagram.com')) return false; // Instagram posts
  if (u.includes('/pulse/') || u.includes('/posts/')) return false; // LinkedIn posts
  if (u.includes('/questions/') || u.includes('/a/')) return false; // StackOverflow individual Q&A
  if (u.includes('medium.com') && u.match(/\/[a-f0-9]{12,}/)) return false; // Medium article IDs
  
  // Must be profile-like URLs
  if (u.includes('github.com') && u.split('/').length <= 4) return true; // github.com/username
  if (u.includes('reddit.com') && (u.includes('/user/') || u.includes('/u/'))) return true;
  if (u.includes('twitter.com') && u.split('/').length <= 4) return true; // twitter.com/username
  if (u.includes('x.com') && u.split('/').length <= 4) return true;
  if (u.includes('instagram.com') && u.split('/').length <= 4) return true;
  if (u.includes('tiktok.com/@')) return true;
  if (u.includes('youtube.com/@') || u.includes('youtube.com/c/') || u.includes('youtube.com/user/')) return true;
  if (u.includes('linkedin.com/in/')) return true;
  if (u.includes('medium.com/@')) return true;
  if (u.includes('stackoverflow.com/users/')) return true;
  if (u.includes('dev.to/')) return true;
  if (u.includes('facebook.com') && !u.includes('/posts/')) return true;
  
  return false;
}

// GitHub API: Get user stats
async function fetchGitHubStats(username) {
  try {
    const headers = GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {};
    
    // Get user info
    const userRes = await axios.get(`https://api.github.com/users/${username}`, { headers });
    const user = userRes.data;
    
    // Get all repos
    const reposRes = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });
    const repos = reposRes.data;
    
    let totalCommits = 0;
    let totalIssues = 0;
    let totalPRs = 0;
    let totalWords = 0;
    
    // Sample first 10 repos for commits/content (to avoid rate limits)
    for (const repo of repos.slice(0, 10)) {
      try {
        // Get commits for this repo
        const commitsRes = await axios.get(
          `https://api.github.com/repos/${username}/${repo.name}/commits?author=${username}&per_page=100`,
          { headers }
        );
        totalCommits += commitsRes.data.length;
        
        // Count words in commit messages
        for (const commit of commitsRes.data) {
          const msg = commit.commit.message || '';
          totalWords += (msg.match(/\b\w+\b/g) || []).length;
        }
      } catch (err) {
        // Repo might be empty or inaccessible, skip
      }
    }
    
    // Get issues and PRs created by user (first 100)
    try {
      const issuesRes = await axios.get(
        `https://api.github.com/search/issues?q=author:${username}+type:issue&per_page=100`,
        { headers }
      );
      totalIssues = issuesRes.data.total_count;
      
      // Count words in issue titles and bodies
      for (const issue of issuesRes.data.items || []) {
        const text = (issue.title || '') + ' ' + (issue.body || '');
        totalWords += (text.match(/\b\w+\b/g) || []).length;
      }
    } catch (err) {}
    
    try {
      const prsRes = await axios.get(
        `https://api.github.com/search/issues?q=author:${username}+type:pr&per_page=100`,
        { headers }
      );
      totalPRs = prsRes.data.total_count;
    } catch (err) {}
    
    // Add README words from repos
    for (const repo of repos.slice(0, 10)) {
      if (repo.description) {
        totalWords += (repo.description.match(/\b\w+\b/g) || []).length;
      }
    }
    
    const posts = totalCommits + totalIssues + totalPRs;
    
    return {
      url: `https://github.com/${username}`,
      platform: 'GitHub',
      username,
      posts,
      words: totalWords,
      details: {
        repos: repos.length,
        commits: totalCommits,
        issues: totalIssues,
        prs: totalPRs
      },
      estimated: false,
      apiUsed: true
    };
  } catch (err) {
    return { 
      url: `https://github.com/${username}`, 
      platform: 'GitHub', 
      words: 0, 
      posts: 0, 
      error: err.message 
    };
  }
}

// Reddit API: Get user stats
async function fetchRedditStats(username) {
  try {
    let headers = { 'User-Agent': 'AIContributionCalculator/1.0' };
    let baseUrl = 'https://www.reddit.com';
    
    // Try to get OAuth token if credentials provided
    if (REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET) {
      try {
        const authRes = await axios.post(
          'https://www.reddit.com/api/v1/access_token',
          'grant_type=client_credentials',
          {
            auth: { username: REDDIT_CLIENT_ID, password: REDDIT_CLIENT_SECRET },
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'AIContributionCalculator/1.0'
            }
          }
        );
        headers['Authorization'] = `Bearer ${authRes.data.access_token}`;
        baseUrl = 'https://oauth.reddit.com';
      } catch (authErr) {
        console.log('Reddit OAuth failed, falling back to public API:', authErr.message);
        // Fall back to public API without auth
      }
    }
    
    // Get user info (public endpoint works without auth)
    const userRes = await axios.get(`${baseUrl}/user/${username}/about.json`, { headers });
    const user = userRes.data.data;
    
    // Get user's posts and comments (public endpoints)
    const postsRes = await axios.get(`${baseUrl}/user/${username}/submitted.json?limit=100`, { headers });
    const commentsRes = await axios.get(`${baseUrl}/user/${username}/comments.json?limit=100`, { headers });
    
    const posts = postsRes.data.data.children || [];
    const comments = commentsRes.data.data.children || [];
    
    let totalWords = 0;
    
    // Count words in posts
    for (const post of posts) {
      const text = (post.data.title || '') + ' ' + (post.data.selftext || '');
      totalWords += (text.match(/\b\w+\b/g) || []).length;
    }
    
    // Count words in comments
    for (const comment of comments) {
      const text = comment.data.body || '';
      totalWords += (text.match(/\b\w+\b/g) || []).length;
    }
    
    const totalPosts = posts.length + comments.length;
    const karma = (user.link_karma || 0) + (user.comment_karma || 0);
    
    return {
      url: `https://reddit.com/user/${username}`,
      platform: 'Reddit',
      username,
      posts: totalPosts,
      words: totalWords,
      details: {
        postKarma: user.link_karma,
        commentKarma: user.comment_karma,
        totalKarma: karma,
        postCount: posts.length,
        commentCount: comments.length
      },
      estimated: false,
      apiUsed: true,
      note: 'Showing last 100 posts + 100 comments (API limit)'
    };
  } catch (err) {
    return { 
      url: `https://reddit.com/user/${username}`, 
      platform: 'Reddit', 
      words: 0, 
      posts: 0, 
      error: err.message 
    };
  }
}

async function fetchProfileStats(url) {
  // Check if this is a GitHub or Reddit profile and use API if available
  const platform = detectPlatform(url);
  
  // Extract username from URL and normalize Reddit URLs
  if (platform === 'GitHub') {
    const match = url.match(/github\.com\/([^\/\?]+)/i);
    if (match && match[1]) {
      return await fetchGitHubStats(match[1]);
    }
  }
  
  if (platform === 'Reddit') {
    // Handle various Reddit URL formats and normalize them
    let match = url.match(/reddit\.com\/(?:u|user)\/([^\/\?]+)/i);
    if (!match) {
      // Try to extract from just reddit.com/username format
      match = url.match(/reddit\.com\/([^\/\?]+)/i);
    }
    if (match && match[1]) {
      return await fetchRedditStats(match[1]);
    }
  }
  
  // Fall back to scraping for other platforms
  try {
    const res = await axios.get(url, { 
      timeout: 10000, 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      } 
    });
    
    // Check for 404 or profile not found
    if (res.status === 404) {
      return { url, platform: detectPlatform(url), words: 0, posts: 0, error: 'Profile not found (404)' };
    }
    
    const $ = cheerio.load(res.data);
    const html = res.data;
    
    // Extract visible text
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const words = (text.match(/\b\w+\b/g) || []).length;
    
    // Debug logging for Twitter/X
    if (platform === 'Twitter/X') {
      console.log(`\n=== DEBUG: Twitter/X Profile ===`);
      console.log(`URL: ${url}`);
      console.log(`HTML snippet (first 500 chars): ${html.substring(0, 500)}`);
      console.log(`Text snippet (first 500 chars): ${text.substring(0, 500)}`);
      console.log(`HTML includes "doesn't exist": ${html.toLowerCase().includes("doesn't exist")}`);
      console.log(`HTML includes "This account doesn't exist": ${html.toLowerCase().includes("this account doesn't exist")}`);
      console.log(`Text includes "doesn't exist": ${text.toLowerCase().includes("doesn't exist")}`);
    }
    
    // Check for common "profile doesn't exist" indicators in BOTH HTML and text
    const lowerText = text.toLowerCase();
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes("this account doesn't exist") || 
        lowerHtml.includes("this profile doesn't exist") ||
        lowerHtml.includes("account suspended") ||
        lowerHtml.includes("user not found") ||
        lowerHtml.includes("page not found") ||
        lowerText.includes("this account doesn't exist") || 
        lowerText.includes("this profile doesn't exist") ||
        lowerText.includes("account suspended") ||
        lowerText.includes("user not found") ||
        lowerText.includes("page not found")) {
      console.log(`Profile doesn't exist detected for: ${url}`);
      return { url, platform: detectPlatform(url), words: 0, posts: 0, error: 'Profile does not exist' };
    }
    
    let posts = 0;
    let estimated = false;
    let followers = 0;
    
    // Check if we hit a login wall or JS-only page (very few words scraped)
    const likelyLoginWall = words < 100;
    
    if (platform === 'Twitter/X') {
      // Twitter/X is a JavaScript-heavy SPA - we can't reliably extract data without a browser
      // Return profile but require manual post count entry
      
      console.log(`DEBUG Twitter: Returning profile without post count - requires manual entry`);
      
      // Try to extract post count from the profile page (usually won't work)
      let tweetsText = text.match(/(\d+(?:,\d+)*)\s+posts/i);
      if (!tweetsText) {
        tweetsText = text.match(/(\d+(?:,\d+)*)\s*(?:Tweets|Posts)/i);
      }
      
      if (tweetsText) {
        posts = parseInt(tweetsText[1].replace(/,/g, ''));
        estimated = false;
        console.log(`DEBUG Twitter: Extracted posts = ${posts}`);
      } else {
        // Don't provide estimate - user must enter manually
        console.log(`DEBUG Twitter: No post count extracted - returning 0 to require manual entry`);
        posts = 0;
        words = 0;
        estimated = false;
      }
    } else if (platform === 'Instagram') {
      // Instagram shows counts in meta tags and visible text
      const postsMatch = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/i) ||
                        text.match(/(\d+(?:,\d+)*)\s*posts/i);
      const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)/i) ||
                            text.match(/(\d+(?:,\d+)*)\s*followers/i);
      
      if (postsMatch) {
        posts = parseInt(postsMatch[1].replace(/,/g, ''));
        estimated = false;
      } else if (likelyLoginWall) {
        posts = 1000;
        estimated = true;
      }
      
      if (followersMatch) {
        followers = parseInt(followersMatch[1].replace(/,/g, ''));
      }
    } else if (platform === 'LinkedIn') {
      const postsText = text.match(/(\d+(?:,\d+)*)\s*posts/i);
      const connectionsText = text.match(/(\d+(?:,\d+)*)\s*connections/i);
      
      if (postsText) {
        posts = parseInt(postsText[1].replace(/,/g, ''));
      } else if (likelyLoginWall) {
        posts = 200;
        estimated = true;
      }
      
      if (connectionsText) {
        followers = parseInt(connectionsText[1].replace(/,/g, ''));
      }
    } else if (platform === 'TikTok') {
      // TikTok shows video count
      const videosMatch = html.match(/"videoCount":(\d+)/i) ||
                         text.match(/(\d+(?:,\d+)*)\s*(?:Videos|Posts)/i);
      const followersMatch = html.match(/"followerCount":(\d+)/i) ||
                            text.match(/(\d+(?:,\d+)*)\s*Followers/i);
      
      if (videosMatch) {
        posts = parseInt(videosMatch[1].replace(/,/g, ''));
      } else if (likelyLoginWall) {
        posts = 500;
        estimated = true;
      }
      
      if (followersMatch) {
        followers = parseInt(followersMatch[1].replace(/,/g, ''));
      }
    } else if (platform === 'YouTube') {
      // YouTube shows video count and subscriber count
      const videosText = text.match(/(\d+(?:,\d+)*)\s*videos/i);
      const subscribersText = text.match(/(\d+(?:\.?\d*[KMB]?)\s*subscribers)/i);
      
      if (videosText) {
        posts = parseInt(videosText[1].replace(/,/g, ''));
      } else if (likelyLoginWall) {
        posts = 100;
        estimated = true;
      }
      
      if (subscribersText) {
        const subStr = subscribersText[1];
        if (subStr.includes('K')) followers = parseFloat(subStr) * 1000;
        else if (subStr.includes('M')) followers = parseFloat(subStr) * 1000000;
        else if (subStr.includes('B')) followers = parseFloat(subStr) * 1000000000;
        else followers = parseFloat(subStr);
      }
    } else if (platform === 'Medium') {
      // Medium shows story count
      const storiesText = text.match(/(\d+(?:,\d+)*)\s*(?:Stories|stories)/i);
      const followersText = text.match(/(\d+(?:,\d+)*)\s*Followers/i);
      
      if (storiesText) {
        posts = parseInt(storiesText[1].replace(/,/g, ''));
      } else {
        posts = $('article').length || 10;
        estimated = true;
      }
      
      if (followersText) {
        followers = parseInt(followersText[1].replace(/,/g, ''));
      }
    } else if (platform === 'StackOverflow') {
      // Stack Overflow shows answers and reputation
      const answersText = text.match(/(\d+(?:,\d+)*)\s*answers/i);
      const questionsText = text.match(/(\d+(?:,\d+)*)\s*questions/i);
      const reputationText = text.match(/reputation\s*(\d+(?:,\d+)*)/i);
      
      let answers = 0, questions = 0;
      if (answersText) answers = parseInt(answersText[1].replace(/,/g, ''));
      if (questionsText) questions = parseInt(questionsText[1].replace(/,/g, ''));
      posts = answers + questions;
      
      if (reputationText) {
        followers = parseInt(reputationText[1].replace(/,/g, ''));
      }
    } else if (platform === 'Dev.to') {
      const postsText = text.match(/(\d+(?:,\d+)*)\s*posts?\s*published/i);
      const followersText = text.match(/(\d+(?:,\d+)*)\s*followers/i);
      
      if (postsText) {
        posts = parseInt(postsText[1].replace(/,/g, ''));
      } else {
        posts = $('article').length || 10;
        estimated = true;
      }
      
      if (followersText) {
        followers = parseInt(followersText[1].replace(/,/g, ''));
      }
    } else {
      posts = $('article').length || $('[role="article"]').length || 1;
    }
    
    // Estimate words per post based on platform norms
    let wordsPerPost = 50;
    if (platform === 'Twitter/X') wordsPerPost = 30;
    if (platform === 'Instagram') wordsPerPost = 20;
    if (platform === 'LinkedIn') wordsPerPost = 150;
    if (platform === 'TikTok') wordsPerPost = 15;
    if (platform === 'YouTube') wordsPerPost = 100; // descriptions
    if (platform === 'Medium') wordsPerPost = 800; // full articles
    if (platform === 'StackOverflow') wordsPerPost = 200;
    if (platform === 'Dev.to') wordsPerPost = 600;
    
    // If we estimated posts and have low word count, estimate words too
    if (estimated && words < 100) {
      words = posts * wordsPerPost;
    }
    
    const result = { 
      url, 
      platform, 
      words, 
      posts, 
      estimated,
      apiUsed: false,
      note: estimated ? 'Estimated (page requires login/JS)' : undefined 
    };
    
    if (followers > 0) {
      result.details = { followers };
    }
    
    return result;
  } catch (err) {
    // Check for 404 in error
    if (err.response && err.response.status === 404) {
      return { url, platform: detectPlatform(url), words: 0, posts: 0, error: 'Profile not found (404)' };
    }
    return { url, platform: detectPlatform(url), words: 0, posts: 0, error: err.message };
  }
}

// POST /search-profiles
// body: { name: string, useBing?: boolean, manualUrls?: string[] }
app.post('/search-profiles', async (req, res) => {
  const { name, useBing, manualUrls } = req.body || {};
  if (!name && (!manualUrls || manualUrls.length === 0)) {
    return res.status(400).json({ error: 'Provide a name or manualUrls' });
  }

  let urls = [];
  if (manualUrls && manualUrls.length > 0) {
    urls = manualUrls.slice(0, 10);
  } else {
    try {
      if (useBing) {
        urls = await bingSearch(name, 10);
      } else {
        urls = await duckDuckGoSearch(name, 10);
      }
    } catch (err) {
      // If search fails, return a helpful message and an empty results array
      return res.status(500).json({ error: 'Search failed: ' + err.message, help: 'Provide manualUrls or set BING_API_KEY for Bing search.' });
    }
  }

  // Resolve any redirect URLs to their final destinations
  const resolvedUrls = [];
  for (const url of urls) {
    const resolved = await resolveRedirectUrl(url);
    resolvedUrls.push(resolved);
  }
  urls = resolvedUrls;

  // Filter to only known social media platforms AND profile pages (not individual posts)
  urls = urls.filter(url => isKnownSocialPlatform(url) && isProfileUrl(url));
  
  // Limit and dedupe
  urls = Array.from(new Set(urls)).slice(0, 6);
  
  // If we didn't find any social media URLs, try variations of the name
  if (urls.length === 0 && name) {
    const baseName = name.replace(/\s+/g, '').toLowerCase();
    const nameVariations = [
      baseName,
      'real' + baseName,
      'the' + baseName,
      baseName + '18',
      baseName + '2024',
      baseName + '1',
      baseName + 'official'
    ];
    
    const platforms = [
      { domain: 'twitter.com', prefix: '' },
      { domain: 'github.com', prefix: '' },
      { domain: 'reddit.com', prefix: 'user/' },
      { domain: 'instagram.com', prefix: '' },
      { domain: 'linkedin.com', prefix: 'in/', separator: '-' }
    ];
    
    const candidateUrls = [];
    for (const platform of platforms) {
      for (const variation of nameVariations) {
        const username = platform.separator ? variation.replace(/(\w)([A-Z])/g, '$1-$2').toLowerCase() : variation;
        candidateUrls.push(`https://${platform.domain}/${platform.prefix}${username}`);
      }
    }
    
    // Try the most likely variations first (exact name, then common prefixes)
    urls = candidateUrls.slice(0, 15);
  }

  // Fetch profiles in sequence (to avoid many parallel requests); small limit to be polite
  const results = [];
  for (const url of urls) {
    const r = await fetchProfileStats(url);
    results.push(r);
  }

  // Aggregate by platform
  const byPlatform = {};
  let totalWords = 0, totalPosts = 0;
  for (const r of results) {
    const p = r.platform || 'Other';
    if (!byPlatform[p]) byPlatform[p] = { urls: [], words: 0, posts: 0 };
    byPlatform[p].urls.push(r.url);
    byPlatform[p].words += r.words || 0;
    byPlatform[p].posts += r.posts || 0;
    totalWords += r.words || 0;
    totalPosts += r.posts || 0;
  }

  return res.json({ name, results, byPlatform, totals: { totalWords, totalPosts } });
});

app.listen(PORT, () => console.log(`AI Contribution Calculator server listening on http://localhost:${PORT}`));
