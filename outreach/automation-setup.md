# Email Automation Setup Guide
## FREE Tools for Cold Outreach

---

## OPTION 1: Mailmeteor (Recommended - Easiest)

### Cost: FREE
- 50 emails/day
- Tracking (opens, clicks)
- Auto follow-ups
- Personalization

### Setup (15 minutes):

**Step 1: Install Mailmeteor**
1. Go to: https://mailmeteor.com
2. Click "Add to Gmail" (Chrome extension)
3. Sign in with hello@olavoices.com

**Step 2: Create Lead Spreadsheet**
1. Open Google Sheets
2. Create columns:
   - First Name
   - Company
   - Email
   - Project (optional personalization)
   - Status

Example:
| First Name | Company | Email | Project | Status |
|------------|---------|-------|---------|--------|
| Jane | WHO Nigeria | jane@who.ng | malaria campaign | Not Sent |

**Step 3: Write Email Template in Gmail**
1. Open Gmail → Compose
2. Paste template from email-templates.md
3. Use variables: `{{First Name}}`, `{{Company}}`, `{{Project}}`

**Step 4: Send Campaign**
1. Click Mailmeteor icon in Gmail
2. Select your Google Sheet
3. Map columns (First Name → {{First Name}})
4. Preview emails
5. Click "Send emails"

**Step 5: Track Results**
- Mailmeteor dashboard shows:
  - Emails sent
  - Opens
  - Clicks
  - Bounces

---

## OPTION 2: YAMM (Yet Another Mail Merge)

### Cost: FREE
- 50 emails/day
- Similar to Mailmeteor
- Slightly different interface

### Setup:
1. Install: https://yamm.com
2. Follow same process as Mailmeteor

---

## OPTION 3: Manual Gmail + Google Sheets (Most Control)

### Cost: FREE
- Unlimited emails (Gmail limit: 500/day)
- Full control
- More manual work

### Setup:

**Step 1: Create Tracking Sheet**
```
Make a copy: https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE
```

Columns:
- Date Sent
- First Name
- Company
- Email
- Template Used
- Status (Sent/Opened/Replied)
- Follow-up Date
- Notes

**Step 2: Write Email Templates**
- Save templates as Gmail drafts
- Copy/paste and personalize for each send

**Step 3: Manual Sending**
- Send 10 emails/day manually
- Update spreadsheet after each send
- Set calendar reminders for follow-ups

---

## Email Sequence Automation

### Using Mailmeteor Auto Follow-Ups:

**Email 1: Initial Outreach**
- Send immediately

**Email 2: Follow-Up** (if no response)
- Wait 3 days
- Mailmeteor setting: "Send follow-up if no reply in 3 days"

**Email 3: Value Email** (if still no response)
- Wait 7 more days
- Manual send or set up second campaign

---

## Lead Generation Workflow

### Weekly Routine (2 hours):

**Monday:**
- Research 25 new leads (use lead-generation-guide.md)
- Add to Google Sheet with personalization notes

**Tuesday-Thursday:**
- Send 10 emails/day (25 total for week)
- Using Mailmeteor

**Friday:**
- Review responses
- Reply to interested contacts
- Schedule follow-ups in sheet

---

## Tools for Finding Leads (FREE)

### 1. LinkedIn Search
```
Search: "NGO Nigeria communications director"
Filter: Current company, Location
Export: Copy/paste to sheet
```

### 2. Hunter.io (FREE: 50/month)
```
1. Find LinkedIn profile
2. Go to hunter.io
3. Enter: first.last@company.com
4. Verify email exists
```

### 3. Apollo.io (FREE: 50 credits/month)
```
1. Sign up: apollo.io
2. Search: "NGO" + "Nigeria" + "Communications"
3. Export contacts
```

### 4. Manual Website Research
```
1. Google: "NGO Nigeria health"
2. Visit website
3. Find "Team" or "Contact" page
4. Manually add to sheet
```

---

## Sample Tracking Sheet Structure

| Date | First Name | Company | Email | Industry | Template | Status | Opened | Replied | Follow-up Date | Notes |
|------|------------|---------|-------|----------|----------|--------|--------|---------|----------------|-------|
| 11/11 | Jane | WHO | jane@who.ng | NGO | Template 1 | Sent | Yes | No | 11/14 | Working on malaria campaign |
| 11/11 | John | Ubisoft | john@ubi.com | Gaming | Gaming 1 | Sent | No | No | 11/14 | Audio Director |

---

## Response Management

### When You Get a Reply:

**Step 1: Respond Within 24 Hours**
- Shows professionalism
- Keeps momentum

**Step 2: Template Responses**

**If they want portfolio:**
```
Hi [Name],

Thanks for your interest! Here's my demo reel: [link]

I've attached:
• Character voice samples
• Corporate narration sample
• Rate sheet

Available for a call this week if you'd like to discuss your project.

Best,
Ola
```

**If they want rates:**
```
Hi [Name],

My rates depend on project scope:
• Short projects (<1 min): $200-300
• Medium projects (1-3 min): $300-450
• Long projects (3-5 min): $450-600

Can you share:
1. Script length/word count?
2. Usage rights (web only, broadcast, etc.)?
3. Timeline?

Happy to provide a detailed quote!

Best,
Ola
```

---

## Automation Scripts (Advanced - Optional)

If you want to build custom automation, I can create:

### Script 1: LinkedIn Profile Scraper
- Scrapes LinkedIn search results
- Exports to CSV
- FREE (using Python + Selenium)

### Script 2: Email Verifier
- Checks if emails are valid before sending
- Reduces bounce rate
- FREE (using Hunter.io API)

### Script 3: Auto Follow-Up Bot
- Automatically sends follow-ups
- Tracks responses
- Requires: Node.js + Gmail API

**Want me to build any of these?**

---

## Weekly Goals

### Week 1-2:
- [ ] Set up Mailmeteor
- [ ] Research 50 leads (25 NGO + 25 Gaming)
- [ ] Send first batch of 50 emails
- [ ] Track results

### Week 3-4:
- [ ] Send follow-ups to non-responders
- [ ] Research 50 more leads
- [ ] Send second batch
- [ ] Reply to interested contacts

### Month 2:
- [ ] 200 total contacts researched
- [ ] 100+ emails sent
- [ ] 2-5 responses
- [ ] 1-2 clients booked

---

## Success Metrics

**Track These Numbers:**

- **Leads Researched:** 25/week (goal: 300 total)
- **Emails Sent:** 50/week
- **Open Rate:** 20-40% (good)
- **Response Rate:** 2-5% (realistic)
- **Clients Booked:** 1-2/month (first 3 months)

**Example Projection:**

| Month | Emails Sent | Responses (3%) | Clients (25% of responses) | Revenue ($400/client) |
|-------|-------------|----------------|----------------------------|-----------------------|
| 1 | 200 | 6 | 1-2 | $400-800 |
| 2 | 400 | 12 | 3 | $1,200 |
| 3 | 600 | 18 | 4-5 | $1,600-2,000 |

---

## Next Steps

1. **TODAY:** Install Mailmeteor
2. **THIS WEEK:** Research 25 leads (see lead-generation-guide.md)
3. **THIS WEEK:** Send first 10 emails using Template 1
4. **NEXT WEEK:** Follow up + send 10 more

**Questions?**
Let me know if you need help with:
- Setting up Mailmeteor
- Finding specific leads
- Customizing email templates
- Building automation scripts
