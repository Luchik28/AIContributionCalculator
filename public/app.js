let currentStep = 1;
let foundProfiles = [];
let analyzedResults = null;

function updateProgress() {
  const progress = (currentStep / 4) * 100;
  document.getElementById('progressFill').style.width = progress + '%';
}

function goToStep(step) {
  // Validate current step before moving
  if (step === 3 && currentStep === 1) {
    const name = document.getElementById('userName').value.trim();
    if (!name) {
      alert('Please enter your name');
      return;
    }
  }
  
  // Hide all steps
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  
  // Show target step
  document.getElementById('step' + step).classList.add('active');
  currentStep = step;
  updateProgress();
}

function getInitial(text) {
  return (text || '?')[0].toUpperCase();
}

function getPlatformColor(platform) {
  const colors = {
    'Twitter/X': '#1DA1F2',
    'GitHub': '#333',
    'Reddit': '#FF4500',
    'Instagram': '#E4405F',
    'LinkedIn': '#0A66C2',
    'TikTok': '#000',
    'YouTube': '#FF0000',
    'Medium': '#000',
    'StackOverflow': '#F48024',
    'Dev.to': '#0A0A0A',
    'Facebook': '#1877F2'
  };
  return colors[platform] || '#667eea';
}

function detectPlatformFromUrl(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'Twitter/X';
  if (urlLower.includes('instagram.com')) return 'Instagram';
  if (urlLower.includes('github.com')) return 'GitHub';
  if (urlLower.includes('reddit.com')) return 'Reddit';
  if (urlLower.includes('linkedin.com')) return 'LinkedIn';
  if (urlLower.includes('tiktok.com')) return 'TikTok';
  if (urlLower.includes('youtube.com')) return 'YouTube';
  if (urlLower.includes('medium.com')) return 'Medium';
  if (urlLower.includes('stackoverflow.com')) return 'StackOverflow';
  if (urlLower.includes('dev.to')) return 'Dev.to';
  if (urlLower.includes('facebook.com')) return 'Facebook';
  return 'Unknown';
}

function getPlatformLogo(platform) {
  const logos = {
    'Twitter/X': 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png',
    'GitHub': 'https://github.githubassets.com/favicons/favicon.svg',
    'Reddit': 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
    'Instagram': 'https://static.cdninstagram.com/rsrc.php/v3/yt/r/30PrGfR3xhB.png',
    'LinkedIn': 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca',
    'TikTok': 'https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8152caf0c8e8bc67ae0d.png',
    'YouTube': 'https://www.youtube.com/s/desktop/014dbbed/img/favicon_144x144.png',
    'Medium': 'https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png',
    'StackOverflow': 'https://cdn.sstatic.net/Sites/stackoverflow/Img/apple-touch-icon@2.png',
    'Dev.to': 'https://dev-to-uploads.s3.amazonaws.com/uploads/logos/resized_logo_UQww2soKuUsjaOGNB38o.png',
    'Facebook': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/100px-2023_Facebook_icon.svg.png'
  };
  return logos[platform] || null;
}

async function searchProfiles() {
  const name = document.getElementById('userName').value.trim();
  
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  // Show loading
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('loading').classList.add('active');
  
  try {
    // Call backend to search for profiles
    const response = await fetch('/search-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, manualUrls: [], useBing: false })
    });
    
    const data = await response.json();
    
    if (data.error) {
      alert('Error: ' + data.error);
      goToStep(1);
      return;
    }
    
    if (data.results && data.results.length > 0) {
      // Filter out profiles with errors, but allow Twitter/X with 0 posts (they need manual entry)
      foundProfiles = data.results.filter(p => {
        if (p.error) return false;
        if (p.platform === 'Twitter/X') return true; // Always include Twitter/X for manual entry
        return p.posts > 0 && p.words > 0;
      });
      
      // Deduplicate by platform (keep first occurrence of each platform)
      const seenPlatforms = new Set();
      foundProfiles = foundProfiles.filter(profile => {
        if (seenPlatforms.has(profile.platform)) {
          return false;
        }
        seenPlatforms.add(profile.platform);
        return true;
      });
    } else {
      foundProfiles = [];
    }
    
    // Render profile list
    renderProfileList();
    goToStep(3);
    
  } catch (err) {
    alert('Error searching profiles: ' + err.message);
    goToStep(1);
  }
}

function renderProfileList() {
  const container = document.getElementById('profileList');
  
  if (foundProfiles.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No profiles found. Try adding manual URLs or add one below.</p>';
    return;
  }
  
  // Save which profile input was focused, if any
  let focusedUrl = null;
  let focusedValue = null;
  const activeElement = document.activeElement;
  if (activeElement && activeElement.type === 'number' && activeElement.dataset && activeElement.dataset.profileUrl) {
    focusedUrl = activeElement.dataset.profileUrl;
    focusedValue = activeElement.value;
  }
  
  container.innerHTML = '';
  
  foundProfiles.forEach((profile, index) => {
    const item = document.createElement('div');
    item.className = 'profile-item';
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'profile-remove';
    removeBtn.textContent = "This isn't me";
    removeBtn.onclick = () => removeProfile(index);
    
    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    avatar.style.background = getPlatformColor(profile.platform);
    
    // Use actual platform logo
    const logoUrl = getPlatformLogo(profile.platform);
    if (logoUrl) {
      const img = document.createElement('img');
      img.src = logoUrl;
      img.alt = profile.platform;
      avatar.appendChild(img);
      avatar.style.background = 'white';
    } else {
      avatar.innerHTML = getInitial(profile.platform);
    }
    
    const info = document.createElement('div');
    info.className = 'profile-info';
    
    const platform = document.createElement('div');
    platform.className = 'profile-platform';
    platform.textContent = profile.platform;
    
    const url = document.createElement('div');
    url.className = 'profile-url';
    url.innerHTML = `<a href="${profile.url}" target="_blank">${profile.url}</a>`;
    
    const stats = document.createElement('div');
    stats.className = 'profile-stats';
    
    // Determine if this profile needs manual input
    const needsManualInput = profile.error || profile.posts === 0 || profile.platform === 'Twitter/X' || profile.platform === 'Instagram';
    
    if (needsManualInput && !profile.manual) {
      stats.textContent = 'Please enter post count below';
      stats.style.color = '#667eea';
      stats.style.fontWeight = 'bold';
    } else if (profile.estimated) {
      stats.textContent = `~${profile.posts} posts, ~${profile.words} words (estimated)`;
    } else if (profile.posts > 0) {
      stats.textContent = `${profile.posts} posts, ${profile.words} words`;
    } else {
      stats.textContent = 'Please enter post count below';
      stats.style.color = '#667eea';
      stats.style.fontWeight = 'bold';
    }
    
    info.appendChild(platform);
    info.appendChild(url);
    info.appendChild(stats);
    
    // Add manual post count input for profiles that need it
    if (needsManualInput) {
      const manualInput = document.createElement('div');
      manualInput.style.marginTop = '10px';
      manualInput.style.display = 'flex';
      manualInput.style.gap = '10px';
      manualInput.style.alignItems = 'center';
      
      const label = document.createElement('span');
      label.textContent = 'Number of posts:';
      label.style.fontSize = '13px';
      label.style.color = '#666';
      label.style.fontWeight = 'bold';
      
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.placeholder = 'Required';
      input.value = profile.manual ? profile.posts : '';
      input.style.width = '120px';
      input.style.padding = '6px 10px';
      input.style.border = '2px solid #667eea';
      input.style.borderRadius = '5px';
      input.style.fontSize = '13px';
      input.style.pointerEvents = 'auto';
      input.style.cursor = 'text';
      input.style.zIndex = '10';
      input.dataset.profileUrl = profile.url; // Store URL to identify this input
      
      // Prevent click from bubbling up
      input.addEventListener('click', function(e) {
        e.stopPropagation();
      });
      
      // Store the profile URL to find it later
      const profileUrl = profile.url;
      
      // Function to update the profile
      const updateProfile = function() {
        const postsValue = parseInt(input.value);
        if (postsValue > 0) {
          // Find the profile by URL
          const targetProfile = foundProfiles.find(p => p.url === profileUrl);
          if (targetProfile) {
            targetProfile.posts = postsValue;
            targetProfile.words = postsValue * 25; // Average 25 words per post
            targetProfile.manual = true;
            targetProfile.error = null; // Clear any error
            
            // Update just the stats text without re-rendering everything
            stats.textContent = `${targetProfile.posts} posts, ${targetProfile.words} words`;
            stats.style.color = '#333';
            stats.style.fontWeight = 'normal';
          }
        }
      };
      
      // Update on blur (when user clicks away)
      input.addEventListener('blur', updateProfile);
      
      // Update on Enter key
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          updateProfile();
          input.blur(); // Remove focus so user knows it was saved
        }
      });
      
      const hint = document.createElement('span');
      hint.textContent = '(~25 words per post)';
      hint.style.fontSize = '11px';
      hint.style.color = '#999';
      
      manualInput.appendChild(label);
      manualInput.appendChild(input);
      manualInput.appendChild(hint);
      info.appendChild(manualInput);
    }
    
    item.appendChild(removeBtn);
    item.appendChild(avatar);
    item.appendChild(info);
    container.appendChild(item);
  });
  
  // Restore focus if an input was focused before re-render
  if (focusedUrl) {
    const inputToFocus = container.querySelector(`input[data-profile-url="${focusedUrl}"]`);
    if (inputToFocus) {
      inputToFocus.value = focusedValue;
      setTimeout(() => inputToFocus.focus(), 0);
    }
  }
}

function removeProfile(index) {
  foundProfiles.splice(index, 1);
  renderProfileList();
}

async function addProfile() {
  const urlInput = document.getElementById('addProfileUrl');
  const url = urlInput.value.trim();
  
  if (!url) {
    alert('Please enter a profile URL');
    return;
  }
  
  if (!url.startsWith('http')) {
    alert('Please enter a valid URL starting with http:// or https://');
    return;
  }
  
  // Check if URL already exists
  if (foundProfiles.some(p => p.url === url)) {
    alert('This profile has already been added');
    return;
  }
  
  // Show loading state
  const originalText = urlInput.value;
  urlInput.value = 'Fetching profile...';
  urlInput.disabled = true;
  
  try {
    // Fetch profile data
    const response = await fetch('/search-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualUrls: [url] })
    });
    
    const data = await response.json();
    
    if (data.error) {
      alert('Error: ' + data.error);
      urlInput.value = originalText;
      urlInput.disabled = false;
      return;
    }
    
    // ALWAYS add the profile if we got a response
    let newProfile;
    if (data.results && data.results.length > 0) {
      newProfile = data.results[0];
    } else {
      // Server returned empty results, create a basic profile
      newProfile = {
        url: url,
        platform: detectPlatformFromUrl(url),
        posts: 0,
        words: 0,
        error: null
      };
    }
    
    // If platform is Unknown but we can detect it from URL, update it
    if (newProfile.platform === 'Unknown' || !newProfile.platform) {
      newProfile.platform = detectPlatformFromUrl(url);
    }
    
    // Clear any error - we'll use manual input
    newProfile.error = null;
    
    // Add the profile
    foundProfiles.push(newProfile);
    renderProfileList();
    urlInput.value = '';
    
  } catch (err) {
    alert('Error fetching profile: ' + err.message);
    urlInput.value = originalText;
  } finally {
    urlInput.disabled = false;
  }
}

async function analyzeProfiles() {
  // Check if any profiles that need manual input don't have it yet
  const profilesNeedingManual = foundProfiles.filter(p => {
    const needsManual = p.error || p.posts === 0 || p.platform === 'Twitter/X' || p.platform === 'Instagram';
    return needsManual && (!p.manual || !p.posts);
  });
  
  if (profilesNeedingManual.length > 0) {
    alert('Please enter the number of posts for all profiles that require manual input before continuing.');
    return;
  }
  
  // All profiles should be valid at this point (either scraped or manually entered)
  const validProfiles = foundProfiles.filter(p => p.words > 0);
  
  if (validProfiles.length === 0) {
    alert('No valid profiles to analyze. Please add profiles and enter post counts.');
    return;
  }
  
  // Calculate totals
  let totalPosts = 0;
  let totalWords = 0;
  const byPlatform = {};
  
  validProfiles.forEach(profile => {
    totalPosts += profile.posts || 0;
    totalWords += profile.words || 0;
    
    const platform = profile.platform || 'Other';
    if (!byPlatform[platform]) {
      byPlatform[platform] = { posts: 0, words: 0, urls: [] };
    }
    byPlatform[platform].posts += profile.posts || 0;
    byPlatform[platform].words += profile.words || 0;
    byPlatform[platform].urls.push(profile.url);
  });
  
  const totalValue = totalWords * 0.0001;
  
  analyzedResults = {
    totalPosts,
    totalWords,
    totalValue,
    platformCount: Object.keys(byPlatform).length,
    byPlatform
  };
  
  renderResults();
  
  // Increment usage counter
  try {
    await fetch('/increment-usage', { method: 'POST' });
  } catch (err) {
    console.error('Error incrementing usage counter:', err);
  }
  
  goToStep(4);
}

function renderResults() {
  const { totalPosts, totalWords, totalValue, platformCount, byPlatform } = analyzedResults;
  
  document.getElementById('totalValue').textContent = '$' + totalValue.toFixed(2);
  document.getElementById('totalPosts').textContent = totalPosts.toLocaleString();
  document.getElementById('totalWords').textContent = totalWords.toLocaleString();
  document.getElementById('platformCount').textContent = platformCount;
  
  const breakdown = document.getElementById('platformBreakdown');
  breakdown.innerHTML = '<h2 style="margin-bottom:20px;color:#333;">Breakdown by Platform</h2>';
  
  for (const [platform, stats] of Object.entries(byPlatform)) {
    const card = document.createElement('div');
    card.className = 'platform-card';
    card.style.borderLeftColor = getPlatformColor(platform);
    
    const title = document.createElement('h3');
    title.textContent = platform;
    
    const postsStat = document.createElement('div');
    postsStat.className = 'stat';
    postsStat.textContent = `📝 ${stats.posts.toLocaleString()} posts`;
    
    const wordsStat = document.createElement('div');
    wordsStat.className = 'stat';
    wordsStat.textContent = `📊 ${stats.words.toLocaleString()} words`;
    
    const valueStat = document.createElement('div');
    valueStat.className = 'stat';
    const value = stats.words * 0.0001;
    valueStat.textContent = `💰 ~$${value.toFixed(2)} estimated value`;
    
    card.appendChild(title);
    card.appendChild(postsStat);
    card.appendChild(wordsStat);
    card.appendChild(valueStat);
    breakdown.appendChild(card);
  }
}

// Initialize
updateProgress();

// Add Enter key support for input fields
document.addEventListener('DOMContentLoaded', function() {
  // Name input - press Enter to search
  const nameInput = document.getElementById('userName');
  if (nameInput) {
    nameInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchProfiles();
      }
    });
  }
  
  // Add profile input - press Enter to add
  const addProfileInput = document.getElementById('addProfileUrl');
  if (addProfileInput) {
    addProfileInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        addProfile();
      }
    });
  }
  
  // Load usage counter on page load
  loadUsageCounter();
});

// Function to load and display usage counter
function loadUsageCounter() {
  fetch('/usage-count')
    .then(res => res.json())
    .then(data => {
      document.getElementById('usageCounterStep1').textContent = data.count.toLocaleString();
    })
    .catch(err => {
      console.error('Error fetching usage counter:', err);
      document.getElementById('usageCounterStep1').textContent = 'many';
    });
}
