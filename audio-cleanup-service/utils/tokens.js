import { nanoid } from 'nanoid';
import db from '../database/schema.js';

/**
 * Generate unique order ID
 */
export function generateOrderId() {
  return `ACS-${nanoid(12)}`;
}

/**
 * Generate secure download token
 */
export function generateDownloadToken() {
  return nanoid(32);
}

/**
 * Create download token for an order
 */
export function createDownloadToken(orderId, fileId, maxDownloads = 3, expiryDays = 7) {
  const token = generateDownloadToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const stmt = db.prepare(`
    INSERT INTO download_tokens (token, order_id, file_id, expires_at, max_downloads)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(token, orderId, fileId, expiresAt.toISOString(), maxDownloads);

  return token;
}

/**
 * Validate download token
 */
export function validateDownloadToken(token) {
  const stmt = db.prepare(`
    SELECT * FROM download_tokens
    WHERE token = ? AND expires_at > datetime('now') AND download_count < max_downloads
  `);

  const tokenData = stmt.get(token);

  if (!tokenData) {
    return { valid: false, reason: 'Token invalid, expired, or download limit reached' };
  }

  return { valid: true, data: tokenData };
}

/**
 * Increment download count
 */
export function incrementDownloadCount(token) {
  const stmt = db.prepare(`
    UPDATE download_tokens
    SET download_count = download_count + 1
    WHERE token = ?
  `);

  stmt.run(token);
}

/**
 * Get all download tokens for an order
 */
export function getOrderDownloadTokens(orderId) {
  const stmt = db.prepare(`
    SELECT dt.*, f.filename, f.original_filename
    FROM download_tokens dt
    JOIN files f ON dt.file_id = f.id
    WHERE dt.order_id = ?
  `);

  return stmt.all(orderId);
}
