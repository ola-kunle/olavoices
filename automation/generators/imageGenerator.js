import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * Image Generator with Pexels (FREE)
 * Now with duplicate prevention and relevance tracking
 */
export class ImageGenerator {
  constructor() {
    this.usedImagesPath = path.join(process.cwd(), 'data', 'used-images.json');
  }

  /**
   * Load previously used image IDs
   */
  async loadUsedImages() {
    try {
      const data = await fs.readFile(this.usedImagesPath, 'utf-8');
      const parsed = JSON.parse(data);
      return new Set(parsed.usedImageIds || []);
    } catch (error) {
      // File doesn't exist yet, return empty set
      return new Set();
    }
  }

  /**
   * Save newly used image ID
   */
  async saveUsedImage(imageId) {
    const usedImages = await this.loadUsedImages();
    usedImages.add(imageId);

    const data = {
      usedImageIds: Array.from(usedImages),
      lastUpdated: new Date().toISOString()
    };

    await fs.mkdir(path.dirname(this.usedImagesPath), { recursive: true });
    await fs.writeFile(this.usedImagesPath, JSON.stringify(data, null, 2));
  }

  /**
   * Add variation to search query for more diverse results
   */
  addQueryVariation(baseQuery) {
    const variations = [
      'professional',
      'modern',
      'authentic',
      'creative',
      'natural',
      'dynamic',
      'vibrant',
      'engaging'
    ];

    // Randomly add a variation 50% of the time
    if (Math.random() > 0.5) {
      const variation = variations[Math.floor(Math.random() * variations.length)];
      return `${variation} ${baseQuery}`;
    }

    return baseQuery;
  }
  /**
   * Get image from Pexels (FREE) - with duplicate prevention
   */
  async getImage(searchQuery, altText, slug) {
    // Add variation to search query for diversity
    const variedQuery = this.addQueryVariation(searchQuery);
    console.log(`🖼️  Searching for image: "${variedQuery}"`);

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('Pexels API key not configured');

    try {
      // Load previously used images
      const usedImages = await this.loadUsedImages();
      console.log(`📊 Tracking ${usedImages.size} previously used images`);

      // Fetch more images for better variety
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(variedQuery)}&per_page=20&orientation=landscape`,
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
        // Filter out previously used images
        const availableImages = data.photos.filter(photo => !usedImages.has(photo.id));

        if (availableImages.length === 0) {
          console.log('⚠️  All fetched images were previously used, trying fallback query...');
          // Try again with original query (no variation)
          return await this.getImageFallback(searchQuery, altText, slug, usedImages);
        }

        // Randomly select from available images
        const randomIndex = Math.floor(Math.random() * Math.min(availableImages.length, 10));
        const image = availableImages[randomIndex];
        const imageUrl = image.src.large;

        console.log(`✅ Found unique image (${randomIndex + 1} of ${availableImages.length} available, ${usedImages.size} total used)`);

        // Save this image as used
        await this.saveUsedImage(image.id);

        const filename = await this.downloadAndOptimize(imageUrl, slug);

        return {
          filename,
          url: imageUrl,
          alt: altText,
          provider: 'pexels',
          imageId: image.id
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
   * Fallback method if all images from varied query were used
   */
  async getImageFallback(searchQuery, altText, slug, usedImages) {
    console.log(`🔄 Trying fallback with original query: "${searchQuery}"`);

    const apiKey = process.env.PEXELS_API_KEY;
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=30&orientation=landscape`,
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
      const availableImages = data.photos.filter(photo => !usedImages.has(photo.id));

      if (availableImages.length === 0) {
        throw new Error('All available images have been used. Consider expanding search queries.');
      }

      const randomIndex = Math.floor(Math.random() * availableImages.length);
      const image = availableImages[randomIndex];
      const imageUrl = image.src.large;

      console.log(`✅ Fallback successful: found unique image`);

      await this.saveUsedImage(image.id);

      const filename = await this.downloadAndOptimize(imageUrl, slug);

      return {
        filename,
        url: imageUrl,
        alt: altText,
        provider: 'pexels',
        imageId: image.id
      };
    }

    throw new Error('No images found in fallback');
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
