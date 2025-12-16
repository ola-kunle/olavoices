# Catalyst Authentication Setup Guide

This guide explains how to set up and use Zoho Catalyst Authentication for your audio cleanup service admin panel.

---

## Overview

The application now uses **Zoho Catalyst Authentication** instead of custom tokens for:
- Better security with managed sessions
- Built-in user management
- OAuth support
- Seamless integration with other Catalyst services

---

## Setup Steps

### 1. Enable Catalyst Authentication

In your Catalyst project console:

1. Navigate to **Authentication** in the left sidebar
2. Click **Enable Authentication**
3. Choose **Email/Password** authentication method
4. Configure settings:
   - ✅ Enable email verification (optional)
   - ✅ Set password requirements
   - ✅ Configure session timeout (default: 30 days)

### 2. Create Admin User

You need to create your admin user in Catalyst. You have two options:

#### Option A: Via Catalyst Console (Recommended)

1. Go to **Authentication** → **Users** in Catalyst Console
2. Click **Add User**
3. Enter details:
   - **Email**: Your admin email (matches `ADMIN_EMAIL` in `.env`)
   - **Password**: Secure password
   - **First Name**: Your first name
   - **Last Name**: Your last name
4. Click **Create User**

#### Option B: Via Sign-up API (Programmatic)

Use this curl command to create a user programmatically:

```bash
curl -X POST https://your-project-id.development.catalystserverless.com/server/audio-cleanup-service/api/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hello@olavoices.com",
    "password": "YourSecurePassword123!",
    "first_name": "Admin",
    "last_name": "User"
  }'
```

**Note**: You'll need to create a signup endpoint for this (optional).

### 3. Configure Environment Variables

Update your `.env` file:

```env
# Admin Configuration
ADMIN_EMAIL=hello@olavoices.com

# Note: ADMIN_PASSWORD is no longer needed!
# Passwords are managed by Catalyst Authentication
```

### 4. Deploy to Catalyst

Deploy your updated application:

```bash
# Deploy to Catalyst
catalyst deploy
```

---

## How It Works

### Authentication Flow

1. **Login**: Admin enters email/password at `/admin-login.html`
2. **Catalyst validates**: Credentials checked against Catalyst user database
3. **Session created**: Catalyst creates secure session (stored in cookies)
4. **Access granted**: Admin can access protected endpoints
5. **Logout**: Session invalidated via Catalyst

### Session Management

- **Session Storage**: HTTP-only cookies (secure, not accessible via JavaScript)
- **Session Duration**: Configurable in Catalyst (default: 30 days)
- **Auto-refresh**: Catalyst automatically refreshes sessions
- **Cross-device**: Each device gets its own session

### Protected Endpoints

All admin endpoints require authentication:

```
GET  /api/admin/verify            - Check if user is logged in
POST /api/admin/login             - Login with email/password
POST /api/admin/logout            - Logout and invalidate session
GET  /api/admin/orders            - Get all orders (requires admin)
POST /api/admin/orders/:id/upload - Upload processed files (requires admin)
POST /api/admin/cleanup           - Run cleanup (requires admin)
```

---

## User Management

### Adding More Admin Users

To add additional admin users:

1. Create the user in Catalyst Console (Authentication → Users)
2. Update your code to support multiple admins:

```javascript
// In server/index.js, update requireAdmin middleware:
const adminEmails = [
  'admin1@olavoices.com',
  'admin2@olavoices.com'
];

if (!adminEmails.includes(currentUser.email_id)) {
  return res.status(403).json({
    success: false,
    error: 'Admin access required'
  });
}
```

### Password Reset

Users can reset passwords via Catalyst:

1. **Via Console**: Authentication → Users → Select user → Reset Password
2. **Via API**: Implement forgot password flow using Catalyst SDK
3. **Via Email**: Enable email verification and password reset emails in Catalyst

---

## Security Features

### Built-in Security

- ✅ **Password hashing**: Catalyst handles secure password storage
- ✅ **Session management**: Secure, HTTP-only cookies
- ✅ **CSRF protection**: Built into Catalyst
- ✅ **Rate limiting**: Already configured in Express
- ✅ **Email verification**: Optional, can be enabled

### Additional Recommendations

1. **Enable Email Verification**:
   - In Catalyst Console → Authentication
   - Enable email verification for new users
   - Adds extra security layer

2. **Configure Password Policy**:
   - Minimum length: 8 characters
   - Require uppercase, lowercase, numbers
   - Require special characters

3. **Session Timeout**:
   - Set appropriate timeout (e.g., 7 days for admin)
   - Shorter for sensitive operations

4. **Two-Factor Authentication** (Future):
   - Catalyst supports 2FA
   - Can be enabled in Console

---

## Testing

### Test Login Flow

1. **Start server**: `npm start`
2. **Navigate to**: `http://localhost:3000/admin-login.html`
3. **Login with**: Admin email/password created in Catalyst
4. **Verify**: Should redirect to `/admin.html` and load orders

### Test Session Persistence

1. Login to admin panel
2. Close browser
3. Reopen and go to `/admin.html`
4. Should still be logged in (session persists)

### Test Logout

1. Click "Logout" button in admin header
2. Should redirect to login page
3. Try accessing `/admin.html` directly
4. Should redirect back to login

---

## Troubleshooting

### "Unauthorized - Please login" Error

**Cause**: No active Catalyst session

**Solutions**:
1. Ensure user exists in Catalyst (check Console → Authentication → Users)
2. Verify email matches `ADMIN_EMAIL` in `.env`
3. Check browser cookies are enabled
4. Clear browser cache and try again

### "Admin access required" Error

**Cause**: User email doesn't match `ADMIN_EMAIL`

**Solutions**:
1. Verify `ADMIN_EMAIL` in `.env` matches user email in Catalyst
2. Check for typos in email address
3. Update `.env` and restart server

### Session Expires Too Quickly

**Solution**: Increase session timeout in Catalyst Console
1. Go to Authentication → Settings
2. Update session timeout duration
3. Redeploy application

### CORS Issues

**Cause**: Cookies blocked by browser

**Solution**: Ensure CORS is configured properly in `server/index.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-domain.com'
  ],
  credentials: true, // Important for cookies!
  optionsSuccessStatus: 200
};
```

---

## Migration from Custom Tokens

### What Changed

| Feature | Before (Custom Tokens) | After (Catalyst Auth) |
|---------|----------------------|---------------------|
| Storage | localStorage | HTTP-only cookies |
| Duration | 24 hours | Configurable (30 days default) |
| Management | In-memory Map | Catalyst Database |
| Security | Manual implementation | Catalyst managed |
| Scaling | Single instance only | Multi-instance ready |

### Breaking Changes

1. **No more `Authorization: Bearer` headers**:
   - Old: `Authorization: Bearer abc123`
   - New: Cookies (automatic)

2. **No localStorage token**:
   - Old: `localStorage.getItem('admin_token')`
   - New: Handled by browser cookies

3. **Fetch calls need `credentials: 'include'`**:
   ```javascript
   // Required for all authenticated requests
   fetch('/api/admin/orders', {
     credentials: 'include'
   })
   ```

---

## API Reference

### Login

```javascript
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "success": true,
  "user": {
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

### Verify Session

```javascript
GET /api/admin/verify
Credentials: include

Response:
{
  "success": true,
  "email": "admin@example.com",
  "user": { ... }
}
```

### Logout

```javascript
POST /api/admin/logout
Credentials: include

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Enable email verification** for new users
3. **Set strong password requirements**
4. **Configure appropriate session timeout**
5. **Monitor authentication logs** in Catalyst Console
6. **Regularly audit user list** (remove inactive users)
7. **Use environment-specific credentials** (dev vs production)

---

## Next Steps

1. ✅ Create admin user in Catalyst Console
2. ✅ Test login flow locally
3. ✅ Deploy to Catalyst
4. ✅ Test in production environment
5. 🔲 Enable email verification (optional)
6. 🔲 Set up 2FA (future enhancement)
7. 🔲 Configure password policy

---

## Support Resources

- [Catalyst Authentication Docs](https://docs.catalyst.zoho.com/en/authentication/)
- [Catalyst SDK Node.js Docs](https://docs.catalyst.zoho.com/en/sdk/node-js/)
- [User Management API](https://docs.catalyst.zoho.com/en/authentication/user-management/)

---

**Last Updated**: December 2024
**Version**: 2.0.0 (Catalyst Auth)
**Status**: Production Ready
