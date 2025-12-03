import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Catalyst DataStore for cloud database
import {
  insertOrder,
  getOrder,
  getAllOrders,
  updateOrder,
  insertFile,
  getOrderFiles,
  createDownloadToken as createToken,
  getToken,
  incrementDownloadCount as incrementTokenDownloadCount,
  logNotification
} from '../database/catalyst-db.js';

import {
  generateOrderId
} from '../utils/tokens.js';
import {
  sendOrderConfirmation,
  notifyAdminNewOrder,
  sendFilesReadyNotification,
  sendPaymentConfirmation
} from '../utils/email.js';
import { uploadFile as uploadToTebi, uploadBuffer, getDownloadUrl } from '../utils/tebi-storage.js';
import { generatePreview } from '../utils/preview.js';
import { createPaymentSession } from '../utils/payments.js';
// TEMPORARY: Cleanup scheduler disabled during migration
// import { scheduleAutomaticCleanup } from '../utils/cleanup.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Catalyst AppSail uses X_ZOHO_CATALYST_LISTEN_PORT, fallback to PORT for local dev
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 3000;

// Middleware
// CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://olavoices.com',
    'https://www.olavoices.com',
    'https://api.olavoices.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Prevent spam uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 uploads per 15 minutes per IP
  message: 'Too many upload requests. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute per IP
  message: 'Too many requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply API rate limiting globally
app.use('/api/', apiLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure multer for file uploads (using memory storage for Catalyst compatibility)
// Files are stored in memory as buffers and uploaded directly to Stratus
console.log('📁 Using memory storage for file uploads (no disk writes)');

// Upload directory for processed files and previews (only used by admin routes)
const uploadsDir = '/tmp/uploads';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max (optimized from 500MB)
  },
  fileFilter: (req, file, cb) => {
    // Strict validation: Only WAV and MP3 for optimal processing
    const allowedTypes = /wav|mp3/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.includes('audio/wav') ||
                     file.mimetype.includes('audio/mpeg') ||
                     file.mimetype.includes('audio/mp3') ||
                     file.mimetype.includes('audio/x-wav');

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only WAV and MP3 files are accepted for optimal processing'));
    }
  }
});

// Separate multer configuration for processed files
const processedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderId = req.params.orderId; // Get from URL params, not body
    const dir = path.join(uploadsDir, orderId, 'processed');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadProcessed = multer({
  storage: processedStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /wav|mp3|aiff|aif|flac|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('audio');

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed (WAV, MP3, AIFF, FLAC, M4A)'));
    }
  }
});

// ============================================
// API ROUTES
// ============================================

/**
 * GET /health
 * Health check endpoint (no database required)
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'audio-cleanup-service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    message: 'OlaVoices Audio Cleanup Service API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      createOrder: 'POST /api/orders/create',
      getOrder: 'GET /api/orders/:orderId',
      checkout: 'POST /api/orders/:orderId/checkout'
    }
  });
});

/**
 * POST /api/orders/create
 * Create new order with file uploads (with rate limiting)
 */
app.post('/api/orders/create', uploadLimiter, upload.array('audioFiles', 10), async (req, res) => {
  try {
    const {
      customerEmail,
      customerName,
      customerPhone,
      deliveryFormat,
      loudnessTarget,
      breathLevel,
      deadline,
      notes,
      pricingPackage
    } = req.body;

    // Validation
    if (!customerEmail || !customerName || !req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, and at least one audio file'
      });
    }

    // Generate order ID
    const orderId = generateOrderId();

    // Calculate price based on selected package
    let totalPrice = 12; // Default to single audition

    if (pricingPackage === 'single') {
      totalPrice = 12; // €12 for single audition (up to 3 minutes)
    } else if (pricingPackage === 'per-minute') {
      // For per-minute pricing, we need to calculate based on audio duration
      // This requires FFmpeg to get duration - for now, use file count estimate
      const fileCount = req.files.length;
      totalPrice = fileCount * 15; // €15 per file as estimate (will be updated after processing)
    }

    // Apply rush fee multipliers
    if (deadline === '12 hours') {
      totalPrice = Math.round(totalPrice * 1.5);
    } else if (deadline === '6 hours') {
      totalPrice = Math.round(totalPrice * 2);
    }

    // Rename upload directory from temp to orderId
    const tempDir = path.join(uploadsDir, 'temp', 'raw');
    const orderDir = path.join(uploadsDir, orderId);

    if (fs.existsSync(tempDir)) {
      fs.renameSync(path.dirname(tempDir), orderDir);
    }

    // Insert order into Catalyst DataStore
    await insertOrder(req, {
      id: orderId,
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      status: 'pending',
      total_price: totalPrice,
      delivery_format: deliveryFormat || 'WAV 24-bit',
      loudness_target: loudnessTarget || 'LUFS -16',
      breath_level: breathLevel || 'Natural',
      deadline: deadline || '24-48 hours',
      notes: notes || null,
      payment_status: 'unpaid',
      currency: 'EUR'
    });

    // Upload files to Stratus and insert into Catalyst DataStore
    const files = [];
    for (const file of req.files) {
      console.log('📤 Uploading file buffer to Stratus...');
      console.log('   Buffer size:', file.buffer.length, 'bytes');
      console.log('   File size:', file.size);
      console.log('   Original name:', file.originalname);

      // Upload buffer to Tebi (using memory storage)
      const tebiResult = await uploadBuffer(
        req,
        file.buffer,
        orderId,
        file.originalname,
        'raw'
      );
      console.log('✅ Tebi buffer upload successful:', tebiResult.object_key);

      const storageUrl = `tebi://${tebiResult.bucket_id}/${tebiResult.object_key}`;

      // Generate unique filename for database record
      const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;

      await insertFile(req, {
        order_id: orderId,
        file_type: 'raw',
        filename: uniqueFilename,
        original_filename: file.originalname,
        file_size: file.size,
        storage_url: storageUrl
      });

      files.push({
        original_filename: file.originalname,
        file_size: file.size,
        storage_url: storageUrl
      });

      // No cleanup needed - memory storage handles this automatically
    }

    // Get order details for emails
    const order = await getOrder(req, orderId);

    // Send confirmation emails
    await sendOrderConfirmation(order, files);
    await notifyAdminNewOrder(order, files);

    // Log notifications in Catalyst DataStore
    await logNotification(req, {
      order_id: orderId,
      notification_type: 'order_confirmation',
      sent_to: customerEmail,
      status: 'sent'
    });

    await logNotification(req, {
      order_id: orderId,
      notification_type: 'admin_notification',
      sent_to: process.env.ADMIN_EMAIL || 'hello@olavoices.com',
      status: 'sent'
    });

    res.json({
      success: true,
      orderId: orderId,
      filesUploaded: files.length,
      totalPrice: totalPrice,
      message: 'Order created successfully! Check your email for confirmation.'
    });

  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orders/:orderId
 * Get order details
 */
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await getOrder(req, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const files = await getOrderFiles(req, orderId);

    res.json({
      success: true,
      order,
      files
    });

  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/orders
 * Get all orders (admin only - add authentication later)
 */
app.get('/api/admin/orders', async (req, res) => {
  try {
    // Get all orders from Catalyst DataStore
    const orders = await getAllOrders(req);

    // Get file counts for each order
    const ordersWithCounts = await Promise.all(
      orders.map(async (order) => {
        const files = await getOrderFiles(req, order.id);
        const rawFiles = files.filter(f => f.file_type === 'raw');
        return {
          ...order,
          file_count: rawFiles.length
        };
      })
    );

    // Sort by order_date descending (most recent first)
    ordersWithCounts.sort((a, b) =>
      new Date(b.order_date || b.CREATEDTIME) - new Date(a.order_date || a.CREATEDTIME)
    );

    res.json({
      success: true,
      orders: ordersWithCounts
    });

  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/orders/:orderId/upload-processed
 * Upload processed files (admin only)
 */
app.post('/api/admin/orders/:orderId/upload-processed', uploadProcessed.array('processedFiles', 10), async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await getOrder(req, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Upload processed files to Tebi and generate previews
    for (const file of req.files) {
      // Upload processed file to Tebi
      const tebiResult = await uploadToTebi(
        req,
        file.path,
        orderId,
        file.originalname,
        'processed'
      );

      const storageUrl = `tebi://${tebiResult.bucket_id}/${tebiResult.object_key}`;

      // Generate preview (30-second sample) - keep preview local temporarily
      const previewFilename = `preview-${file.filename}`;
      const previewPath = path.join(uploadsDir, orderId, 'processed', previewFilename);

      await generatePreview(file.path, previewPath);

      let previewUrl = null;
      if (fs.existsSync(previewPath)) {
        // Upload preview to Tebi
        const previewResult = await uploadToTebi(
          req,
          previewPath,
          orderId,
          previewFilename,
          'preview'
        );
        previewUrl = `tebi://${previewResult.bucket_id}/${previewResult.object_key}`;

        // Clean up local preview file
        fs.unlinkSync(previewPath);
      }

      await insertFile(req, {
        order_id: orderId,
        file_type: 'processed',
        filename: file.filename,
        original_filename: file.originalname,
        file_size: file.size,
        storage_url: storageUrl,
        preview_url: previewUrl
      });

      // Clean up temporary processed file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      console.log(`✅ Processed file uploaded to Stratus${previewUrl ? ' with preview' : ''}: ${file.originalname}`);
    }

    // Update order status
    await updateOrder(req, orderId, { status: 'ready' });

    // Send notification to customer
    const previewUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/order/${orderId}/preview`;
    await sendFilesReadyNotification(order, previewUrl);

    // Log notification
    await logNotification(req, {
      order_id: orderId,
      notification_type: 'files_ready',
      sent_to: order.customer_email,
      status: 'sent'
    });

    res.json({
      success: true,
      message: 'Processed files uploaded and customer notified',
      filesUploaded: req.files.length
    });

  } catch (error) {
    console.error('❌ Upload processed files error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/orders/:orderId/payment
 * Handle payment confirmation (Stripe webhook will call this)
 */
app.post('/api/orders/:orderId/payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId } = req.body;

    const order = await getOrder(req, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update payment status
    await updateOrder(req, orderId, {
      payment_status: 'paid',
      payment_intent_id: paymentIntentId,
      status: 'completed'
    });

    // Get processed files
    const allFiles = await getOrderFiles(req, orderId);
    const processedFiles = allFiles.filter(f => f.file_type === 'processed');

    // Create download tokens
    const { nanoid } = await import('nanoid');
    const tokens = [];
    for (const file of processedFiles) {
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await createToken(req, {
        token,
        order_id: orderId,
        file_id: file.ROWID,
        expires_at: expiresAt.toISOString(),
        download_count: 0,
        max_downloads: 3
      });

      tokens.push({ fileId: file.ROWID, token });
    }

    // Generate download URL
    const downloadUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/download/${orderId}`;

    // Send payment confirmation email
    await sendPaymentConfirmation(order, downloadUrl);

    // Log notification
    await logNotification(req, {
      order_id: orderId,
      notification_type: 'payment_confirmation',
      sent_to: order.customer_email,
      status: 'sent'
    });

    res.json({
      success: true,
      message: 'Payment confirmed, download links sent',
      downloadUrl
    });

  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/download/:token
 * Download file with token
 */
app.get('/api/download/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Get and validate token
    const tokenData = await getToken(req, token);

    if (!tokenData) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired download token'
      });
    }

    // Check if token has expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Download token has expired'
      });
    }

    // Check if max downloads reached
    if (tokenData.download_count >= tokenData.max_downloads) {
      return res.status(403).json({
        success: false,
        error: 'Maximum download limit reached'
      });
    }

    // Get file info by ROWID (Catalyst uses ROWID instead of id)
    const allFiles = await getOrderFiles(req, tokenData.order_id);
    const file = allFiles.find(f => f.ROWID === tokenData.file_id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Increment download count
    await incrementTokenDownloadCount(req, token);

    // Extract object key from storage URL (format: tebi://bucket/object_key)
    const objectKey = file.storage_url.replace(/^tebi:\/\/[^/]+\//, '');

    // Generate presigned download URL from Tebi (expires in 1 hour)
    const downloadUrl = await getDownloadUrl(req, objectKey, 3600);

    // Redirect to presigned URL
    res.redirect(downloadUrl);

  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orders/:orderId/preview
 * Get order preview page data
 */
app.get('/api/orders/:orderId/preview', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await getOrder(req, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get all files and filter for processed files
    const allFiles = await getOrderFiles(req, orderId);
    const processedFiles = allFiles.filter(f => f.file_type === 'processed');

    res.json({
      success: true,
      order,
      files: processedFiles,
      previewAvailable: processedFiles.length > 0
    });

  } catch (error) {
    console.error('❌ Preview data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/orders/:orderId/checkout
 * Create Stripe checkout session
 */
app.post('/api/orders/:orderId/checkout', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await getOrder(req, orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Order already paid'
      });
    }

    const successUrl = `${process.env.BASE_URL}/payment-success.html?orderId=${orderId}`;
    const cancelUrl = `${process.env.BASE_URL}/order/${orderId}/preview`;

    const session = await createPaymentSession(order, successUrl, cancelUrl);

    if (!session) {
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured'
      });
    }

    res.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url
    });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /webhook/stripe
 * Stripe webhook for payment confirmation
 */
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    // Verify webhook (implementation in payments.js)
    // For now, just parse the event
    const event = req.body;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.client_reference_id;

      // Update order payment status
      await updateOrder(req, orderId, {
        payment_status: 'paid',
        payment_intent_id: session.payment_intent,
        status: 'completed'
      });

      // Get order for email
      const order = await getOrder(req, orderId);

      // Create download tokens for processed files
      const allFiles = await getOrderFiles(req, orderId);
      const processedFiles = allFiles.filter(f => f.file_type === 'processed');

      const { nanoid } = await import('nanoid');

      for (const file of processedFiles) {
        const token = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await createToken(req, {
          token,
          order_id: orderId,
          file_id: file.ROWID,
          expires_at: expiresAt.toISOString(),
          download_count: 0,
          max_downloads: 3
        });
      }

      // Send confirmation email
      const downloadUrl = `${process.env.BASE_URL}/download/${orderId}`;
      await sendPaymentConfirmation(order, downloadUrl);

      // Log notification
      await logNotification(req, {
        order_id: orderId,
        notification_type: 'payment_confirmation',
        sent_to: order.customer_email,
        status: 'sent'
      });

      console.log(`✅ Payment confirmed for order ${orderId}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /download/:orderId
 * Download page with all files for paid order
 */
app.get('/download/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await getOrder(req, orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.payment_status !== 'paid') {
      return res.status(403).send('Payment required');
    }

    // Get processed files
    const allFiles = await getOrderFiles(req, orderId);
    const processedFiles = allFiles.filter(f => f.file_type === 'processed');

    // Get download tokens table for matching
    const catalyst = await import('zcatalyst-sdk-node');
    const app = catalyst.default.initialize(req);
    const datastore = app.datastore();
    const tokensTable = datastore.table(process.env.DATASTORE_TOKENS_TABLE_ID || '5522000000017187');
    const allTokens = await tokensTable.getRows({ order_id: orderId });

    // Combine files with their tokens
    const filesWithTokens = processedFiles.map(file => {
      const token = allTokens.find(t => t.file_id === file.ROWID);
      return {
        ...file,
        token: token?.token,
        download_count: token?.download_count || 0,
        max_downloads: token?.max_downloads || 3,
        expires_at: token?.expires_at
      };
    });

    // Simple download page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Download Your Files</title>
        <style>
          body { font-family: sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #10b981; }
          .file { background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .download-btn { background: #10b981; color: white; padding: 10px 20px; border: none; border-radius: 6px; text-decoration: none; display: inline-block; }
          .download-btn:hover { background: #059669; }
        </style>
      </head>
      <body>
        <h1>Your Cleaned Audio Files</h1>
        <p>Thank you for your payment! Download your files below:</p>
        ${filesWithTokens.map(file => `
          <div class="file">
            <strong>${file.original_filename}</strong><br>
            <small>Downloads: ${file.download_count || 0}/${file.max_downloads || 3}</small><br>
            <a href="/api/download/${file.token}" class="download-btn">Download</a>
          </div>
        `).join('')}
        <p style="color: #6b7280; margin-top: 30px;">
          <strong>Note:</strong> Download links expire in 7 days. You can download each file up to 3 times.
        </p>
      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    console.error('❌ Download page error:', error);
    res.status(500).send('Error loading download page');
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('🎙️  OlaVoices Audio Cleanup Service');
  console.log('=====================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Catalyst DataStore migration complete - all routes migrated`);
  console.log('');

  // TEMPORARY: Automatic cleanup disabled during migration
  // TODO: Re-enable after migrating to Catalyst DataStore
  // scheduleAutomaticCleanup();
});

export default app;
