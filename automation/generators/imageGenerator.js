import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * Image Generator with Pexels (FREE)
 */
export class ImageGenerator {
  /**
   * Get image from Pexels (FREE)
   */
  async getImage(searchQuery, altText, slug) {
    console.log(`🖼️  Searching for image: "${searchQuery}"`);

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('Pexels API key not configured');

    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`,
        {
          headers: {
            'Authorization': apiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.photos && data.photos.length > 0) {
        const image = data.photos[0]; // Use first result
        const imageUrl = image.src.large;

        console.log(`✅ Found image on Pexels`);
        const filename = await this.downloadAndOptimize(imageUrl, slug);

        return {
          filename,
          url: imageUrl,
          alt: altText,
          provider: 'pexels'
        };
      }

      throw new Error('No images found');
    } catch (error) {
      console.error(`❌ Image download failed: ${error.message}`);
      // Create placeholder
      return await this.generatePlaceholder(slug, altText);
    }
  }

  /**
   * Download and optimize image
   */
  async downloadAndOptimize(imageUrl, slug) {
    console.log('📥 Downloading image...');

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const filename = `${slug}.webp`;
    const imagePath = path.join(process.cwd(), '../assets/images/blog', filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(imagePath), { recursive: true });

    console.log('🔧 Optimizing image...');

    // Optimize with sharp
    await sharp(buffer)
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(imagePath);

    const stats = await fs.stat(imagePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`✅ Image optimized: ${sizeKB}KB`);

    return filename;
  }

  /**
   * Generate placeholder if download fails
   */
  async generatePlaceholder(slug, altText) {
    console.log('🎨 Generating placeholder...');

    const filename = `${slug}.webp`;
    const imagePath = path.join(process.cwd(), '../assets/images/blog', filename);

    await fs.mkdir(path.dirname(imagePath), { recursive: true });

    // Create red placeholder (OlaVoices brand color)
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: { r: 220, g: 53, b: 69 }
      }
    })
      .webp({ quality: 85 })
      .toFile(imagePath);

    console.log('✅ Placeholder created');
    return filename;
  }
}
