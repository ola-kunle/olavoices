import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

// Initialize Cloudflare R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://[account-id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'audio-cleanup';

/**
 * Upload file to R2 storage
 */
export async function uploadToR2(filePath, key, contentType = 'audio/wav') {
  try {
    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    });

    await r2Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`✅ Uploaded to R2: ${key}`);

    return publicUrl;
  } catch (error) {
    console.error('❌ R2 upload error:', error);
    throw error;
  }
}

/**
 * Generate presigned URL for secure downloads
 */
export async function getPresignedDownloadUrl(key, expiresIn = 604800) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn }); // Default 7 days
    console.log(`✅ Generated presigned URL for: ${key}`);

    return url;
  } catch (error) {
    console.error('❌ Presigned URL error:', error);
    throw error;
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log(`✅ Deleted from R2: ${key}`);

    return true;
  } catch (error) {
    console.error('❌ R2 delete error:', error);
    throw error;
  }
}

/**
 * Local file storage (fallback if R2 not configured)
 */
export function saveLocalFile(file, destination) {
  try {
    const dir = path.dirname(destination);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.copyFileSync(file.path, destination);
    console.log(`✅ Saved locally: ${destination}`);

    return destination;
  } catch (error) {
    console.error('❌ Local save error:', error);
    throw error;
  }
}

/**
 * Get file from R2 and save locally
 */
export async function downloadFromR2(key, localPath) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(localPath, buffer);

    console.log(`✅ Downloaded from R2 to: ${localPath}`);
    return localPath;
  } catch (error) {
    console.error('❌ R2 download error:', error);
    throw error;
  }
}
