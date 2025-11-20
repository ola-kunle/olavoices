# 📰 OlaVoices News Automation - Setup Guide

## What This Does

Automatically publishes **3 emotionally compelling African news stories per day** to drive traffic to your site.

### Features:
- ✅ **Emotional Impact Filter** - AI evaluates if news touches hearts/strikes nerves
- ✅ **30+ Credible Sources** - BBC, Reuters, Al Jazeera, Premium Times, TechCabal, etc.
- ✅ **Fancy News Site** - Professional design with Breaking badges, categories, source citations
- ✅ **3x Daily Posting** - 6 AM, 2 PM, 10 PM UTC (7 AM, 3 PM, 11 PM Lagos time)
- ✅ **100% Free** - Uses free tiers of NewsAPI, Groq, Pexels
- ✅ **Smart Quality Bar** - Only publishes when news is genuinely compelling (may be 0-3 posts/day)

## Setup Steps

### 1. Get NewsAPI Key (FREE)

1. Go to https://newsapi.org
2. Click "Get API Key"
3. Sign up (free tier: 100 requests/day)
4. Copy your API key

### 2. Add to Local .env

```bash
cd automation
nano .env
```

Add this line:
```
NEWS_API_KEY=your_actual_newsapi_key_here
```

### 3. Add to GitHub Secrets

1. Go to https://github.com/ola-kunle/olavoices/settings/secrets/actions
2. Click "New repository secret"
3. Name: `NEWS_API_KEY`
4. Value: `your_actual_newsapi_key_here`
5. Click "Add secret"

### 4. Install Dependencies

```bash
cd automation
npm install
```

This installs:
- `groq-sdk` - For AI content generation
- (Other dependencies already installed)

### 5. Test Locally

```bash
cd automation
npm run news
```

**Expected output:**
```
📰 OlaVoices News Automation System
=====================================

🔍 Step 1: Finding compelling African news stories...

📄 Evaluating: "Nigerian Teen Cracks MIT's Hardest Math Problem"
   Source: BBC
   Score: 9/10 - Heartwarming story about African excellence...
   ✅ SELECTED for publication!

✅ Found 2 compelling stories out of 15 evaluated

📝 Step 2: Generating article content...
✅ Article: "Nigerian Teen Makes History with MIT Math Breakthrough"

🖼️  Step 3: Finding and optimizing image...
✅ Found unique image...

🎉 SUCCESS! News articles published!
```

**Note:** If it says "No compelling news found" - that's normal! The system has high standards.

## How It Works

### AI Evaluation Process

For each news story from NewsAPI:
1. **Fetch** - Get 30-60 recent African news articles
2. **Evaluate** - AI rates 1-10 on emotional appeal:
   - ✅ 7+ = Publish (touches hearts, strikes nerves, shareable)
   - ❌ Below 7 = Skip (too boring/dry)
3. **Generate** - Write 500-700 word article with source citations
4. **Publish** - Create HTML page, update news.html, commit to Git

### Posting Schedule

GitHub Actions runs 3x daily:
- **6 AM UTC** (7 AM Lagos) - Morning news
- **2 PM UTC** (3 PM Lagos) - Afternoon news
- **10 PM UTC** (11 PM Lagos) - Evening news

**Each run attempts to publish up to 3 stories, but only if they pass the quality bar.**

Result: **0-3 posts per run, 0-9 posts per day**

## Cost Breakdown

| Service | Usage | Daily Limit | Monthly Cost |
|---------|-------|-------------|--------------|
| NewsAPI | 3 runs × ~10 requests | 100/day | **$0.00** |
| Groq AI | ~15 requests/run | 14,400/day | **$0.00** |
| Pexels | 3 images/run | 200/hour | **$0.00** |
| **TOTAL** | | | **$0.00** ✅ |

## File Structure

```
automation/
├── generators/
│   ├── newsAggregator.js       # Fetches + evaluates news
│   ├── newsContentGenerator.js # Generates articles
│   └── newsHtmlGenerator.js    # Creates HTML pages
├── news-automation.js          # Main orchestrator
└── package.json                # Added "news" script

assets/images/news/             # News article images
news.html                       # News listing page
news-*.html                     # Individual news articles

.github/workflows/
└── news-automation.yml         # 3x daily GitHub Actions
