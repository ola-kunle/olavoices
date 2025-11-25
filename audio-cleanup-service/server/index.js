import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import db from '../database/schema.js';
import {
  generateOrderId,
  createDownloadToken,
  validateDownloadToken,
  incrementDownloadCount
} from '../utils/tokens.js';
import {
  sendOrderConfirmation,
  notifyAdminNewOrder,
  sendFilesReadyNotification,
  sendPaymentConfirmation
} from '../utils/email.js';
import { uploadToR2, saveLocalFile, getPresignedDownloadUrl } from '../utils/storage.js';
import { generatePreview } from '../utils/preview.js';
import { createPaymentSession } from '../utils/payments.js';
import { scheduleAutomaticCleanup } from '../utils/cleanup.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Create uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orderId = req.body.orderId || 'temp';
    const dir = path.join(uploadsDir, orderId, 'raw');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
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

    // Insert order into database
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, customer_email, customer_name, customer_phone,
        status, total_price, delivery_format, loudness_target,
        breath_level, deadline, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      orderId,
      customerEmail,
      customerName,
      customerPhone || null,
      'pending',
      totalPrice,
      deliveryFormat || 'WAV 24-bit',
      loudnessTarget || 'LUFS -16',
      breathLevel || 'Natural',
      deadline || '24-48 hours',
      notes || null
    );

    // Insert files into database
    const insertFile = db.prepare(`
      INSERT INTO files (order_id, file_type, filename, original_filename, file_size, storage_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const files = req.files.map(file => {
      const storageUrl = `/uploads/${orderId}/raw/${file.filename}`;

      insertFile.run(
        orderId,
        'raw',
        file.filename,
        file.originalname,
        file.size,
        storageUrl
      );

      return {
        original_filename: file.originalname,
        file_size: file.size,
        storage_url: storageUrl
      };
    });

    // Get order details for emails
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    // Send confirmation emails
    await sendOrderConfirmation(order, files);
    await notifyAdminNewOrder(order, files);

    // Log notification
    const logNotification = db.prepare(`
      INSERT INTO notifications (order_id, notification_type, sent_to)
      VALUES (?, ?, ?)
    `);
    logNotification.run(orderId, 'order_confirmation', customerEmail);
    logNotification.run(orderId, 'admin_notification', process.env.ADMIN_EMAIL || 'hello@olavoices.com');

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
app.get('/api/orders/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const files = db.prepare('SELECT * FROM files WHERE order_id = ?').all(orderId);

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
app.get('/api/admin/orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT
        o.*,
        COUNT(f.id) as file_count
      FROM orders o
      LEFT JOIN files f ON o.id = f.order_id AND f.file_type = 'raw'
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `).all();

    res.json({
      success: true,
      orders
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

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Save processed files and generate previews
    const insertFile = db.prepare(`
      INSERT INTO files (order_id, file_type, filename, original_filename, file_size, storage_url, preview_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of req.files) {
      const storageUrl = `/uploads/${orderId}/processed/${file.filename}`;

      // Generate preview (30-second sample)
      const previewFilename = `preview-${file.filename}`;
      const previewPath = path.join(uploadsDir, orderId, 'processed', previewFilename);

      await generatePreview(file.path, previewPath);

      const previewUrl = fs.existsSync(previewPath)
        ? `/uploads/${orderId}/processed/${previewFilename}`
        : null;

      insertFile.run(
        orderId,
        'processed',
        file.filename,
        file.originalname,
        file.size,
        storageUrl,
        previewUrl
      );

      console.log(`✅ Processed file added${previewUrl ? ' with preview' : ''}: ${file.originalname}`);
    }

    // Update order status
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('ready', orderId);

    // Send notification to customer
    const previewUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/order/${orderId}/preview`;
    await sendFilesReadyNotification(order, previewUrl);

    // Log notification
    db.prepare(`
      INSERT INTO notifications (order_id, notification_type, sent_to)
      VALUES (?, ?, ?)
    `).run(orderId, 'files_ready', order.customer_email);

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

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update payment status
    db.prepare(`
      UPDATE orders
      SET payment_status = ?, payment_intent_id = ?, status = ?
      WHERE id = ?
    `).run('paid', paymentIntentId, 'completed', orderId);

    // Get processed files
    const processedFiles = db.prepare(`
      SELECT * FROM files
      WHERE order_id = ? AND file_type = 'processed'
    `).all(orderId);

    // Create download tokens
    const tokens = processedFiles.map(file => {
      const token = createDownloadToken(orderId, file.id);
      return { fileId: file.id, token };
    });

    // Generate download URL
    const downloadUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/download/${orderId}`;

    // Send payment confirmation email
    await sendPaymentConfirmation(order, downloadUrl);

    // Log notification
    db.prepare(`
      INSERT INTO notifications (order_id, notification_type, sent_to)
      VALUES (?, ?, ?)
    `).run(orderId, 'payment_confirmation', order.customer_email);

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
app.get('/api/download/:token', (req, res) => {
  try {
    const { token } = req.params;

    // Validate token
    const validation = validateDownloadToken(token);

    if (!validation.valid) {
      return res.status(403).json({
        success: false,
        error: validation.reason
      });
    }

    const tokenData = validation.data;

    // Get file info
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(tokenData.file_id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Increment download count
    incrementDownloadCount(token);

    // Send file
    const filePath = path.join(__dirname, '..', file.storage_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    res.download(filePath, file.original_filename);

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

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Get processed files with preview URLs
    const processedFiles = db.prepare(`
      SELECT * FROM files
      WHERE order_id = ? AND file_type = 'processed'
    `).all(orderId);

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

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

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
      db.prepare(`
        UPDATE orders
        SET payment_status = 'paid', payment_intent_id = ?, status = 'completed'
        WHERE id = ?
      `).run(session.payment_intent, orderId);

      // Get order for email
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

      // Create download tokens
      const processedFiles = db.prepare(`
        SELECT * FROM files WHERE order_id = ? AND file_type = 'processed'
      `).all(orderId);

      processedFiles.forEach(file => {
        createDownloadToken(orderId, file.id);
      });

      // Send confirmation email
      const downloadUrl = `${process.env.BASE_URL}/download/${orderId}`;
      await sendPaymentConfirmation(order, downloadUrl);

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

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.payment_status !== 'paid') {
      return res.status(403).send('Payment required');
    }

    // Get processed files with download tokens
    const files = db.prepare(`
      SELECT f.*, dt.token, dt.download_count, dt.max_downloads, dt.expires_at
      FROM files f
      LEFT JOIN download_tokens dt ON f.id = dt.file_id
      WHERE f.order_id = ? AND f.file_type = 'processed'
    `).all(orderId);

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
        ${files.map(file => `
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
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Database initialized`);
  console.log('');

  // Start automatic cleanup scheduler
  scheduleAutomaticCleanup();
});

export default app;
