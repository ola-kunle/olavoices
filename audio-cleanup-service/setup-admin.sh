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

read -p "Environment (local/catalyst) [local]: " ENV
ENV=${ENV:-local}

# Set URL based on environment
if [ "$ENV" = "catalyst" ]; then
  # Try to read project ID from catalyst.json
  if [ -f "catalyst.json" ]; then
    PROJECT_ID=$(grep -o '"project_id"[[:space:]]*:[[:space:]]*"[^"]*"' catalyst.json | cut -d'"' -f4)
    if [ -n "$PROJECT_ID" ]; then
      echo ""
      echo "📦 Found Project ID: $PROJECT_ID"
      echo ""
      echo "Catalyst environments:"
      echo "  1) Development: https://$PROJECT_ID.development.catalystserverless.com/server/audio-cleanup-service"
      echo "  2) Production:  https://$PROJECT_ID.production.catalystserverless.com/server/audio-cleanup-service"
      echo "  3) Custom URL"
      echo ""
      read -p "Select environment [1]: " ENV_CHOICE
      ENV_CHOICE=${ENV_CHOICE:-1}

      case $ENV_CHOICE in
        1)
          BASE_URL="https://$PROJECT_ID.development.catalystserverless.com/server/audio-cleanup-service"
          ;;
        2)
          BASE_URL="https://$PROJECT_ID.production.catalystserverless.com/server/audio-cleanup-service"
          ;;
        3)
          read -p "Enter custom URL: " BASE_URL
          ;;
        *)
          BASE_URL="https://$PROJECT_ID.development.catalystserverless.com/server/audio-cleanup-service"
          ;;
      esac
    else
      read -p "Enter Catalyst URL: " BASE_URL
    fi
  else
    read -p "Enter Catalyst URL: " BASE_URL
  fi
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

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found, response will be raw JSON"
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/signup" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\",
        \"firstName\": \"$FIRST_NAME\",
        \"lastName\": \"$LAST_NAME\"
      }")

    echo "$RESPONSE"

    if echo "$RESPONSE" | grep -q '"success":true'; then
      echo ""
      echo "✅ Admin user created successfully!"
    else
      echo ""
      echo "❌ Failed to create admin user"
      exit 1
    fi
else
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
    else
      echo ""
      echo "❌ Failed to create admin user"
      echo "$RESPONSE" | jq -r '.error // "Unknown error"'
      exit 1
    fi
fi

echo ""
echo "📱 You can now login at:"
echo "   $BASE_URL/admin-login.html"
echo ""
echo "🔐 Credentials:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: [the one you entered]"
echo ""
echo "⚠️  SECURITY: Consider disabling the signup endpoint after setup!"
echo "   Edit server/index.js and comment out the /api/admin/signup endpoint"
echo ""
