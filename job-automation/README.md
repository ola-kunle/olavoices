# 🎯 Voice-Over Job Automation System

> Automatically find and match voice-over jobs from 20+ platforms daily

## What It Does

- 🔍 **Scrapes 6+ job boards** - Upwork, Voice123, Voices.com, Project Casting, Voquent, etc.
- 🎯 **Smart keyword matching** - Finds jobs with "Nigerian", "African", "West African" keywords
- 🤖 **AI-powered proposals** - Gemini AI generates personalized proposals for each job
- 📊 **Scoring system** - Ranks jobs by relevance (high/medium/low confidence)
- 💾 **Automatic tracking** - Saves all jobs, matches, and proposals daily
- 🔄 **100% automated** - Runs daily via GitHub Actions

## Results

**Expected daily output:**
- 20-50 jobs scraped
- 5-15 relevant matches
- Top 10 proposals generated
- Delivered to you in readable format

**No manual work required** - just review the proposals and apply!

---

## Quick Start

```bash
# 1. Install dependencies
cd job-automation
npm install

# 2. Copy and fill .env
cp .env.example .env
# Add your GEMINI_API_KEY

# 3. Test (dry run, no applications sent)
npm test

# 4. Run for real
npm start
```

---

## Configuration

Edit `config.json` to customize:

### Keywords

```json
{
  "keywords": {
    "primary": ["Nigerian voice", "West African accent", ...],
    "secondary": ["African narrator", "African character", ...],
    "exclude": ["female only", "unpaid", ...]
  }
}
```

### Platforms

```json
{
  "platforms": {
    "upwork": { "enabled": true, "priority": "high" },
    "voice123": { "enabled": true, "priority": "high" }
  }
}
```

### Matching Score

```json
{
  "matching": {
    "minimumScore": 30,
    "primaryKeywordWeight": 10,
    "secondaryKeywordWeight": 5
  }
}
```

---

## How It Works

### Daily Workflow

```
1. 🔍 Scrape job boards (8 AM UTC)
   ↓
2. 🎯 Filter by keywords (Nigerian, African, etc.)
   ↓
3. 📊 Score by relevance (0-100)
   ↓
4. 🤖 Generate AI proposals (top 10-20 jobs)
   ↓
5. 💾 Save results to data/
   ↓
6. 📧 (Optional) Auto-apply or review manually
```

### Keyword Matching System

**Jobs are scored based on keyword matches:**

| Keywords Found | Score | Confidence |
|----------------|-------|------------|
| 2+ Primary | 20+ | High |
| 1 Primary + 1 Secondary | 15+ | Medium |
| Multiple Secondary/Tertiary | 30+ | Low |

**Example:**

```
Job: "Need authentic Nigerian voice for documentary"
✅ Primary: "Nigerian voice" (+10)
✅ Primary: "authentic" (implied +10)
✅ Secondary: "documentary" (+5)
Score: 25 → HIGH CONFIDENCE
```

---

## Output Files

After each run, check `data/` directory:

### `jobs-all-YYYY-MM-DD.json`
All scraped jobs (raw data)

### `jobs-matched-YYYY-MM-DD.json`
Filtered jobs that match your keywords

### `proposals-YYYY-MM-DD.json`
Jobs with AI-generated proposals (JSON)

### `proposals-YYYY-MM-DD.txt` ⭐
**Human-readable proposals** - Ready to copy/paste!

```
==============================================
JOB 1: Nigerian Voice Actor for E-Learning
Platform: Upwork
Score: 35 (high)
==============================================

Hi there,

I noticed you're looking for Nigerian voice - that's exactly my
specialty as a professional Nigerian voice actor.

[... full AI-generated proposal ...]

Best regards,
Ola
```

---

## GitHub Actions (Automated)

### Setup

1. Add `GEMINI_API_KEY` to GitHub Secrets
2. Workflow runs daily at 8:00 AM UTC
3. Results saved as artifacts (30-day retention)

### Manual Trigger

1. Go to: Actions → Voice-Over Job Scraper
2. Click "Run workflow"
3. Wait 2-5 minutes
4. Download artifacts to see results

---

## Platforms Supported

### Currently Scraping (6 platforms)

| Platform | Jobs/Day | African Jobs? | Priority |
|----------|----------|---------------|----------|
| **Upwork** | 10-30 | ✅ Yes | High |
| **Voice123** | 5-15 | ✅ Yes | High |
| **Voices.com** | 10-20 | ✅ Yes | High |
| **Voquent** | 5-10 | ✅ African-specific | High |
| **Project Casting** | 10-30 | ✅ Yes | Medium |
| **StarNow** | 5-15 | ✅ SA/Kenya/Nigeria | Medium |

### Easy to Add (20+ more)

- Fiverr
- Freelancer.com
- Backstage
- Casting Call Club
- allcasting
- Bodalgo
- ACX (audiobooks)
- The Voice Realm
- Voice Crafters
- And more...

---

## Customization

### Add New Platform

1. Create `scrapers/yourPlatformScraper.js`:

```javascript
import BaseScraper from './baseScraper.js';

class YourPlatformScraper extends BaseScraper {
  constructor(config) {
    super('YourPlatform', config);
  }

  extractJobs($) {
    const jobs = [];
    // ... scraping logic
    return jobs;
  }
}
```

2. Add to `config.json`:

```json
{
  "platforms": {
    "yourPlatform": {
      "enabled": true,
      "url": "https://yourplatform.com/jobs"
    }
  }
}
```

3. Add to `scrapers/scrapeAll.js`

---

## Advanced Features

### Auto-Apply (Optional)

Set in `config.json`:

```json
{
  "application": {
    "autoApply": true,
    "requireManualReview": false
  }
}
```

⚠️ **Not recommended initially** - review proposals manually first!

### Custom Proposal Templates

Edit `generators/proposalGenerator.js` to change:
- Tone and style
- Length (150-250 words default)
- Structure
- Call-to-action

---

## Troubleshooting

### No jobs found

1. **Check platforms are up:** Visit URLs manually
2. **Broaden keywords:** Lower `minimumScore` in config
3. **Run at different times:** Some platforms post at specific hours
4. **Check selectors:** Websites may have changed HTML structure

### Low-quality matches

1. **Increase minimum score:** `minimumScore: 40` (from 30)
2. **Add more primary keywords:** More specific terms
3. **Strengthen exclude list:** Filter out more irrelevant jobs

### Scraper errors

1. **Rate limiting:** Add delays between platforms
2. **Changed HTML:** Update selectors in scraper files
3. **Authentication required:** Some platforms need login

---

## Cost

**Monthly cost: $0**

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Gemini AI | 1,500 req/day | Proposal generation |
| GitHub Actions | 2,000 min/month | Daily automation |
| Node.js | Free | Scraping |

---

## Success Metrics

Track in `data/` files over time:

- **Jobs scraped per day:** Target 30-50
- **Match rate:** Target 20-30% (10-15 matches)
- **High confidence matches:** Target 5-10/day
- **Application rate:** 10-20/day
- **Response rate:** Track manually (target 10-20%)
- **Conversion to clients:** Target 2-5/month

---

## Roadmap

### Phase 1 (Complete) ✅
- Core scraping system
- Keyword matching
- AI proposal generation
- GitHub Actions automation

### Phase 2 (Coming Soon)
- Email notifications for high-confidence matches
- Application tracking (responses, interviews)
- Success rate analytics
- More platform scrapers (10+ total)

### Phase 3 (Future)
- Auto-apply integration (Upwork API, etc.)
- CRM integration
- Portfolio management
- Revenue tracking

---

## Support

**Issues?**
- Check GitHub Actions logs for errors
- Review `data/` files for output
- Test locally: `npm test`
- Verify `.env` has GEMINI_API_KEY

**Questions?**
- Review configuration in `config.json`
- Check scraper logs for platform-specific errors
- Ensure platforms haven't changed structure

---

## License

Private - OlaVoices Internal Tool

---

**Built with:**
- Node.js
- Cheerio (HTML parsing)
- Google Gemini AI
- GitHub Actions

**Questions?** Check the configuration files or test locally first!
