# Tebi.io Storage Setup Guide

## Why Tebi?

The audio cleanup service was migrated from Zoho Stratus to Tebi.io for the following reasons:
- **25GB free storage** + 250GB bandwidth/month
- **No early access approval** required (unlike Stratus)
- **S3-compatible API** - easy integration with AWS SDK
- **200MB file support** via multipart upload

---

## Step 1: Create Tebi Account (2 minutes)

1. Go to https://tebi.io
2. Click "Sign Up" (free tier - no credit card required)
3. Verify your email address
4. Complete registration

---

## Step 2: Get API Credentials (1 minute)

1. Log in to Tebi Dashboard: https://client.tebi.io
2. Go to **Settings** → **API Keys**
3. Click **Create New Key**
4. Copy the following:
   - **Access Key** (similar to: `ABC123DEF456...`)
   - **Secret Key** (similar to: `xyz789secret...`)

⚠️ **IMPORTANT**: Save these credentials securely - the secret key is only shown once!

---

## Step 3: Create Storage Bucket (1 minute)

1. In Tebi Dashboard, go to **Buckets**
2. Click **Create Bucket**
3. Bucket settings:
   - **Name**: `audio-cleanup-files` (must match .env configuration)
   - **Region**: `Global`
   - **Access**: Private (default - we'll use presigned URLs)
4. Click **Create**

---

## Step 4: Configure Environment Variables

### For Local Development

Add to `/Users/oka/Documents/olavoices/audio-cleanup-service/.env`:

```env
# Tebi.io Storage
TEBI_ACCESS_KEY=your_tebi_access_key_here
TEBI_SECRET_KEY=your_tebi_secret_key_here
TEBI_BUCKET_NAME=audio-cleanup-files
TEBI_REGION=global
```

Replace `your_tebi_access_key_here` and `your_tebi_secret_key_here` with the credentials from Step 2.

### For Production (Catalyst)

1. Go to **Catalyst Console** → Your Project → **AppSail** → Configuration
2. Click **Environment Variables** → **Add Variable**
3. Add the following variables:

| Variable Name | Value |
|---------------|-------|
| TEBI_ACCESS_KEY | (your access key) |
| TEBI_SECRET_KEY | (your secret key) |
| TEBI_BUCKET_NAME | audio-cleanup-files |
| TEBI_REGION | global |

4. Click **Save**
5. **Restart** the AppSail service for changes to take effect

---

## Step 5: Verify Configuration

### Local Testing

```bash
cd /Users/oka/Documents/olavoices/audio-cleanup-service
npm start
```

Check the startup logs - you should see:

```
✅ Tebi.io S3-compatible storage initialized
🪣 Bucket: audio-cleanup-files
📦 Max file size: 200 MB
🌐 Endpoint: https://s3.tebi.io
⚠️  Credentials: Configured ✓
```

If you see `⚠️  Credentials: NOT CONFIGURED`, double-check your `.env` file.

### Production Testing (after deployment)

```bash
catalyst logs --follow
```

Look for the same initialization messages. If credentials are missing, the logs will show:

```
⚠️  Credentials: NOT CONFIGURED
```

---

## Troubleshooting

### Issue: "Credentials not configured" error

**Cause**: Missing or incorrect TEBI_ACCESS_KEY or TEBI_SECRET_KEY

**Solution**:
1. Verify credentials in Tebi Dashboard
2. Check `.env` file has no typos or extra spaces
3. Restart the server after adding credentials

### Issue: "Bucket not found" error

**Cause**: Bucket name mismatch or bucket doesn't exist

**Solution**:
1. Verify bucket name is exactly `audio-cleanup-files`
2. Check bucket exists in Tebi Dashboard
3. Ensure TEBI_BUCKET_NAME in .env matches bucket name

### Issue: Audio previews not showing

**Cause**: Presigned URL generation failing

**Solution**:
1. Verify Tebi credentials are configured
2. Check server logs for Tebi API errors
3. Ensure processed files were uploaded successfully
4. Verify browser console for CORS or network errors

---

## Security Best Practices

1. **Never commit** `.env` file to git (already in `.gitignore`)
2. **Rotate credentials** periodically in Tebi Dashboard
3. **Use separate buckets** for development and production (optional)
4. **Monitor usage** in Tebi Dashboard to avoid exceeding free tier

---

## Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 250 GB/month
- **Requests**: Unlimited (within fair use)

For a typical audio cleanup service with ~50 orders/month:
- Average raw file: 20 MB
- Average processed file: 15 MB
- Total storage: ~1.75 GB/month
- **Well within free tier limits!**

---

## Migration from Old Storage (if applicable)

If you have existing files in Stratus or local storage:

1. Download all existing files
2. Upload to Tebi using the admin panel or CLI
3. Update database `storage_url` fields from `local://` or `stratus://` to `tebi://`

---

## Support

- **Tebi Documentation**: https://tebi.io/docs
- **Tebi Support**: support@tebi.io
- **S3 API Reference**: https://docs.aws.amazon.com/s3/

---

## Next Steps

After configuring Tebi:

1. ✅ Test file upload locally
2. ✅ Test preview generation
3. ✅ Deploy to Catalyst
4. ✅ Configure environment variables in production
5. ✅ Test complete workflow (upload → process → preview → payment → download)
6. ✅ Monitor Tebi Dashboard for usage
