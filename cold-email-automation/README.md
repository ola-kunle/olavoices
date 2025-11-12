# 🤖 Cold Email Automation System

> Fully automated client acquisition for OlaVoices

## What It Does

- 🔍 **Finds quality leads** - Searches Apollo.io for NGO/Gaming decision-makers daily
- ✅ **Validates emails** - Hunter.io verification before sending
- 🤖 **AI personalization** - Gemini AI researches each company for custom details
- 📧 **Sends emails** - Automated outreach via Gmail API
- 🔄 **Auto follow-ups** - Day 3 and Day 7 follow-ups automatically
- 📬 **Tracks responses** - Detects replies and stops sequences
- 💰 **Costs: $0/month** - All free API tiers

## Results

**Expected timeline:**
- Week 1-2: 2-4 responses
- Week 3-4: First client ($200-600)
- Month 2: 2-3 clients ($400-800/month)
- Month 3+: 3-5 clients ($1,200-2,000/month)

**Response rate:** 2-5% (industry standard)

## Quick Start

See **[SETUP.md](./SETUP.md)** for detailed setup instructions.

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill .env
cp .env.example .env

# 3. Test (dry run, no emails sent)
npm run test

# 4. Run for real
npm start
```

## Architecture

```
cold-email-automation/
├── index.js              # Main orchestrator
├── config.json           # Target profiles, sequences
├── package.json          # Dependencies
├── .env.example          # API key template
├── SETUP.md              # Full setup guide
├── README.md             # This file
│
├── generators/
│   ├── leadGenerator.js   # Apollo.io lead search
│   └── emailValidator.js  # Hunter.io validation
│
├── senders/
│   ├── emailSender.js     # Gmail API sender
│   ├── sequenceManager.js # Follow-up logic
│   └── responseTracker.js # Reply detection
│
├── utils/
│   └── aiPersonalizer.js  # Gemini AI personalization
│
├── templates/
│   ├── ngo-template-1.txt     # NGO initial outreach
│   ├── ngo-template-2.txt     # NGO follow-up
│   ├── ngo-template-3.txt     # NGO value email
│   ├── gaming-template-1.txt  # Gaming initial outreach
│   ├── gaming-template-2.txt  # Gaming follow-up
│   └── gaming-template-3.txt  # Gaming value email
│
└── data/
    ├── leads.json    # Lead database
    └── sent.json     # Sent email log
```

## Daily Workflow (Automated)

Every day at 9:00 AM UTC, GitHub Actions runs:

1. **Check responses** - Look for replies in Gmail
2. **Generate leads** - Find 3 new quality leads (Apollo.io)
3. **Validate emails** - Check emails are valid (Hunter.io)
4. **Personalize** - AI research for custom details (Gemini)
5. **Send emails** - Send to leads ready for next step (Gmail)
6. **Track stats** - Update database and commit changes

## Email Sequence

**For each lead:**

| Day | Action | Template |
|-----|--------|----------|
| Day 0 | Initial outreach | `*-template-1.txt` |
| Day 3 | Follow-up (if no reply) | `*-template-2.txt` |
| Day 7 | Value email (if no reply) | `*-template-3.txt` |

**Sequence stops if:**
- Lead replies (detected automatically)
- Email bounces
- 3 emails sent (sequence complete)

## Quality Filters

Leads must meet ALL criteria:

**NGOs:**
- ✅ Director level+ (Communications, Media, Public Affairs)
- ✅ 50+ employees
- ✅ Africa-focused programs
- ✅ International or well-funded organization
- ❌ Excludes: junior, assistant, coordinator roles

**Gaming:**
- ✅ Audio/Voice Director level+
- ✅ 10+ employees
- ✅ Published games in last 2 years
- ✅ Active development
- ❌ Excludes: hobbyists, students, junior roles

## Configuration

Edit `config.json` to customize:

- **Daily limits** - Leads and emails per day
- **Target profiles** - Job titles, companies, industries
- **Email sequence** - Timing and templates
- **Quality filters** - Minimum company size, seniority
- **AI personalization** - Enable/disable, timeout

## Monitoring

**View stats:**
```bash
npm start
```

**Output:**
```
📊 Campaign Statistics
  Total Leads: 42
  New (not contacted): 15
  In Sequence: 20
  Responded: 5
  Response Rate: 11.9%
```

**Check database:**
- `data/leads.json` - All leads and their status
- `data/sent.json` - Email send log

**GitHub Actions logs:**
- Go to repo → Actions → Latest run
- See full execution log

## Warm-Up Schedule

🚨 **IMPORTANT:** Start slow to build sender reputation!

| Week | Daily Emails | Action |
|------|-------------|--------|
| 1-2 | 10/day | Initial warm-up |
| 3 | 20/day | Increase limit |
| 4+ | 30-50/day | Full capacity |

Update `DAILY_EMAIL_LIMIT` in GitHub Secrets weekly.

## Cost

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Apollo.io | 50 credits/month | Lead generation | $0 |
| Hunter.io | 50 searches/month | Email validation | $0 |
| Gemini AI | 1,500 req/day | Personalization | $0 |
| Gmail API | 100 emails/day | Sending | $0 |
| GitHub Actions | 2,000 min/month | Automation | $0 |
| **TOTAL** | | | **$0/month** |

## Support

**Issues?**
1. Check GitHub Actions logs for errors
2. Review [SETUP.md](./SETUP.md) for troubleshooting
3. Test locally: `npm run test`
4. Verify `.env` has all API keys

**Common issues:**
- "API limit exceeded" → Reduce daily limits
- "Authentication error" → Check Gmail API setup
- "No leads found" → Broaden search criteria in config

## Scripts

```bash
npm start           # Run automation (sends real emails)
npm run test        # Dry run (no emails sent)
npm run find-leads  # Generate leads only
npm run send-emails # Send emails only
npm run check-responses # Check for replies only
```

## Manual Operations

**Add manual leads:**
Edit `data/leads.json` directly, then commit.

**Pause automation:**
Disable workflow in GitHub Actions or set `DRY_RUN=true`.

**Change templates:**
Edit files in `templates/` directory.

**Adjust targeting:**
Edit `config.json` → `targetProfiles`.

## Success Metrics

**Track these:**
- Response rate: 2-5% is good
- Bounce rate: <5% is good
- Meetings booked: 1-2 per month initially
- Clients closed: 1 per month initially

**After 3 months:**
- Pipeline: 50-100 leads
- Monthly responses: 10-20
- Monthly clients: 3-5
- Monthly revenue: $1,200-2,000

## Built With

- Node.js - Runtime
- Google Gmail API - Email sending
- Apollo.io API - Lead generation
- Hunter.io API - Email validation
- Google Gemini AI - Personalization
- GitHub Actions - Automation

## License

Private - OlaVoices Internal Tool

---

**Questions?** See [SETUP.md](./SETUP.md) for detailed documentation.
