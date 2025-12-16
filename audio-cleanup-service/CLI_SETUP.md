# CLI-Only Setup Guide

This guide shows you how to set up everything using **only the command line** - no Catalyst Console needed!

---

## Prerequisites

1. **Catalyst CLI installed**:
   ```bash
   npm install -g zcatalyst-cli
   ```

2. **Logged into Catalyst**:
   ```bash
   catalyst login
   ```

3. **Project initialized**:
   ```bash
   catalyst init
   ```

---

## Step 1: Enable Authentication (One-time)

⚠️ **This step MIGHT require the Catalyst Console** for the first time, but here's the programmatic way:

### Option A: Via Catalyst Console (Recommended for first-time)
1. Open: https://console.catalyst.zoho.com
2. Select your project
3. Click **Authentication** → **Enable Authentication**
4. Select **Email/Password**
5. Done!

### Option B: Via Catalyst CLI (if supported)
```bash
# Check if authentication is enabled
catalyst list:authentication

# If CLI supports it (newer versions):
catalyst authentication:enable --method email
```

**Note**: Authentication typically needs to be enabled once via Console. After that, everything else can be done via CLI/API.

---

## Step 2: Deploy Your Application

First, deploy the application so the signup endpoint is available:

```bash
# Deploy to Catalyst
catalyst deploy

# Wait for deployment to complete
# You'll get a URL like: https://your-project-id.development.catalystserverless.com
```

---

## Step 3: Create Admin User via CLI

Now create your admin user using the signup endpoint:

```bash
# Replace with your details
curl -X POST https://your-project-id.development.catalystserverless.com/server/audio-cleanup-service/api/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hello@olavoices.com",
    "password": "YourSecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

**Response** (success):
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "user": {
    "email": "hello@olavoices.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

---

## Step 4: Test Login

Test that your admin user can login:

```bash
# Test login
curl -X POST https://your-project-id.development.catalystserverless.com/server/audio-cleanup-service/api/admin/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "hello@olavoices.com",
    "password": "YourSecurePassword123!"
  }'
```

**Response** (success):
```json
{
  "success": true,
  "user": {
    "email": "hello@olavoices.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

---

## Step 5: Test Protected Endpoint

Verify you can access protected endpoints with the session:

```bash
# Test with session cookies
curl -X GET https://your-project-id.development.catalystserverless.com/server/audio-cleanup-service/api/admin/orders \
  -b cookies.txt
```

---

## Local Development Setup

For local development:

### 1. Start Local Server

```bash
npm start
```

### 2. Create Admin User Locally

```bash
curl -X POST http://localhost:3000/api/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hello@olavoices.com",
    "password": "YourSecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 3. Test Login Locally

```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "hello@olavoices.com",
    "password": "YourSecurePassword123!"
  }'
```

### 4. Access Admin Panel

Open browser: `http://localhost:3000/admin-login.html`

---

## Complete CLI Setup Script

Save this as `setup-admin.sh`:

```bash
#!/bin/bash

# Audio Cleanup Service - Admin Setup Script
# Usage: ./setup-admin.sh

set -e

echo "🚀 Audio Cleanup Service - Admin Setup"
echo "======================================="
echo ""

# Configuration
read -p "Enter admin email [hello@olavoices.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-hello@olavoices.com}

read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""

read -p "Enter first name [Admin]: " FIRST_NAME
FIRST_NAME=${FIRST_NAME:-Admin}

read -p "Enter last name [User]: " LAST_NAME
LAST_NAME=${LAST_NAME:-User}

read -p "Environment (local/production) [local]: " ENV
ENV=${ENV:-local}

# Set URL based on environment
if [ "$ENV" = "production" ]; then
  read -p "Enter production URL: " BASE_URL
else
  BASE_URL="http://localhost:3000"
fi

echo ""
echo "📝 Configuration:"
echo "   Email: $ADMIN_EMAIL"
echo "   Name: $FIRST_NAME $LAST_NAME"
echo "   URL: $BASE_URL"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "👤 Creating admin user..."

RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"firstName\": \"$FIRST_NAME\",
    \"lastName\": \"$LAST_NAME\"
  }")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  echo ""
  echo "✅ Admin user created successfully!"
  echo ""
  echo "📱 You can now login at:"
  echo "   $BASE_URL/admin-login.html"
  echo ""
  echo "🔐 Credentials:"
  echo "   Email: $ADMIN_EMAIL"
  echo "   Password: [the one you entered]"
  echo ""
  echo "⚠️  SECURITY: Consider disabling the signup endpoint after setup!"
else
  echo ""
  echo "❌ Failed to create admin user"
  echo "$RESPONSE" | jq -r '.error // "Unknown error"'
  exit 1
fi
```

### Make it executable:

```bash
chmod +x setup-admin.sh
```

### Run it:

```bash
./setup-admin.sh
```

---

## Quick Setup Commands (Copy & Paste)

### For Local Development:

```bash
# 1. Start server
npm start &

# 2. Wait a moment for server to start
sleep 3

# 3. Create admin user
curl -X POST http://localhost:3000/api/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hello@olavoices.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# 4. Open admin login
open http://localhost:3000/admin-login.html
```

### For Production (After Deploy):

```bash
# 1. Deploy
catalyst deploy

# 2. Get your project URL from deploy output
# Example: https://123456.development.catalystserverless.com

# 3. Create admin user
curl -X POST https://YOUR_PROJECT_URL/server/audio-cleanup-service/api/admin/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hello@olavoices.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# 4. Open admin login
open https://YOUR_PROJECT_URL/admin-login.html
```

---

## Security: Disable Signup After First User

After creating your admin user, you should disable the signup endpoint for security:

### Option 1: Comment out the endpoint

In `server/index.js`, comment out the signup endpoint:

```javascript
// app.post('/api/admin/signup', async (req, res) => {
//   ... entire signup endpoint code ...
// });
```

### Option 2: Add environment variable protection

In `server/index.js`, add this check at the start of the signup endpoint:

```javascript
app.post('/api/admin/signup', async (req, res) => {
  // Disable signup in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SIGNUP !== 'true') {
    return res.status(403).json({
      success: false,
      error: 'Signup is disabled'
    });
  }

  // ... rest of signup code ...
});
```

Then deploy:
```bash
catalyst deploy
```

---

## What Can Be Done via CLI?

| Task | CLI/API | Console | Notes |
|------|---------|---------|-------|
| Enable Authentication | ⚠️ | ✅ | Usually needs Console first time |
| Create Users | ✅ | ✅ | Use signup endpoint |
| Login | ✅ | - | Use login endpoint |
| List Users | ✅ | ✅ | Use Catalyst SDK |
| Delete Users | ✅ | ✅ | Use Catalyst SDK |
| Update Password | ✅ | ✅ | Use Catalyst SDK |
| Deploy App | ✅ | - | `catalyst deploy` |
| Test Endpoints | ✅ | - | Use curl/Postman |

✅ = Fully supported via CLI
⚠️ = May require Console initially
- = Not applicable

---

## Troubleshooting

### "Authentication not enabled" error

**Solution**: Enable authentication in Catalyst Console first:
1. https://console.catalyst.zoho.com
2. Select project → Authentication → Enable

### "User already exists" error

**Good news!** User is already created. Just try logging in:
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hello@olavoices.com", "password": "YourPassword"}'
```

### Can't login after creating user

1. Check email matches exactly
2. Check password is correct
3. Verify user was created:
   ```bash
   # In Catalyst Console → Authentication → Users
   # OR check server logs for "Admin user created" message
   ```

---

## Advanced: Manage Users via CLI

### List all users (requires Catalyst CLI):

```bash
catalyst list:users
```

### Delete a user:

```bash
catalyst delete:user --email hello@olavoices.com
```

### Update user password:

```bash
catalyst update:user --email hello@olavoices.com --password NewPassword123!
```

---

## Summary

**Minimum steps via CLI**:

1. ⚠️ Enable Authentication in Console (one-time)
2. ✅ Deploy: `catalyst deploy`
3. ✅ Create user: `curl POST /api/admin/signup`
4. ✅ Login: Open admin-login.html
5. ✅ (Optional) Disable signup endpoint

**Total time**: ~5 minutes

---

**Last Updated**: December 2024
**Version**: 2.0.0 (Catalyst Auth)
**Status**: Production Ready
