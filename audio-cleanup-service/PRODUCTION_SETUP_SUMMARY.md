# Production Setup Summary

## Your Production URLs

**Main Application:**
```
https://audio-cleanup-service-30038743990.development.catalystappsail.eu
```

**Admin Panel (YOU):**
```
https://audio-cleanup-service-30038743990.development.catalystappsail.eu/admin-login.html
```

**Customer Tracking (THEM):**
```
https://audio-cleanup-service-30038743990.development.catalystappsail.eu/track.html
```

---

## What's Set Up

### ✅ Completed
1. **Server Deployed** - AppSail on Catalyst
2. **Authentication Enabled** - Embedded Email/Password
3. **Admin Authentication** - Login system for you to manage orders
4. **Customer Tracking** - Order ID-based tracking (no login needed)
5. **Order Management** - Full CRUD for orders
6. **File Upload/Processing** - Tebi.io storage integration
7. **Payment System** - Stripe integration
8. **Email Notifications** - Resend integration
9. **Cleanup System** - Manual trigger for old orders

### 🔄 In Progress
- Creating admin user (deploying fixed code now)

---

## Once Deployment Finishes

Run this command to create your admin user:

```bash
curl -X POST https://audio-cleanup-service-30038743990.development.catalystappsail.eu/api/admin/signup \
  -H "Content-Type: application/json" \
  -d @/tmp/signup-request.json
```

Or manually:
```bash
curl -X POST https://audio-cleanup-service-30038743990.development.catalystappsail.eu/api/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hello@olavoices.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

---

## After Creating Admin User

1. **Login**: https://audio-cleanup-service-30038743990.development.catalystappsail.eu/admin-login.html
2. **Email**: hello@olavoices.com
3. **Password**: SecurePassword123!

---

## How It Works

### For You (Admin):
1. Login at `/admin-login.html`
2. View all orders at `/admin.html`
3. Upload processed files
4. Run cleanup to remove old files
5. Manage everything

### For Customers:
1. Upload files at main page (`/`)
2. Receive order ID via email
3. Track order at `/track.html` (enter order ID)
4. Preview files when ready
5. Pay via Stripe
6. Download processed files

---

## Important Next Steps

### Security
1. **Disable Signup Endpoint** after creating admin user (see below)
2. **Set Environment Variables** for production (Stripe keys, etc.)
3. **Enable Email Verification** (optional, in Catalyst Console)

### Disable Signup (After Creating Admin)

In `server/index.js`, add this at the top of the signup endpoint:

```javascript
app.post('/api/admin/signup', async (req, res) => {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Signup disabled' });
  }
  // ... rest of code
});
```

Then redeploy:
```bash
catalyst deploy
```

---

## Environment Variables to Set

You'll need to set these via Catalyst Console or CLI:

```bash
ADMIN_EMAIL=hello@olavoices.com
BASE_URL=https://audio-cleanup-service-30038743990.development.catalystappsail.eu
RESEND_API_KEY=your_resend_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
TEBI_ACCESS_KEY=your_tebi_key
TEBI_SECRET_KEY=your_tebi_secret
TEBI_BUCKET_NAME=audio-cleanup-files
TEBI_REGION=global
```

---

## Testing Checklist

- [ ] Admin login works
- [ ] Can view orders
- [ ] Can upload processed files
- [ ] Customer tracking page works
- [ ] Payment flow works
- [ ] Email notifications sent
- [ ] File downloads work

---

## Support & Documentation

- **Full Setup Guide**: `CATALYST_AUTH_SETUP.md`
- **CLI Setup**: `CLI_SETUP.md`
- **Enhancements**: `ENHANCEMENTS.md`
- **Deployment**: `CATALYST_DEPLOYMENT.md`

---

**Status**: Almost ready for production!
**Next**: Create admin user once deployment finishes
