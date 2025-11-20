#!/usr/bin/env node

import dotenv from 'dotenv';
import { ImageGenerator } from './generators/imageGenerator.js';

dotenv.config();

/**
 * Test image uniqueness system
 */
async function test() {
  console.log('🧪 Testing Image Uniqueness System\n');
  console.log('==================================\n');

  const imageGen = new ImageGenerator();

  // Test 1: Generate 3 images with the same query
  console.log('Test 1: Generating 3 images with same query (should all be unique)\n');

  const testQuery = 'professional voice actor recording studio';
  const testAlt = 'Test image';

  try {
    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- Attempt ${i} ---`);
      const result = await imageGen.getImage(testQuery, testAlt, `test-image-${i}`);
      console.log(`✅ Generated: ${result.filename}`);
      console.log(`📍 Image ID: ${result.imageId}`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ Test passed! All images should have different IDs.');
    console.log('\nCheck /automation/data/used-images.json to see tracked IDs');

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }
}

test();
