# Mail Merge Automation Guide
## Auto-Fill Personalization in Emails

---

## How Mail Merge Works

**Mail merge** automatically fills in `{{variables}}` from your Google Sheet into your email template.

### Example:

**Your Google Sheet:**
| First Name | Company | Project | Email |
|------------|---------|---------|-------|
| Sarah | WHO Nigeria | malaria prevention | sarah@who.int |
| Michael | Ubisoft | Far Cry 7 | michael@ubisoft.com |

**Your Email Template:**
```
Hi {{First Name}},

I noticed {{Company}} is working on {{Project}}...
```

**What Gets Sent:**
```
To: sarah@who.int
Hi Sarah,

I noticed WHO Nigeria is working on malaria prevention...

---

To: michael@ubisoft.com
Hi Michael,

I noticed Ubisoft is working on Far Cry 7...
```

---

## Setting Up Auto-Fill with Mailmeteor

### Step 1: Create Google Sheet

Create a spreadsheet with these columns:

| Column Name | What to Put | Example |
|-------------|-------------|---------|
| First Name | Contact's first name | Sarah |
| Company | Organization name | WHO Nigeria |
| Project | What they're working on | malaria prevention campaign |
| Email | Their work email | sarah.jones@who.int |
| Industry | NGO or Gaming | NGO |

### Step 2: Research & Fill Data

**For each lead, find:**
1. **First Name** - From LinkedIn or company website
2. **Company** - Organization name
3. **Project** - Recent project they mentioned (LinkedIn posts, press releases)
4. **Email** - Use Hunter.io or company website
5. **Industry** - NGO or Gaming

**Example entries:**

| First Name | Company | Project | Email | Industry |
|------------|---------|---------|-------|----------|
| Sarah | WHO Nigeria | health worker training videos | sarah.jones@who.int | NGO |
| Ahmed | UNICEF West Africa | educational campaign | ahmed.k@unicef.org | NGO |
| Michael | Ubisoft Montreal | Far Cry 7 development | michael.chen@ubisoft.com | Gaming |
| Jessica | Riot Games | character diversity initiative | jessica@riotgames.com | Gaming |

### Step 3: Email Template with Variables

**Template for NGOs:**
```
Subject: Professional Nigerian Voice Actor for {{Company}}'s Projects

Hi {{First Name}},

I noticed {{Company}} is working on {{Project}} and thought my background might be relevant.

I'm a professional Nigerian voice actor with 10+ years of experience, specializing in authentic Sub-Saharan accents for international clients. Based in the EU, I provide reliable, high-quality voice-over services for:

• Corporate training videos
• Public health campaigns
• Educational content
• Documentary narration

My setup includes a professional home studio with quick turnaround times and European business hours for easy collaboration.

Quick question: Does {{Company}} have any upcoming projects that would benefit from an authentic Nigerian voice?

I'd be happy to share my demo reel and discuss your needs.

Best regards,
Olakunle Abimbola

---
OlaVoices | Professional Nigerian Voice Actor
Málaga, Spain | EU-based
hello@olavoices.com | www.olavoices.com

Authentic Sub-Saharan accents • 10+ years experience • Professional studio

Not interested? Reply "UNSUBSCRIBE"
```

**Template for Gaming:**
```
Subject: Authentic Nigerian Character Voices for {{Company}}

Hi {{First Name}},

I came across {{Company}}'s work on {{Project}} and was impressed by your commitment to diverse character representation.

I'm a professional Nigerian voice actor with 10+ years of experience, specializing in authentic Sub-Saharan character voices. Based in the EU, I've worked with international gaming clients on:

• Character voices (heroes, NPCs, villains)
• Various West African accents
• Professional home studio (broadcast quality)
• Fast turnaround times

My authentic accent work helps create believable, non-stereotypical African characters that resonate with diverse audiences.

Would {{Company}} be open to adding me to your voice talent roster for future casting opportunities?

Happy to share my character voice reel.

Best regards,
Olakunle Abimbola

---
OlaVoices | Professional Nigerian Voice Actor
Málaga, Spain | EU-based
hello@olavoices.com | www.olavoices.com

Authentic Sub-Saharan character voices • 10+ years experience

Not interested? Reply "UNSUBSCRIBE"
```

---

## Using Mailmeteor (Step-by-Step)

### Installation:
1. Go to: https://mailmeteor.com
2. Click "Add to Gmail"
3. Install Chrome extension
4. Sign in with your Gmail (hello@olavoices.com)

### Sending Campaign:

**Step 1: Open Gmail**
- Click "Compose"
- Paste your email template (with `{{variables}}`)

**Step 2: Click Mailmeteor Icon**
- Icon appears in compose window
- Click it

**Step 3: Select Your Google Sheet**
- Choose the sheet with your leads
- Mailmeteor reads the data

**Step 4: Map Columns**
Mailmeteor will show:
```
{{First Name}} → Column: First Name ✓
{{Company}} → Column: Company ✓
{{Project}} → Column: Project ✓
```

**Step 5: Preview**
- Click "Preview emails"
- Check that personalization looks correct
- Make sure no `{{brackets}}` remain empty

**Step 6: Send**
- Click "Send emails"
- Mailmeteor sends one personalized email to each person
- Tracks opens/clicks automatically

---

## Smart Personalization Tips

### Finding Project Info:

**For NGOs:**
1. Check their website → "News" or "Press Releases"
2. LinkedIn company page → Recent posts
3. Google: "[Company name] 2025 projects"

Examples:
- "malaria prevention campaign"
- "health worker training initiative"
- "community education program"

**For Gaming Studios:**
1. Check game credits on MobyGames
2. LinkedIn posts about current projects
3. Company careers page (what they're hiring for)

Examples:
- "Far Cry 7 development"
- "character diversity initiative"
- "upcoming RPG project"

### If You Can't Find Project Info:

Use a generic version:

**Google Sheet entry:**
| First Name | Company | Project | Email |
|------------|---------|---------|-------|
| Sarah | WHO Nigeria | West Africa health programs | sarah@who.int |

Or don't mention project at all:

**Alternative template:**
```
Hi {{First Name}},

I noticed {{Company}}'s work in West Africa and thought my background might be relevant.
```

---

## Advanced: Multiple Templates

You can create different templates for different industries:

### Template 1: NGO (Health Focus)
```
Subject: Authentic Nigerian Voice for {{Company}}'s Health Education

Hi {{First Name}},

I noticed {{Company}}'s work on {{Project}} in West Africa...

Specializing in:
• Public health campaigns
• Training videos
• Community education
```

### Template 2: Gaming (Character Focus)
```
Subject: Professional Character Voices for {{Company}}

Hi {{First Name}},

I came across {{Company}}'s {{Project}} and your commitment to authentic representation...

Specializing in:
• Hero/protagonist voices
• NPC dialogue
• Various West African accents
```

**Send different templates to different segments:**
- NGOs → Template 1
- Gaming → Template 2

---

## Tracking & Follow-Ups

### Mailmeteor Dashboard Shows:

- ✅ **Sent**: Email delivered
- 👁️ **Opened**: They read it
- 🖱️ **Clicked**: They clicked your website link
- ↩️ **Replied**: They responded

### Auto Follow-Up Settings:

In Mailmeteor:
1. Click "Settings"
2. Enable "Auto follow-up"
3. Set: "Send follow-up if no reply in 3 days"

**Follow-up template:**
```
Subject: Re: Professional Nigerian Voice Actor for {{Company}}'s Projects

Hi {{First Name}},

Following up on my email from earlier this week about voice-over services for {{Company}}.

I know you're likely managing multiple projects, so I'll keep this brief:

I specialize in authentic Nigerian voice-over for international clients with 10+ years of experience and a professional home studio.

Would you be open to a quick chat about {{Company}}'s voice-over needs?

Best,
Olakunle
```

---

## Sample Google Sheet Template

**Create this sheet: "OlaVoices Outreach Tracker"**

| Date | First Name | Last Name | Company | Project | Industry | Email | Status | Opened | Replied | Notes |
|------|------------|-----------|---------|---------|----------|-------|--------|--------|---------|-------|
| 11/12 | Sarah | Jones | WHO Nigeria | malaria campaign | NGO | sarah.j@who.int | Sent | Yes | No | Send follow-up 11/15 |
| 11/12 | Michael | Chen | Ubisoft | Far Cry 7 | Gaming | m.chen@ubisoft.com | Sent | No | No | Audio Director |

**Download starter template:**
Make a copy: [I can create this for you]

---

## Common Issues & Solutions

### Issue 1: `{{Variable}}` Shows in Sent Email

**Problem:** Variable didn't get replaced
**Solution:**
- Check column name matches EXACTLY (case-sensitive)
- Make sure cell isn't empty in spreadsheet

### Issue 2: Email Looks Weird

**Problem:** Formatting breaks
**Solution:**
- Use plain text in Gmail compose (Ctrl+Shift+Alt+P)
- Don't use bullet points in Mailmeteor (use - instead)

### Issue 3: Low Open Rate (<20%)

**Problem:** Emails going to spam
**Solution:**
- Send max 10-20 emails/day
- Warm up your email (start with 5/day, increase gradually)
- Verify emails with Hunter.io before sending

---

## Automation Workflow Summary

**Weekly Routine (2 hours total):**

**Monday (60 min):**
- Research 25 new leads
- Add to Google Sheet with all personalization
- Find: Name, Company, Project, Email

**Tuesday-Thursday (30 min):**
- Send 10 emails/day via Mailmeteor
- Let auto-follow-up handle non-responders

**Friday (30 min):**
- Check Mailmeteor dashboard
- Reply to responses
- Update spreadsheet with notes

**Result:**
- 50 emails/week
- 1-2 responses/week (2-4% response rate)
- 1-2 clients/month

---

## Next Steps

1. **Install Mailmeteor** (5 minutes)
2. **Create Google Sheet** with template above
3. **Research 10 leads** (use lead-generation-guide.md)
4. **Send first test batch** of 5 emails
5. **Check results** after 24 hours

**Want me to create:**
- ✅ Pre-filled Google Sheet template?
- ✅ More email template variations?
- ✅ Lead research cheat sheet?
