/**
 * Tebi.io S3-Compatible Storage Integration
 *
 * Replaces Catalyst Stratus with Tebi.io free object storage:
 * - 25GB storage + 250GB bandwidth/month (free tier)
 * - S3-compatible API using AWS SDK v3
 * - Supports multipart upload for files up to 200MB
 *
 * Tebi Documentation:
 * https://tebi.io/
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Tebi.io Configuration
 *
 * Required Environment Variables:
 * - TEBI_ACCESS_KEY: Your Tebi access key
 * - TEBI_SECRET_KEY: Your Tebi secret key
 * - TEBI_BUCKET_NAME: Your bucket name
 * - TEBI_REGION: Region (default: 'global')
 */
const TEBI_ENDPOINT = 'https://s3.tebi.io';
const TEBI_ACCESS_KEY = process.env.TEBI_ACCESS_KEY;
const TEBI_SECRET_KEY = process.env.TEBI_SECRET_KEY;
const BUCKET_NAME = process.env.TEBI_BUCKET_NAME || 'audio-cleanup-files';
const REGION = process.env.TEBI_REGION || 'global';

// File upload configuration
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const PREVIEW_EXPIRY = 3600; // 1 hour (for preview URLs)
const DOWNLOAD_EXPIRY = 86400; // 24 hours (for download URLs)

// ============================================
// S3 CLIENT INITIALIZATION
// ============================================

/**
 * Create S3 client for Tebi.io
 */
function createS3Client() {
  if (!TEBI_ACCESS_KEY || !TEBI_SECRET_KEY) {
    throw new Error('Tebi credentials not configured. Set TEBI_ACCESS_KEY and TEBI_SECRET_KEY environment variables.');
  }

  return new S3Client({
    endpoint: TEBI_ENDPOINT,
    region: REGION,
    credentials: {
      accessKeyId: TEBI_ACCESS_KEY,
      secretAccessKey: TEBI_SECRET_KEY
    },
    forcePathStyle: true // Required for S3-compatible services
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate object key (path in bucket)
 * @param {string} orderId - Order ID
 * @param {string} filename - Original filename
 * @param {string} fileType - 'raw' or 'processed' or 'preview'
 * @returns {string} Object key
 */
function generateObjectKey(orderId, filename, fileType) {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${orderId}/${fileType}/${timestamp}-${safeName}`;
}

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Upload buffer to Tebi.io (for memory storage uploads)
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} orderId - Order ID
 * @param {string} originalFilename - Original filename
 * @param {string} fileType - 'raw' or 'processed' or 'preview'
 * @returns {Promise<Object>} Upload result with object_key
 */
export async function uploadBuffer(req, buffer, orderId, originalFilename, fileType) {
  try {
    const fileSize = buffer.length;

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${fileSize} bytes) exceeds maximum allowed (${MAX_FILE_SIZE} bytes)`);
    }

    console.log(`📤 Uploading buffer to Tebi: ${originalFilename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const s3Client = createS3Client();
    const objectKey = generateObjectKey(orderId, originalFilename, fileType);

    // Upload buffer directly to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: getContentType(originalFilename)
    });

    await s3Client.send(command);

    console.log('✅ Buffer upload successful to Tebi.io');

    return {
      object_key: objectKey,
      bucket_id: BUCKET_NAME,
      file_size: fileSize,
      uploaded_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Tebi buffer upload failed:', error);
    throw new Error(`Failed to upload buffer to Tebi: ${error.message}`);
  }
}

/**
 * Upload file to Tebi.io (from disk path)
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {string} localFilePath - Path to local file
 * @param {string} orderId - Order ID
 * @param {string} originalFilename - Original filename
 * @param {string} fileType - 'raw' or 'processed' or 'preview'
 * @returns {Promise<Object>} Upload result with object_key
 */
export async function uploadFile(req, localFilePath, orderId, originalFilename, fileType) {
  try {
    // Check file size
    const stats = fs.statSync(localFilePath);
    const fileSize = stats.size;

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${fileSize} bytes) exceeds maximum allowed (${MAX_FILE_SIZE} bytes)`);
    }

    console.log(`📤 Uploading file to Tebi: ${originalFilename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Read file into buffer
    const buffer = fs.readFileSync(localFilePath);

    // Use uploadBuffer function
    const result = await uploadBuffer(req, buffer, orderId, originalFilename, fileType);

    console.log('✅ File upload successful to Tebi.io');
    return result;
  } catch (error) {
    console.error('❌ Tebi file upload failed:', error);
    throw new Error(`Failed to upload file to Tebi: ${error.message}`);
  }
}

/**
 * Get content type from filename
 * @param {string} filename - Filename
 * @returns {string} Content type
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// ============================================
// DOWNLOAD FUNCTIONS
// ============================================

/**
 * Get presigned download URL for a file
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {string} objectKey - Object key in bucket
 * @param {number} expiresIn - URL expiry in seconds (default: 24 hours)
 * @returns {Promise<string>} Presigned download URL
 */
export async function getDownloadUrl(req, objectKey, expiresIn = DOWNLOAD_EXPIRY) {
  try {
    const s3Client = createS3Client();

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    console.log(`🔗 Generated download URL for: ${objectKey}`);
    return downloadUrl;
  } catch (error) {
    console.error('❌ Failed to generate download URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
}

/**
 * Get presigned preview URL (shorter expiry for security)
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {string} objectKey - Object key for preview file
 * @returns {Promise<string>} Presigned preview URL
 */
export async function getPreviewUrl(req, objectKey) {
  return await getDownloadUrl(req, objectKey, PREVIEW_EXPIRY);
}

// ============================================
// DELETE FUNCTIONS
// ============================================

/**
 * Delete file from Tebi.io
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {string} objectKey - Object key to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteFile(req, objectKey) {
  try {
    const s3Client = createS3Client();

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey
    });

    await s3Client.send(command);

    console.log(`🗑️  Deleted from Tebi: ${objectKey}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Delete all files for an order
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Delete results
 */
export async function deleteOrderFiles(req, orderId) {
  try {
    const s3Client = createS3Client();

    // List all objects with prefix (orderId)
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${orderId}/`
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log(`No files found for order: ${orderId}`);
      return [];
    }

    // Delete each object
    const deleteResults = [];
    for (const obj of listResponse.Contents) {
      const result = await deleteFile(req, obj.Key);
      deleteResults.push(result);
    }

    console.log(`🗑️  Deleted ${deleteResults.length} files for order: ${orderId}`);
    return deleteResults;
  } catch (error) {
    console.error('❌ Failed to delete order files:', error);
    throw new Error(`Failed to delete order files: ${error.message}`);
  }
}

// ============================================
// LIST FUNCTIONS
// ============================================

/**
 * List all files for an order
 * @param {Object} req - Express request object (unused but kept for compatibility)
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} List of objects
 */
export async function listOrderFiles(req, orderId) {
  try {
    const s3Client = createS3Client();

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${orderId}/`
    });

    const response = await s3Client.send(command);

    return response.Contents || [];
  } catch (error) {
    console.error('❌ Failed to list order files:', error);
    throw new Error(`Failed to list order files: ${error.message}`);
  }
}

// ============================================
// COMPATIBILITY LAYER (for existing storage.js interface)
// ============================================

/**
 * Save file (compatibility with utils/storage.js)
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {string} orderId - Order ID
 * @param {string} fileType - File type
 * @returns {Promise<Object>} Storage result
 */
export async function saveFile(req, file, orderId, fileType) {
  // If file has buffer (memory storage), use uploadBuffer
  if (file.buffer) {
    const result = await uploadBuffer(req, file.buffer, orderId, file.originalname, fileType);

    return {
      stored_filename: result.object_key,
      storage_url: `tebi://${BUCKET_NAME}/${result.object_key}`,
      file_size: result.file_size
    };
  }

  // If file has path (disk storage), use uploadFile
  if (file.path) {
    const result = await uploadFile(req, file.path, orderId, file.originalname, fileType);

    // Clean up temporary file after upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      stored_filename: result.object_key,
      storage_url: `tebi://${BUCKET_NAME}/${result.object_key}`,
      file_size: result.file_size
    };
  }

  throw new Error('File object must have either buffer or path property');
}

/**
 * Get presigned URL (compatibility with utils/storage.js)
 * @param {Object} req - Express request object
 * @param {string} storagePath - Storage path (object key)
 * @returns {Promise<string>} Download URL
 */
export async function getPresignedUrl(req, storagePath) {
  // Extract object key from storage URL if needed
  const objectKey = storagePath.replace(/^tebi:\/\/[^/]+\//, '');
  return await getDownloadUrl(req, objectKey);
}

// ============================================
// INITIALIZATION
// ============================================

console.log('✅ Tebi.io S3-compatible storage initialized');
console.log(`🪣 Bucket: ${BUCKET_NAME}`);
console.log(`📦 Max file size: ${MAX_FILE_SIZE / 1024 / 1024} MB`);
console.log(`🌐 Endpoint: ${TEBI_ENDPOINT}`);
console.log(`⚠️  Credentials: ${TEBI_ACCESS_KEY ? 'Configured' : 'NOT CONFIGURED'}`);

// Export all functions
export default {
  uploadFile,
  uploadBuffer,
  getDownloadUrl,
  getPreviewUrl,
  deleteFile,
  deleteOrderFiles,
  listOrderFiles,
  saveFile,
  getPresignedUrl
};
