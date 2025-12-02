/**
 * Catalyst Stratus Storage Integration
 *
 * Replaces local file storage and Cloudflare R2 with Catalyst Stratus
 * object storage. Supports multipart upload for files up to 200MB.
 *
 * Stratus Documentation:
 * https://docs.catalyst.zoho.com/en/cloud-scale/help/stratus/
 */

import catalyst from 'zcatalyst-sdk-node';
import fs from 'fs';
import path from 'path';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Stratus Bucket Name
 * Stratus uses bucket names as identifiers (not numeric IDs like DataStore)
 *
 * Bucket created: audio-cleanup-files
 * Region: EU (zohostratus.eu)
 */
const BUCKET_ID = process.env.STRATUS_BUCKET_ID || 'audio-cleanup-files';

// File upload configuration
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // Use multipart for files > 100MB
const PREVIEW_EXPIRY = 3600; // 1 hour (for preview URLs)
const DOWNLOAD_EXPIRY = 86400; // 24 hours (for download URLs)

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Stratus instance from request
 * @param {Object} req - Express request object
 * @returns {Object} Stratus instance
 */
function getStratus(req) {
  if (!req) {
    throw new Error('Request object is required to initialize Catalyst');
  }
  const app = catalyst.initialize(req);
  return app.stratus();
}

/**
 * Get bucket instance
 * @param {Object} req - Express request object
 * @returns {Object} Bucket instance
 */
function getBucket(req) {
  if (!BUCKET_ID || BUCKET_ID === '0') {
    throw new Error('STRATUS_BUCKET_ID not configured. Update it in stratus-storage.js or set environment variable.');
  }

  const stratus = getStratus(req);
  return stratus.bucket(BUCKET_ID);
}

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
 * Upload buffer to Stratus (for memory storage uploads)
 * @param {Object} req - Express request object
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} orderId - Order ID
 * @param {string} originalFilename - Original filename
 * @param {string} fileType - 'raw' or 'processed' or 'preview'
 * @returns {Promise<Object>} Upload result with object_key
 */
export async function uploadBuffer(req, buffer, orderId, originalFilename, fileType) {
  try {
    const bucket = getBucket(req);
    const objectKey = generateObjectKey(orderId, originalFilename, fileType);
    const fileSize = buffer.length;

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${fileSize} bytes) exceeds maximum allowed (${MAX_FILE_SIZE} bytes)`);
    }

    console.log(`📤 Uploading buffer to Stratus: ${objectKey} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Write buffer to temporary file for Stratus upload
    const tempPath = `/tmp/upload-${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`;
    fs.writeFileSync(tempPath, buffer);

    try {
      // Use standard upload (multipart not needed for buffers since they're in memory)
      const uploadResult = await bucket.uploadObject({
        file_path: tempPath,
        object_name: objectKey
      });

      console.log('✅ Buffer upload successful');

      return {
        object_key: objectKey,
        bucket_id: BUCKET_ID,
        file_size: fileSize,
        uploaded_at: new Date().toISOString()
      };
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  } catch (error) {
    console.error('❌ Stratus buffer upload failed:', error);
    throw new Error(`Failed to upload buffer to Stratus: ${error.message}`);
  }
}

/**
 * Upload file to Stratus (auto-selects multipart for large files)
 * @param {Object} req - Express request object
 * @param {string} localFilePath - Path to local file
 * @param {string} orderId - Order ID
 * @param {string} originalFilename - Original filename
 * @param {string} fileType - 'raw' or 'processed' or 'preview'
 * @returns {Promise<Object>} Upload result with object_key and download_url
 */
export async function uploadFile(req, localFilePath, orderId, originalFilename, fileType) {
  try {
    const bucket = getBucket(req);
    const objectKey = generateObjectKey(orderId, originalFilename, fileType);

    // Check file size
    const stats = fs.statSync(localFilePath);
    const fileSize = stats.size;

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${fileSize} bytes) exceeds maximum allowed (${MAX_FILE_SIZE} bytes)`);
    }

    console.log(`📤 Uploading to Stratus: ${objectKey} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    let uploadResult;

    // Use multipart upload for large files
    if (fileSize > MULTIPART_THRESHOLD) {
      console.log('Using multipart upload for large file...');
      uploadResult = await uploadMultipart(bucket, localFilePath, objectKey);
    } else {
      // Standard upload for smaller files
      uploadResult = await bucket.uploadObject({
        file_path: localFilePath,
        object_name: objectKey
      });
    }

    console.log('✅ Upload successful');

    return {
      object_key: objectKey,
      bucket_id: BUCKET_ID,
      file_size: fileSize,
      uploaded_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Stratus upload failed:', error);
    throw new Error(`Failed to upload file to Stratus: ${error.message}`);
  }
}

/**
 * Upload file using multipart upload (for files > 100MB)
 * @param {Object} bucket - Bucket instance
 * @param {string} localFilePath - Path to local file
 * @param {string} objectKey - Object key in bucket
 * @returns {Promise<Object>} Upload result
 */
async function uploadMultipart(bucket, localFilePath, objectKey) {
  try {
    // Initialize multipart upload
    const multipart = await bucket.initializeMultipartUpload({
      object_name: objectKey
    });

    const uploadId = multipart.upload_id;
    const stats = fs.statSync(localFilePath);
    const fileSize = stats.size;
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const numChunks = Math.ceil(fileSize / chunkSize);

    console.log(`📦 Uploading in ${numChunks} parts...`);

    const parts = [];

    // Upload each part
    for (let partNumber = 1; partNumber <= numChunks; partNumber++) {
      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const partSize = end - start;

      // Create temporary file for this part
      const partPath = `/tmp/part-${partNumber}.tmp`;
      const readStream = fs.createReadStream(localFilePath, { start, end: end - 1 });
      const writeStream = fs.createWriteStream(partPath);

      await new Promise((resolve, reject) => {
        readStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Upload part
      const partResult = await bucket.uploadPart({
        upload_id: uploadId,
        part_number: partNumber,
        file_path: partPath
      });

      parts.push({
        part_number: partNumber,
        etag: partResult.etag
      });

      // Clean up temp file
      fs.unlinkSync(partPath);

      console.log(`  Part ${partNumber}/${numChunks} uploaded (${(partSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Complete multipart upload
    const result = await bucket.completeMultipartUpload({
      upload_id: uploadId,
      parts: parts
    });

    console.log('✅ Multipart upload completed');
    return result;
  } catch (error) {
    console.error('❌ Multipart upload failed:', error);
    // Abort the multipart upload on error
    try {
      await bucket.abortMultipartUpload({ upload_id: uploadId });
    } catch (abortError) {
      console.error('Failed to abort multipart upload:', abortError);
    }
    throw error;
  }
}

// ============================================
// DOWNLOAD FUNCTIONS
// ============================================

/**
 * Get presigned download URL for a file
 * @param {Object} req - Express request object
 * @param {string} objectKey - Object key in bucket
 * @param {number} expiresIn - URL expiry in seconds (default: 24 hours)
 * @returns {Promise<string>} Presigned download URL
 */
export async function getDownloadUrl(req, objectKey, expiresIn = DOWNLOAD_EXPIRY) {
  try {
    const bucket = getBucket(req);

    const result = await bucket.getObjectDownloadUrl({
      object_key: objectKey,
      expires_in: expiresIn
    });

    return result.download_url;
  } catch (error) {
    console.error('❌ Failed to generate download URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
}

/**
 * Get presigned preview URL (shorter expiry for security)
 * @param {Object} req - Express request object
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
 * Delete file from Stratus
 * @param {Object} req - Express request object
 * @param {string} objectKey - Object key to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteFile(req, objectKey) {
  try {
    const bucket = getBucket(req);

    const result = await bucket.deleteObject({
      object_key: objectKey
    });

    console.log(`🗑️  Deleted from Stratus: ${objectKey}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to delete file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Delete all files for an order
 * @param {Object} req - Express request object
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Delete results
 */
export async function deleteOrderFiles(req, orderId) {
  try {
    const bucket = getBucket(req);

    // List all objects with prefix (orderId)
    const objects = await bucket.listObjects({
      prefix: `${orderId}/`
    });

    if (!objects || objects.length === 0) {
      console.log(`No files found for order: ${orderId}`);
      return [];
    }

    // Delete each object
    const deleteResults = [];
    for (const obj of objects) {
      const result = await deleteFile(req, obj.object_key);
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
 * @param {Object} req - Express request object
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} List of objects
 */
export async function listOrderFiles(req, orderId) {
  try {
    const bucket = getBucket(req);

    const objects = await bucket.listObjects({
      prefix: `${orderId}/`
    });

    return objects || [];
  } catch (error) {
    console.error('❌ Failed to list order files:', error);
    throw new Error(`Failed to list order files: ${error.message}`);
  }
}

// ============================================
// MIGRATION HELPER (from local storage)
// ============================================

/**
 * Migrate local file to Stratus
 * Useful for migrating existing uploads directory to Stratus
 * @param {Object} req - Express request object
 * @param {string} localFilePath - Path to local file
 * @param {string} orderId - Order ID
 * @param {string} originalFilename - Original filename
 * @param {string} fileType - File type
 * @returns {Promise<Object>} Upload result
 */
export async function migrateLocalFile(req, localFilePath, orderId, originalFilename, fileType) {
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found: ${localFilePath}`);
  }

  console.log(`🔄 Migrating local file to Stratus: ${localFilePath}`);

  const result = await uploadFile(req, localFilePath, orderId, originalFilename, fileType);

  // Optionally delete local file after successful upload
  // fs.unlinkSync(localFilePath);

  return result;
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
  const result = await uploadFile(
    req,
    file.path, // Multer stores file temporarily at file.path
    orderId,
    file.originalname,
    fileType
  );

  // Clean up temporary file after upload
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return {
    stored_filename: result.object_key,
    storage_url: `stratus://${BUCKET_ID}/${result.object_key}`,
    file_size: result.file_size
  };
}

/**
 * Get presigned URL (compatibility with utils/storage.js)
 * @param {Object} req - Express request object
 * @param {string} storagePath - Storage path (object key)
 * @returns {Promise<string>} Download URL
 */
export async function getPresignedUrl(req, storagePath) {
  // Extract object key from storage URL if needed
  const objectKey = storagePath.replace(/^stratus:\/\/[^/]+\//, '');
  return await getDownloadUrl(req, objectKey);
}

// ============================================
// INITIALIZATION
// ============================================

console.log('✅ Catalyst Stratus storage initialized');
console.log(`⚠️  Bucket ID: ${BUCKET_ID === '0' ? 'NOT CONFIGURED' : BUCKET_ID}`);
console.log(`📦 Max file size: ${MAX_FILE_SIZE / 1024 / 1024} MB`);
console.log(`🔄 Multipart threshold: ${MULTIPART_THRESHOLD / 1024 / 1024} MB`);

// Export all functions
export default {
  uploadFile,
  uploadBuffer,
  getDownloadUrl,
  getPreviewUrl,
  deleteFile,
  deleteOrderFiles,
  listOrderFiles,
  migrateLocalFile,
  saveFile,
  getPresignedUrl
};
