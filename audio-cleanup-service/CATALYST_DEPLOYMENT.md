# Zoho Catalyst Deployment Guide

Complete guide for deploying the OlaVoices Audio Cleanup Service to Zoho Catalyst platform.

---

## Prerequisites

- ✅ Zoho Catalyst account (already signed up)
- ✅ Catalyst CLI installed (v1.21.0)
- ✅ Node.js >=14 installed
- Domain access for api.olavoices.com DNS settings

---

## Phase 1: Request Stratus Early Access (5 minutes)

###Critical Requirement: 200MB File Upload Support

The audio cleanup service needs to handle files up to 200MB. Catalyst's standard FileStore only supports up to 100MB per file. **Stratus** is Catalyst's object storage solution that supports multipart upload for files larger than 100MB.

### Email Template for Stratus Access

Send this email to: **support@zohocatalyst.com**

```
Subject: Request for Stratus Early Access - Audio Processing Service

Hello Zoho Catalyst Team,

I am deploying a professional audio cleanup service for voice actors on Zoho Catalyst and need access to the Stratus object storage component.

Service Requirements:
- Audio file uploads up to 200MB (WAV format)
- Multipart upload support for large files
- Persistent storage for processed audio files
- Integration with Catalyst AppSail (Node.js/Express)

My Catalyst account email: [your email]
Project name: OlaVoices Audio Cleanup Service

Could you please enable Stratus access for my account? I understand it's currently in Early Access mode.

Thank you,
[Your name]
```

**Wait for approval (typically 1-2 business days) before proceeding to Phase 3.**

---

## Phase 2: Catalyst CLI Setup (5 minutes)

### 1. Verify CLI Installation

```bash
catalyst --version
# Should show: 1.21.0 or higher
```

### 2. Login to Catalyst

```bash
catalyst login
```

This will open your browser for authentication. Sign in with your Zoho Catalyst account.

### 3. List Available Projects

```bash
catalyst projects:list
```

If you haven't created a project yet, create one in the Catalyst Console: https://console.catalyst.zoho.com

---

## Phase 3: Database Migration (SQLite → DataStore)

### Current Setup
- Local SQLite database at `database/database.db`
- Three tables: `orders`, `files`, `download_tokens`

### DataStore Setup

#### 1. Create DataStore Tables in Catalyst Console

Go to **Catalyst Console → Your Project → Data Store → Create Table**

**Table 1: orders**
```
Table Name: orders
Columns:
- id (TEXT, Primary Key)
- customer_email (TEXT)
- customer_name (TEXT)
- status (TEXT) - default: 'pending_upload'
- payment_status (TEXT) - default: 'unpaid'
- order_date (TEXT)
- price_eur (REAL)
- delivery_format (TEXT)
- special_instructions (TEXT)
- stripe_session_id (TEXT)
```

**Table 2: files**
```
Table Name: files
Columns:
- id (INTEGER, Auto Increment, Primary Key)
- order_id (TEXT, Foreign Key → orders.id)
- file_type (TEXT) - 'raw' or 'processed'
- original_filename (TEXT)
- stored_filename (TEXT)
- file_size (INTEGER)
- upload_date (TEXT)
- stratus_bucket_id (TEXT)
- stratus_object_key (TEXT)
```

**Table 3: download_tokens**
```
Table Name: download_tokens
Columns:
- id (INTEGER, Auto Increment, Primary Key)
- order_id (TEXT, Foreign Key → orders.id)
- token (TEXT, Unique)
- file_type (TEXT)
- created_at (TEXT)
- expires_at (TEXT)
- download_count (INTEGER) - default: 0
- max_downloads (INTEGER) - default: 3
```

#### 2. Install Catalyst Node.js SDK

```bash
cd /Users/oka/Documents/olavoices/audio-cleanup-service
npm install zcatalyst-sdk-node --save
```

#### 3. Create DataStore Integration Module

We'll create a new file `database/catalyst-datastore.js` to replace SQLite operations with DataStore SDK calls.

---

## Phase 4: Stratus File Storage Integration

Once Stratus access is approved, update the storage layer to use Stratus instead of local file storage.

### Key Changes Required:

1. **File Upload**: Replace `multer` disk storage with Stratus multipart upload
2. **File Download**: Use Stratus presigned URLs instead of local file serving
3. **Preview Generation**: Store previews in Stratus instead of local `uploads` directory

### Stratus SDK Reference

```javascript
import catalyst from 'zcatalyst-sdk-node';

// Initialize Catalyst
const app = catalyst.initialize(req); // req from Express

// Upload file to Stratus (multipart for large files)
const stratusInstance = app.stratus();
const bucket = stratusInstance.bucket(BUCKET_ID);

// Upload object
const uploadResponse = await bucket.uploadObject({
  file_path: localFilePath,
  object_name: fileName
});

// Get download URL
const downloadUrl = await bucket.getObjectDownloadUrl({
  object_key: objectKey,
  expires_in: 3600 // 1 hour
});
```

---

## Phase 5: Update Package.json

Catalyst AppSail expects a proper `start` script in `package.json`.

### Current package.json
```json
{
  "name": "audio-cleanup-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.0.3",
    "better-sqlite3": "^9.2.2",
    "stripe": "^14.10.0",
    "express-rate-limit": "^7.1.5",
    "zcatalyst-sdk-node": "^2.5.0"
  }
}
```

### Update Dependencies
- Remove: `better-sqlite3` (replaced by DataStore)
- Add: `zcatalyst-sdk-node`

---

## Phase 6: Environment Variables

### Configure in Catalyst Console

**Do NOT use `.env` files in production!**

Go to: **Catalyst Console → Your Project → AppSail → [Your Service] → Configuration → Environment Variables**

Add the following variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| NODE_ENV | production | Environment mode |
| BASE_URL | https://your-app.catalyst.zohocloud.com | Will be updated with custom domain |
| ADMIN_EMAIL | hello@olavoices.com | Admin notification email |
| STRIPE_SECRET_KEY | sk_test_... (or sk_live_...) | Stripe secret key |
| STRIPE_PUBLISHABLE_KEY | pk_test_... (or pk_live_...) | Stripe publishable key |
| STRIPE_WEBHOOK_SECRET | whsec_... | Stripe webhook signing secret |
| RESEND_API_KEY | re_... | Resend email API key |

**Note**: `X_ZOHO_CATALYST_LISTEN_PORT` is automatically set by Catalyst - no need to configure it.

---

## Phase 7: Initialize Catalyst Project

### Option A: Initialize New Catalyst Project

```bash
cd /Users/oka/Documents/olavoices/audio-cleanup-service
catalyst init
```

Follow the prompts:
- Select your Catalyst project
- Choose Node.js runtime
- Select AppSail service
- Entry point: `server/index.js`

### Option B: Add Catalyst to Existing Project

Create a `catalyst.json` configuration file:

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "projectName": "audio-cleanup-service",
  "projectDomain": "olavoices",
  "projectVersion": "1.0",
  "nodeVersion": "20"
}
```

---

## Phase 8: Deploy to Catalyst

### 1. Deploy to Development Environment

```bash
catalyst deploy
```

This will:
- Bundle your application
- Upload to Catalyst servers
- Deploy to the development environment
- Provide a development URL (e.g., `https://your-app-dev.catalyst.zohocloud.com`)

### 2. Test in Development

Visit the development URL and test:
- File upload (ensure it works with Stratus)
- Database operations (DataStore)
- Stripe payment flow
- Email notifications
- Preview generation
- File downloads

### 3. Check Logs

```bash
catalyst logs
```

Or view logs in Catalyst Console: **Your Project → AppSail → Logs**

### 4. Deploy to Production

Once testing is complete, promote to production via:

**Catalyst Console → Your Project → Deployment → Production**

Or use CLI:
```bash
catalyst deploy --environment production
```

---

## Phase 9: Custom Domain Setup

### 1. Get Catalyst Production URL

After production deployment, note your Catalyst URL:
```
https://your-app.catalyst.zohocloud.com
```

### 2. Add Custom Domain in Catalyst

**Catalyst Console → Your Project → Settings → Custom Domains → Add Domain**

Enter: `api.olavoices.com`

Catalyst will provide DNS records to add:

**TXT Record** (for verification):
```
Type: TXT
Name: _catalyst-verify
Value: [provided by Catalyst]
TTL: 3600
```

**CNAME Record** (for routing):
```
Type: CNAME
Name: api
Value: [provided by Catalyst, e.g., your-app.catalyst.zohocloud.com]
TTL: 3600
```

### 3. Configure DNS

Add the records in your olavoices.com DNS settings (wherever you manage DNS - Netlify, Cloudflare, Namecheap, etc.)

### 4. Verify Domain

Return to Catalyst Console and click **Verify Domain**

### 5. SSL Certificate

Catalyst automatically provisions Let's Encrypt SSL certificates for custom domains. This usually takes 5-10 minutes after DNS verification.

---

## Phase 10: Stripe Webhook Configuration

### 1. Update Webhook URL

Go to: **Stripe Dashboard → Developers → Webhooks**

Update the endpoint URL to:
```
https://api.olavoices.com/webhook/stripe
```

### 2. Verify Webhook Events

Ensure these events are selected:
- `checkout.session.completed`

### 3. Update Webhook Secret

If Stripe generates a new signing secret, update it in Catalyst environment variables:

**Catalyst Console → Environment Variables → STRIPE_WEBHOOK_SECRET**

### 4. Test Webhook

Send a test event from Stripe Dashboard to verify the webhook is working.

---

## Phase 11: Final Testing

### Complete Workflow Test

1. **Upload Raw Audio**
   - Go to https://api.olavoices.com
   - Upload a test audio file (< 200MB)
   - Verify it appears in admin panel

2. **Admin Upload Processed File**
   - Access https://api.olavoices.com/admin.html
   - Upload processed version
   - Verify preview generation

3. **Payment Flow**
   - Click payment link
   - Complete Stripe checkout (use test card: 4242 4242 4242 4242)
   - Verify payment confirmation email

4. **Download**
   - Use download link from email
   - Verify file downloads correctly
   - Check download count limits

### Monitor Logs

```bash
catalyst logs --follow
```

Or in Catalyst Console: **AppSail → Logs**

---

## Troubleshooting

### Issue: File Upload Fails (413 Payload Too Large)

**Cause**: Request size limit in Catalyst
**Solution**: Ensure you're using Stratus multipart upload for files >100MB

### Issue: Database Queries Failing

**Cause**: DataStore table names or column names don't match
**Solution**: Verify table schemas in Catalyst Console match the code

### Issue: Environment Variables Not Found

**Cause**: Variables not configured in Catalyst Console
**Solution**: Go to AppSail → Configuration → Environment Variables and add them

### Issue: Stripe Webhook Not Working

**Cause**: Webhook URL or secret mismatch
**Solution**:
1. Verify URL: `https://api.olavoices.com/webhook/stripe`
2. Check webhook secret in environment variables
3. Test webhook delivery in Stripe Dashboard

### Issue: Email Notifications Not Sending

**Cause**: Resend API key not configured
**Solution**: Add `RESEND_API_KEY` to environment variables

Or consider using **Zoho Mail API** instead (built-in integration with Catalyst)

---

## Useful Catalyst Commands

```bash
# View all commands
catalyst --help

# Login
catalyst login

# List projects
catalyst projects:list

# Deploy to development
catalyst deploy

# Deploy to production
catalyst deploy --environment production

# View logs
catalyst logs

# Follow logs in real-time
catalyst logs --follow

# List AppSail services
catalyst services:list

# Pull remote config
catalyst pull

# Run locally
catalyst serve
```

---

## Cost Breakdown: FREE Forever! 🎉

### Catalyst Free Tier (Monthly Limits)

- **Compute**: 25,000 GB-seconds serverless function requests
- **DataStore**: 2 GB storage
- **FileStore**: 1 GB (dev), unlimited (production)
- **Stratus**: TBD (contact support for Early Access limits)
- **Bandwidth**: Included in free tier
- **SSL**: Free (Let's Encrypt)
- **Custom Domain**: Free

### After Free Tier

- $5 minimum billing per project per month (if exceeded)
- $250 bonus credit (valid for 6 months) - kicks in automatically

---

## Next Steps After Deployment

1. **Monitor Usage**: Check Catalyst Console → Billing to track free tier usage
2. **Set Up Monitoring**: Configure alerts for errors and performance issues
3. **Backup Strategy**: Regularly export DataStore data as backup
4. **Update Frontend**: Ensure audio-cleanup.html URLs point to `https://api.olavoices.com`
5. **Test at Scale**: Upload multiple files to ensure system handles load
6. **Enable FFmpeg**: Install FFmpeg on Catalyst for preview generation (if not available)

---

## Support Resources

- **Catalyst Documentation**: https://docs.catalyst.zoho.com
- **Catalyst Community**: https://forums.catalyst.zoho.com
- **Stratus Early Access Support**: support@zohocatalyst.com
- **Stack Overflow**: Tag questions with `zoho-catalyst`

---

## Migration Checklist

- [ ] Stratus Early Access approved
- [ ] Catalyst CLI installed and logged in
- [ ] DataStore tables created
- [ ] Database migration script written and tested
- [ ] Stratus file storage integration implemented
- [ ] Environment variables configured in Catalyst Console
- [ ] Code deployed to development environment
- [ ] Development testing complete
- [ ] Deployed to production
- [ ] Custom domain (api.olavoices.com) configured
- [ ] DNS records added and verified
- [ ] SSL certificate active
- [ ] Stripe webhook updated to production URL
- [ ] Frontend URLs updated to production API
- [ ] End-to-end workflow tested
- [ ] Monitoring and alerts configured

---

**Estimated Total Migration Time**: 4-5 hours (excluding Stratus approval wait)

**Total Cost**: $0/month (within free tier limits)
