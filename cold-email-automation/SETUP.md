# Cold Email Automation Setup Guide

## 🎯 Overview

This automated system will:
- Find 3 quality leads daily (NGOs + Gaming studios)
- Send personalized emails automatically
- Follow up after 3 days and 7 days
- Track responses and stop when they reply
- Run daily at 9:00 AM UTC via GitHub Actions
- **Cost: $0/month**

---

## 🚀 Quick Setup (30 minutes)

### **Step 1: Get API Keys (15 min)**

#### **1. Apollo.io API Key** (Lead Generation)

1. Go to https://app.apollo.io/
2. Sign up for FREE account
3. Go to Settings → Integrations → API
4. Copy your API key
5. Free tier: **50 contact credits/month**

#### **2. Hunter.io API Key** (Email Validation)

1. Go to https://hunter.io/
2. Sign up for FREE account
3. Go to API → Your API Key
4. Copy your API key
5. Free tier: **50 email verifications/month**

#### **3. Google Gemini API Key** (AI Personalization)

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key
4. Free tier: **1,500 requests/day**

#### **4. Gmail API Credentials** (Email Sending)

This is the most complex part. Follow carefully:

**A. Enable Gmail API:**

1. Go to https://console.cloud.google.com/
2. Create a new project (or use existing)
3. Enable "Gmail API" for the project
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen (select "External", add test users)
6. Application type: "Desktop app"
7. Copy **Client ID** and **Client Secret**

**B. Get Refresh Token:**

1. Install Google Auth Library locally:
   ```bash
   npm install -g google-auth-library
   ```

2. Run this command (replace YOUR_CLIENT_ID and YOUR_CLIENT_SECRET):
   ```bash
   node -e "
   const {google} = require('googleapis');
   const readline = require('readline');

   const oauth2Client = new google.auth.OAuth2(
     'YOUR_CLIENT_ID',
     'YOUR_CLIENT_SECRET',
     'urn:ietf:wg:oauth:2.0:oob'
   );

   const authUrl = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly']
   });

   console.log('Visit this URL:', authUrl);
   "
   ```

3. Visit the URL, authorize your Gmail account (hello@olavoices.com)
4. Copy the authorization code
5. Exchange code for refresh token:
   ```bash
   node -e "
   const {google} = require('googleapis');
   const oauth2Client = new google.auth.OAuth2(
     'YOUR_CLIENT_ID',
     'YOUR_CLIENT_SECRET',
     'urn:ietf:wg:oauth:2.0:oob'
   );

   oauth2Client.getToken('YOUR_AUTH_CODE', (err, token) => {
     if (err) return console.error('Error:', err);
     console.log('Refresh Token:', token.refresh_token);
   });
   "
   ```

6. Copy the **Refresh Token**

---

### **Step 2: Add API Keys to GitHub Secrets (5 min)**

1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/olavoices
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add each:

| Secret Name | Value |
|-------------|-------|
| `APOLLO_API_KEY` | Your Apollo.io API key |
| `HUNTER_API_KEY` | Your Hunter.io API key |
| `GEMINI_API_KEY` | Your Gemini API key |
| `GMAIL_CLIENT_ID` | Your Gmail OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | Your Gmail OAuth Client Secret |
| `GMAIL_REFRESH_TOKEN` | Your Gmail Refresh Token |
| `FROM_EMAIL` | hello@olavoices.com |
| `DAILY_EMAIL_LIMIT` | 10 (start with warm-up) |
| `DAILY_LEAD_LIMIT` | 3 |

---

### **Step 3: Test Locally (5 min)**

1. **Create `.env` file** in `/cold-email-automation/`:
   ```bash
   cp .env.example .env
   ```

2. **Fill in your API keys** in `.env`

3. **Install dependencies:**
   ```bash
   cd cold-email-automation
   npm install
   ```

4. **Run in DRY RUN mode** (no emails sent):
   ```bash
   npm run test
   ```

5. **Check output** - should show:
   - ✅ Config loaded
   - ✅ Data directory created
   - ✅ Lead generation (3 leads)
   - ✅ Email validation
   - ✅ [DRY RUN] Would send emails

---

### **Step 4: Deploy to GitHub Actions (5 min)**

1. **Commit and push** everything:
   ```bash
   cd /Users/oka/Documents/olavoices
   git add cold-email-automation/
   git add .github/workflows/cold-email-daily.yml
   git commit -m "Add cold email automation system"
   git push
   ```

2. **Enable GitHub Actions:**
   - Go to your repo → **Actions** tab
   - Enable workflows if prompted

3. **Trigger manually first time:**
   - Go to **Actions** → **Cold Email Automation - Daily Run**
   - Click **"Run workflow"**
   - Watch it run (takes 2-3 minutes)

4. **Check results:**
   - Should see green checkmark ✅
   - Check `cold-email-automation/data/leads.json` for new leads
   - Check `cold-email-automation/data/sent.json` for sent emails

---

## 🔧 Configuration

### **Adjust Daily Limits**

Edit `config.json`:

```json
{
  "leadGeneration": {
    "dailyLimit": 3  // New leads per day
  },
  "emailSequence": {
    "warmupPhase": {
      "dailyLimit": 10,  // Emails per day (week 1-2)
      "duration": 14     // Days to warm up
    },
    "activePhase": {
      "dailyLimit": 30   // After warm-up
    }
  }
}
```

### **Customize Target Industries**

Edit `config.json` → `targetProfiles`:

```json
{
  "ngos": {
    "enabled": true,
    "jobTitles": ["Communications Director", "Media Director", ...],
    "companyKeywords": ["WHO", "UNICEF", ...],
    "minimumEmployees": 50
  },
  "gaming": {
    "enabled": true,
    "jobTitles": ["Audio Director", "Voice Director", ...],
    "minimumEmployees": 10
  }
}
```

### **Customize Email Templates**

Edit files in `/templates/`:
- `ngo-template-1.txt` - Initial NGO outreach
- `ngo-template-2.txt` - NGO follow-up
- `ngo-template-3.txt` - NGO value email
- `gaming-template-1.txt` - Initial gaming outreach
- `gaming-template-2.txt` - Gaming follow-up
- `gaming-template-3.txt` - Gaming value email

Use variables:
- `{{firstName}}` - Lead's first name
- `{{lastName}}` - Lead's last name
- `{{company}}` - Company name
- `{{title}}` - Job title
- `{{recentProject}}` - AI-generated recent project (optional)

---

## 📊 Monitoring & Tracking

### **Check Stats Locally**

```bash
cd cold-email-automation
npm start
```

Output shows:
- Total leads
- Emails sent today
- Response rate
- Bounces

### **View Lead Database**

Check `cold-email-automation/data/leads.json`:

```json
[
  {
    "id": "lead_123",
    "firstName": "Jane",
    "email": "jane@who.ng",
    "company": "WHO Nigeria",
    "emailSequence": {
      "step": 1,
      "lastEmailDate": "2025-11-12",
      "responded": false
    }
  }
]
```

### **Track Sent Emails**

Check `cold-email-automation/data/sent.json`:

```json
[
  {
    "leadId": "lead_123",
    "email": "jane@who.ng",
    "sentDate": "2025-11-12T09:00:00Z",
    "step": 1
  }
]
```

### **Check Responses**

Responses are automatically detected when someone replies to your emails. The system:
1. Checks Gmail inbox daily
2. Matches replies to leads in database
3. Marks lead as "responded"
4. Stops email sequence for that lead

**You'll see in logs:**
```
🎉 Lead jane@who.ng has responded! Stopping sequence.
```

---

## 🚨 Troubleshooting

### **"Apollo API limit exceeded"**

- Free tier: 50 credits/month
- Reduce `dailyLimit` in config to 1-2/day
- Or add manual leads to `data/leads.json`

### **"Gmail API quota exceeded"**

- Free tier: 100 emails/day
- Set `DAILY_EMAIL_LIMIT=10` during warm-up
- Gradually increase after 2 weeks

### **"Email going to spam"**

- **Week 1-2:** Keep at 10 emails/day (warm-up)
- Send personal emails first (to friends) to build reputation
- Avoid spammy words in templates

### **"No leads found"**

- Check Apollo.io has credits left
- Adjust `targetProfiles` in config (broaden search)
- Add manual leads to `data/leads.json`

---

## 📈 Warm-Up Schedule

**CRITICAL:** Do NOT send 50 emails on day 1. Warm up gradually:

| Week | Daily Limit | Action |
|------|-------------|--------|
| Week 1 | 10 emails/day | Let automation run |
| Week 2 | 15 emails/day | Update `DAILY_EMAIL_LIMIT` to 15 |
| Week 3 | 20 emails/day | Update to 20 |
| Week 4+ | 30-50 emails/day | Update to 30-50 |

**Update limit in GitHub Secrets:**
1. Go to repo → Settings → Secrets
2. Edit `DAILY_EMAIL_LIMIT`
3. Change from 10 → 15 → 20 → 30

---

## 🎯 Expected Results

| Timeline | Leads Generated | Emails Sent | Responses | Clients |
|----------|----------------|-------------|-----------|---------|
| Week 1 | 21 | 70 | 0-2 | 0 |
| Week 2 | 42 | 140 | 2-4 | 0-1 |
| Week 3 | 63 | 210 | 4-8 | 1-2 |
| Month 2 | 90+ | 300+ | 6-15 | 2-3 |
| Month 3+ | 120+ | 400+ | 10-20 | 3-5 |

**Revenue projection:**
- Month 1: $0-400 (first clients closing)
- Month 2: $400-800 (2-3 clients)
- Month 3+: $1,200-2,000 (3-5 clients)

---

## 🔄 Manual Operations

### **Add Manual Leads**

Edit `cold-email-automation/data/leads.json`:

```json
[
  {
    "id": "manual_001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "company": "Example Corp",
    "title": "Audio Director",
    "industry": "gaming",
    "source": "manual",
    "addedDate": "2025-11-12T00:00:00Z",
    "status": "new",
    "emailSequence": {
      "step": 0,
      "lastEmailDate": null,
      "responded": false,
      "bounced": false
    }
  }
]
```

Commit and push - automation will pick it up next run.

### **Pause Automation**

Disable workflow in GitHub:
1. Go to **Actions** → **Cold Email Automation**
2. Click **"..."** → **"Disable workflow"**

Or set `DRY_RUN=true` in GitHub Secrets.

### **Resume Automation**

Enable workflow again, or set `DRY_RUN=false`.

---

## 💡 Tips for Success

1. **Quality over quantity:** 10 perfect leads > 50 random contacts
2. **Personalize templates:** Add company-specific details
3. **Test subject lines:** A/B test different subjects
4. **Follow up:** Most deals happen in follow-ups 2-3
5. **Track responses:** Reply within 24 hours when they respond
6. **Warm up properly:** Don't skip the 2-week warm-up!
7. **Monitor bounces:** High bounce rate = bad leads

---

## 📞 Support

**Issues?** Check:
- GitHub Actions logs (shows errors)
- `cold-email-automation/data/` files
- `.env` file has all keys filled

**Questions?**
- Review this setup guide
- Check `/outreach/` docs for templates
- Test locally first with `npm run test`

---

## 🎉 You're All Set!

The system will now:
- ✅ Find 3 quality leads daily
- ✅ Validate their emails
- ✅ Send personalized outreach
- ✅ Follow up automatically
- ✅ Track responses
- ✅ Stop when they reply

**Just check your email inbox for responses and close deals!**

**Expected timeline to first client: 14-30 days**
**Expected monthly revenue after 3 months: $1,200-2,000**
