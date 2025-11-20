import fetch from 'node-fetch';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

async function downloadImage(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);

  const buffer = await response.buffer();
  const imagePath = path.join(process.cwd(), '../assets/images/blog', filename);

  // Optimize with sharp
  await sharp(buffer)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toFile(imagePath);

  const stats = await fs.stat(imagePath);
  console.log(`✅ ${filename} - ${Math.round(stats.size / 1024)}KB`);
}

async function getUniqueImage(query) {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
    {
      headers: { 'Authorization': PEXELS_API_KEY }
    }
  );

  if (!response.ok) throw new Error(`Pexels API error: ${response.statusText}`);

  const data = await response.json();
  if (data.photos && data.photos.length > 0) {
    // Randomize to ensure uniqueness
    const randomIndex = Math.floor(Math.random() * Math.min(data.photos.length, 5));
    return data.photos[randomIndex].src.large;
  }

  throw new Error('No images found');
}

async function main() {
  console.log('🔄 Replacing final duplicate image...\n');

  try {
    const filename = 'authentic-african-voice-over-for-training-videos.webp';
    const query = 'e-learning video production training course online education';

    console.log(`📥 Fetching: ${filename}`);
    const imageUrl = await getUniqueImage(query);
    await downloadImage(imageUrl, filename);

    console.log('\n✅ Final duplicate replaced!');
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    process.exit(1);
  }
}

main();
