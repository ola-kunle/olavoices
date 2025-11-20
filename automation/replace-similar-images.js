import fetch from 'node-fetch';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// Replace visually similar images with HIGHLY DISTINCT queries
const replacements = [
  {
    filename: 'hire-nigerian-voice-actor-for-e-learning.webp',
    query: 'online education student laptop headphones digital learning',
    page: 2 // Use different result pages for variety
  },
  {
    filename: 'authentic-african-voice-over-for-training-videos.webp',
    query: 'corporate training presentation business meeting video conference',
    page: 1
  },
  {
    filename: 'unlock-global-reach-the-power-of-an-authentic-african-voice-for-mobile-apps.webp',
    query: 'smartphone mobile app interface touch screen technology',
    page: 3
  },
  {
    filename: 'cultural-authenticity-in-voiceover-work-a-nigerian-perspective.webp',
    query: 'african culture traditional modern blend diversity heritage',
    page: 2
  },
  {
    filename: 'mastering-accents-modulation-a-nigerian-voice-actor-s-guide.webp',
    query: 'sound wave audio spectrum music frequency vocal training',
    page: 1
  },
  {
    filename: 'mastering-documentary-narration-an-authentic-african-guide.webp',
    query: 'documentary film camera cinematography storytelling production',
    page: 2
  },
  {
    filename: 'unlock-global-learning-hire-a-nigerian-voice-actor-for-e-learning.webp',
    query: 'global communication world map international connection diversity',
    page: 1
  }
];

async function downloadImage(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  const imagePath = path.join(process.cwd(), '../assets/images/blog', filename);

  // Optimize with sharp
  await sharp(Buffer.from(buffer))
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toFile(imagePath);

  const stats = await fs.stat(imagePath);
  console.log(`✅ ${filename} - ${Math.round(stats.size / 1024)}KB`);
}

async function getDistinctImage(query, page = 1) {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`,
    {
      headers: { 'Authorization': PEXELS_API_KEY }
    }
  );

  if (!response.ok) throw new Error(`Pexels API error: ${response.statusText}`);

  const data = await response.json();
  if (data.photos && data.photos.length > 0) {
    // Pick a random one from this page
    const randomIndex = Math.floor(Math.random() * data.photos.length);
    return data.photos[randomIndex].src.large;
  }

  throw new Error('No images found');
}

async function main() {
  console.log('🔄 Replacing visually similar images with DISTINCT ones...\n');

  for (const item of replacements) {
    try {
      console.log(`📥 Fetching: ${item.filename}`);
      console.log(`🔍 Query: "${item.query}" (page ${item.page})`);
      const imageUrl = await getDistinctImage(item.query, item.page);
      await downloadImage(imageUrl, item.filename);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed: ${item.filename} - ${error.message}\n`);
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('✅ All images replaced with visually distinct ones!');
}

main();
