# 🎙️ OlaVoices Audio Cleanup Service

Professional audio cleanup order management system for voice actors.

## Features

✅ **Phase 1 (COMPLETE)**
- File upload with drag-and-drop
- Order management system
- Email notifications (order confirmation, files ready)
- Admin panel for processing orders
- Secure file storage
- SQLite database

🚧 **Phase 2 (TODO)**
- Audio preview generation (FFmpeg 30-second samples)
- Stripe payment integration
- Secure download with expiring tokens
- Automated pricing based on file count/duration

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **File Storage:** Local (upgradable to Cloudflare R2)
- **Email:** Resend
- **Payments:** Stripe (Phase 2)
- **Frontend:** Vanilla HTML/CSS/JS

## Installation

### 1. Install Dependencies

```bash
cd audio-cleanup-service
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

**Required:**
- `RESEND_API_KEY` - Get from [resend.com](https://resend.com/api-keys)
- `ADMIN_EMAIL` - Your email address

**Optional (for production):**
- Cloudflare R2 credentials (for cloud file storage)
- Stripe keys (for payment processing)

### 3. Initialize Database

The database will be automatically created when you first run the server.

### 4. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000`

## Usage

### Customer Flow

1. **Submit Order:** `http://localhost:3000`
   - Upload audio files
   - Fill in contact details
   - Choose processing options
   - Receive confirmation email

2. **Wait for Processing**
   - You process files manually with your DAW
   - Customer receives "Files Ready" email

3. **Preview & Pay** (Phase 2)
   - Customer listens to preview
   - Makes payment via Stripe
   - Downloads full files

### Admin Flow

1. **Access Admin Panel:** `http://localhost:3000/admin.html`

2. **View Orders**
   - See all orders with status
   - Filter by pending/ready/completed

3. **Upload Processed Files**
   - Click "Upload Files" on pending order
   - Select processed audio files from your DAW
   - System automatically notifies customer

## File Structure

```
audio-cleanup-service/
├── server/
│   └── index.js              # Express server & API routes
├── database/
│   ├── schema.js             # SQLite database schema
│   └── audio-cleanup.db      # SQLite database file
├── utils/
│   ├── email.js              # Email sending functions
│   ├── storage.js            # File storage (local/R2)
│   └── tokens.js             # Download token generation
├── public/
│   ├── index.html            # Customer upload form
│   ├── order-confirmation.html
│   └── admin.html            # Admin panel
├── uploads/                  # Local file storage
│   └── [order-id]/
│       ├── raw/              # Customer uploads
│       └── processed/        # Your cleaned files
├── .env                      # Environment variables
└── package.json
```

## API Endpoints

### Customer Endpoints

- `POST /api/orders/create` - Create new order with files
- `GET /api/orders/:orderId` - Get order details

### Admin Endpoints

- `GET /api/admin/orders` - List all orders
- `POST /api/admin/orders/:orderId/upload-processed` - Upload processed files

### Download Endpoints (Phase 2)

- `GET /api/download/:token` - Download file with secure token

## Database Schema

### `orders` table
- Order ID, customer details, status, pricing
- Processing options (format, loudness, breath level)

### `files` table
- File metadata (raw & processed)
- Storage URLs, file sizes

### `download_tokens` table
- Secure download tokens
- Expiry dates, download counts

### `notifications` table
- Email notification log

## Email Notifications

1. **Order Confirmation** - Sent to customer immediately
2. **Admin Notification** - Sent to you when new order arrives
3. **Files Ready** - Sent to customer when you upload processed files
4. **Payment Confirmation** - Sent after successful payment (Phase 2)

## Pricing Logic

Currently set in `/server/index.js` line 159:

```javascript
const fileCount = req.files.length;
let totalPrice = fileCount <= 5 ? 45 : fileCount * 15;
```

**Current pricing:**
- €45 flat for up to 5 files (Audition Ready package)
- €15 per file for more than 5 files

**Adjust as needed!**

## Development Workflow

### Processing an Order

1. Check admin panel for new orders
2. Download raw files from `uploads/[order-id]/raw/`
3. Process in your DAW using your plugin chain:
   - FabFilter Pro-G (breath removal)
   - RX 10 Mouth De-click
   - RX 10 De-click
   - FabFilter Pro-MB (de-essing)
   - FabFilter Pro-C 2 (compression)
   - Ozone 9 Master Rebalance
   - FabFilter Pro-Q3 (final EQ)
4. Export processed files
5. Upload via admin panel → Customer gets notified automatically

## Next Steps (Phase 2)

### 1. Audio Preview Generation

Install FFmpeg and add preview generation:

```bash
brew install ffmpeg  # macOS
```

Create 30-second preview with watermark or time limit.

### 2. Stripe Integration

- Add payment checkout page
- Create webhook endpoint for payment confirmation
- Auto-release download tokens after payment

### 3. Cloud Storage (Cloudflare R2)

- Move from local storage to R2
- Generate presigned URLs for downloads
- Reduce server storage costs

## Production Deployment

### Option 1: Simple VPS (DigitalOcean, Linode)

1. Set up Node.js server
2. Configure reverse proxy (Nginx)
3. Set up SSL (Let's Encrypt)
4. Use PM2 for process management

### Option 2: Platform as a Service

- **Railway** - Easy Node.js deployment
- **Render** - Free tier available
- **Fly.io** - Edge deployment

### Required:
- Domain name (e.g., cleanup.olavoices.com)
- Email service (Resend account)
- File storage (local or Cloudflare R2)
- Payment gateway (Stripe account)

## Cost Estimate

**Monthly operating costs:**
- Resend (email): Free tier (3k emails/mo) or $20/mo
- Cloudflare R2: $0 for first 10GB storage
- Stripe: 2.9% + €0.30 per transaction
- Hosting: €5-20/mo (VPS) or €0 (free tier platforms)

**Total: ~€25-40/month** for professional operation

## Support

For questions or issues, contact hello@olavoices.com

## License

Private use - OlaVoices 2024
