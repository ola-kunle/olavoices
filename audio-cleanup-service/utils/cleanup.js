import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Delete old order files and database records
 * Default: 30 days retention
 */
export async function cleanupOldOrders(daysToKeep = 30) {
  try {
    console.log(`🧹 Running cleanup: Deleting orders older than ${daysToKeep} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = cutoffDate.toISOString();

    // Find old orders
    const oldOrders = db.prepare(`
      SELECT id, order_date FROM orders
      WHERE order_date < ? AND payment_status = 'paid'
    `).all(cutoffString);

    if (oldOrders.length === 0) {
      console.log('✅ No old orders to clean up');
      return { deleted: 0, freed: 0 };
    }

    let totalFreed = 0;
    let deletedCount = 0;

    // Delete files and records for each old order
    for (const order of oldOrders) {
      const uploadsDir = path.join(__dirname, '../uploads', order.id);

      // Calculate space freed
      if (fs.existsSync(uploadsDir)) {
        const size = getDirectorySize(uploadsDir);
        totalFreed += size;

        // Delete the directory
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        console.log(`🗑️  Deleted files for order ${order.id} (${formatBytes(size)})`);
      }

      // Delete database record (cascade will delete files, tokens, notifications)
      db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
      deletedCount++;
    }

    console.log(`✅ Cleanup complete: ${deletedCount} orders deleted, ${formatBytes(totalFreed)} freed`);

    return {
      deleted: deletedCount,
      freed: totalFreed
    };

  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    return { deleted: 0, freed: 0 };
  }
}

/**
 * Delete unpaid orders older than 7 days
 */
export async function cleanupAbandonedOrders() {
  try {
    console.log('🧹 Cleaning up abandoned unpaid orders...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days for unpaid
    const cutoffString = cutoffDate.toISOString();

    const abandonedOrders = db.prepare(`
      SELECT id FROM orders
      WHERE order_date < ? AND payment_status = 'unpaid'
    `).all(cutoffString);

    let deletedCount = 0;

    for (const order of abandonedOrders) {
      const uploadsDir = path.join(__dirname, '../uploads', order.id);

      if (fs.existsSync(uploadsDir)) {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
      }

      db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
      deletedCount++;
    }

    console.log(`✅ Abandoned orders cleanup: ${deletedCount} deleted`);
    return deletedCount;

  } catch (error) {
    console.error('❌ Abandoned cleanup error:', error.message);
    return 0;
  }
}

/**
 * Get total size of directory in bytes
 */
function getDirectorySize(dirPath) {
  let size = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      const stats = fs.statSync(filePath);
      size += stats.size;
    }
  }

  return size;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Schedule automatic cleanup
 * Runs daily at 2 AM
 */
export function scheduleAutomaticCleanup() {
  // Run immediately on startup
  setTimeout(() => {
    cleanupAbandonedOrders();
    cleanupOldOrders(30);
  }, 5000); // 5 seconds after startup

  // Then run daily
  const oneDayMs = 24 * 60 * 60 * 1000;

  setInterval(() => {
    cleanupAbandonedOrders();
    cleanupOldOrders(30);
  }, oneDayMs);

  console.log('⏰ Automatic cleanup scheduled (runs daily)');
}
