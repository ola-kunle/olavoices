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
   * ENHANCED: Multiple variations + topic-specific keywords
   */
  addQueryVariation(baseQuery) {
    // Primary style variations
    const styleVariations = [
      'professional',
      'modern',
      'authentic',
      'creative',
      'natural',
      'dynamic',
      'vibrant',
      'engaging',
      'cinematic',
      'dramatic',
      'intimate',
      'powerful',
      'contemporary',
      'atmospheric',
      'artistic'
    ];

    // Secondary context variations
    const contextVariations = [
      'close-up',
      'wide angle',
      'focused',
      'ambient lighting',
      'warm tones',
      'cool tones',
      'dramatic lighting',
      'natural light',
      'high contrast',
      'soft focus'
    ];

    // Topic-specific variations
    const topicVariations = {
      'voice': ['vocal', 'speaking', 'narrating', 'performing', 'expressing'],
      'studio': ['booth', 'workspace', 'production', 'recording space', 'facility'],
      'microphone': ['mic', 'audio equipment', 'recording gear', 'sound device'],
      'actor': ['performer', 'artist', 'talent', 'professional', 'creator']
    };

    let variedQuery = baseQuery;

    // ALWAYS add at least one style variation (100% of the time)
    const style = styleVariations[Math.floor(Math.random() * styleVariations.length)];
    variedQuery = `${style} ${variedQuery}`;

    // 70% chance: Add contextual variation
    if (Math.random() > 0.3) {
      const context = contextVariations[Math.floor(Math.random() * contextVariations.length)];
      variedQuery = `${variedQuery} ${context}`;
    }

    // 60% chance: Replace common words with synonyms for more variety
    if (Math.random() > 0.4) {
      for (const [key, synonyms] of Object.entries(topicVariations)) {
        if (variedQuery.includes(key)) {
          const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
          // Replace only first occurrence to maintain query coherence
          variedQuery = variedQuery.replace(key, synonym);
          break; // Only replace one word to avoid over-modification
        }
      }
    }

    return variedQuery;
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
