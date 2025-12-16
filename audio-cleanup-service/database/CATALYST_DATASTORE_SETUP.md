# Catalyst DataStore Setup Guide

This guide explains how to set up the database tables in Catalyst DataStore to replace the SQLite database.

## Overview

Catalyst DataStore is a cloud-based relational database. You'll create tables via the Catalyst Console, then use the Catalyst SDK to interact with them from your Node.js application.

---

## Step 1: Access Catalyst Console

1. Go to https://console.catalyst.zoho.com
2. Select your project: **audio-cleanup-service**
3. Navigate to **Cloud Scale → Data Store**

---

## Step 2: Create Tables

### Table 1: orders

**Create Table:**
- Click **"Create Table"**
- Table Name: `orders`
- Click **"Add Column"** for each column below:

| Column Name | Data Type | Properties |
|-------------|-----------|------------|
| id | TEXT | Primary Key |
| customer_email | TEXT | NOT NULL |
| customer_name | TEXT | NOT NULL |
| customer_phone | TEXT | - |
| order_date | DATETIME | Default: CURRENT_TIMESTAMP |
| status | TEXT | Default: 'pending' |
| total_price | DECIMAL | - |
| currency | TEXT | Default: 'EUR' |
| payment_status | TEXT | Default: 'unpaid' |
| payment_intent_id | TEXT | - |
| notes | TEXT | - |
| delivery_format | TEXT | - |
| loudness_target | TEXT | - |
| breath_level | TEXT | - |
| deadline | TEXT | - |
| completed_date | DATETIME | - |

**Indexes to Create:**
After table creation, go to table settings and create these indexes:
- Index on `customer_email` (for lookups)
- Index on `status` (for filtering)
- Index on `payment_status` (for filtering)
- Index on `order_date` DESC (for sorting)

---

### Table 2: files

**Create Table:**
- Click **"Create Table"**
- Table Name: `files`
- Click **"Add Column"** for each column below:

| Column Name | Data Type | Properties |
|-------------|-----------|------------|
| ROWID | BIGINT | Auto Increment, Primary Key (Catalyst default) |
| order_id | TEXT | NOT NULL |
| file_type | TEXT | NOT NULL (values: 'raw' or 'processed') |
| filename | TEXT | NOT NULL |
| original_filename | TEXT | NOT NULL |
| file_size | BIGINT | - |
| storage_url | TEXT | - (Stratus bucket ID + object key) |
| preview_url | TEXT | - |
| upload_date | DATETIME | Default: CURRENT_TIMESTAMP |

**Foreign Key:**
- `order_id` references `orders(id)` ON DELETE CASCADE

**Indexes to Create:**
- Index on `order_id` (for lookups)
- Index on `file_type` (for filtering)

---

### Table 3: download_tokens

**Create Table:**
- Click **"Create Table"**
- Table Name: `download_tokens`
- Click **"Add Column"** for each column below:

| Column Name | Data Type | Properties |
|-------------|-----------|------------|
| ROWID | BIGINT | Auto Increment, Primary Key (Catalyst default) |
| token | TEXT | UNIQUE, NOT NULL |
| order_id | TEXT | NOT NULL |
| file_id | BIGINT | NOT NULL |
| expires_at | DATETIME | NOT NULL |
| download_count | INT | Default: 0 |
| max_downloads | INT | Default: 3 |
| created_at | DATETIME | Default: CURRENT_TIMESTAMP |

**Foreign Keys:**
- `order_id` references `orders(id)` ON DELETE CASCADE
- `file_id` references `files(ROWID)` ON DELETE CASCADE

**Indexes to Create:**
- Unique index on `token` (for fast lookups)
- Index on `order_id`
- Index on `expires_at` (for cleanup queries)

---

### Table 4: notifications

**Create Table:**
- Click **"Create Table"**
- Table Name: `notifications`
- Click **"Add Column"** for each column below:

| Column Name | Data Type | Properties |
|-------------|-----------|------------|
| ROWID | BIGINT | Auto Increment, Primary Key (Catalyst default) |
| order_id | TEXT | NOT NULL |
| notification_type | TEXT | NOT NULL (e.g., 'order_confirmation', 'files_ready', 'payment_received') |
| sent_to | TEXT | NOT NULL (email address) |
| sent_at | DATETIME | Default: CURRENT_TIMESTAMP |
| status | TEXT | Default: 'sent' |

**Foreign Key:**
- `order_id` references `orders(id)` ON DELETE CASCADE

**Indexes to Create:**
- Index on `order_id`
- Index on `notification_type`

---

## Step 3: Verify Table Creation

After creating all tables:

1. Go to **Data Store → Tables**
2. Verify all 4 tables exist: `orders`, `files`, `download_tokens`, `notifications`
3. Click each table and verify columns match the schema above
4. Check that indexes are created

---

## Step 4: Get Table IDs

You'll need the Table IDs for your Node.js code.

**To get Table IDs:**
1. Go to **Data Store → Tables**
2. Click on each table
3. Note the **Table ID** shown in the URL or table details
   - Example: `1234567890123456`

You'll use these IDs in your code:
```javascript
const TABLES = {
  orders: '1234567890123456',
  files: '2345678901234567',
  download_tokens: '3456789012345678',
  notifications: '4567890123456789'
};
```

---

## Step 5: Set Permissions (Optional)

By default, Catalyst DataStore tables are accessible only via server-side SDK (which is correct for security).

If you need to access tables from client-side (not recommended for this app), configure table permissions in the Catalyst Console.

---

## Differences from SQLite

| Feature | SQLite | Catalyst DataStore |
|---------|--------|-------------------|
| **Primary Key** | Custom column (`id`) | `ROWID` (auto-generated) or custom |
| **Auto Increment** | `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGINT AUTO INCREMENT` |
| **Foreign Keys** | Configured in SQL | Configured in Console UI |
| **Indexes** | Created via SQL | Created in Console UI |
| **Queries** | SQL via `db.prepare().all()` | Catalyst SDK methods |
| **Transactions** | `db.transaction()` | Not directly supported (use batch operations) |

---

## Next Steps

After creating tables in Catalyst Console:

1. **Get Table IDs** and update `database/catalyst-db.js` configuration
2. **Run migration script** to transfer data from SQLite to DataStore (see `database/migrate-to-catalyst.js`)
3. **Test queries** using the Catalyst SDK in your Node.js application
4. **Deploy** to Catalyst and verify everything works

---

## Troubleshooting

### Issue: Can't create foreign key
**Solution**: Ensure the referenced table exists first. Create tables in this order:
1. `orders` (no dependencies)
2. `files` (references `orders`)
3. `download_tokens` (references `orders` and `files`)
4. `notifications` (references `orders`)

### Issue: ROWID vs custom ID
**Solution**: Catalyst DataStore uses `ROWID` as the default auto-increment primary key. For the `orders` table, we use a custom `id` (TEXT) as the primary key to maintain compatibility with order ID generation.

### Issue: Can't find Table ID
**Solution**: Go to Data Store → click table → look in the URL:
```
https://console.catalyst.zoho.com/.../ tables/1234567890123456/...
                                           ^^^^^^^^^^^^^^^^
                                           This is your Table ID
```

---

## Schema Summary

**Total Tables:** 4
**Total Columns:** 43
**Foreign Keys:** 5
**Indexes:** 12

**Storage Requirements (estimated for 100 orders):**
- orders: ~50 KB
- files: ~30 KB
- download_tokens: ~20 KB
- notifications: ~15 KB
- **Total: ~115 KB** (well within 2GB free tier limit)

**Free Tier Limit:** 2 GB
**Estimated capacity:** >1,700,000 orders before hitting limit
