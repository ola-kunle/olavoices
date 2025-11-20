import fetch from 'node-fetch';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// Images to replace with unique search queries
const replacements = [
  {
    filename: 'mastering-accents-modulation-a-nigerian-voice-actor-s-guide.webp',
    query: 'voice actor studio microphone headphones accent training'
  },
  {
    filename: 'mastering-documentary-narration-an-authentic-african-guide.webp',
    query: 'documentary narrator recording booth professional audio'
  },
  {
    filename: 'riding-the-wave-commercial-voiceover-trends-authentic-african-voices.webp',
    query: 'commercial voice recording professional studio broadcast'
  },
  {
    filename: 'your-authentic-voice-why-cultural-nuance-is-key-in-global-voiceover.webp',
    query: 'cultural diversity voice acting multicultural communication'
  },
  {
    filename: 'unlocking-podcast-power-authentic-west-african-voices.webp',
    query: 'podcast recording microphone host broadcasting studio'
  },
  {
    filename: 'unlock-global-reach-the-power-of-an-authentic-african-voice-for-mobile-apps.webp',
    query: 'mobile app voice user interface technology communication'
  }
];

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
  console.log('🔄 Replacing duplicate blog images with unique ones...\n');

  for (const item of replacements) {
    try {
      console.log(`📥 Fetching: ${item.filename}`);
      const imageUrl = await getUniqueImage(item.query);
      await downloadImage(imageUrl, item.filename);
    } catch (error) {
      console.error(`❌ Failed: ${item.filename} - ${error.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ All duplicate images replaced!');
}

main();
