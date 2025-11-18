#!/usr/bin/env node

import dotenv from 'dotenv';
import { ContentGenerator } from './generators/contentGenerator.js';
import { ImageGenerator } from './generators/imageGenerator.js';
import { HTMLGenerator } from './generators/htmlGenerator.js';
import { GitAutomation } from './utils/gitAutomation.js';
import { BlogListUpdater } from './utils/blogListUpdater.js';
import { SitemapUpdater } from './utils/sitemapUpdater.js';
import { RssFeedGenerator } from './utils/rssFeedGenerator.js';
import { PinterestPoster } from './utils/pinterestPoster.js';

// Load environment variables
dotenv.config();

// Check if Git automation is enabled
const AUTO_COMMIT = process.env.AUTO_COMMIT !== 'false';

/**
 * Complete Blog Automation
 */
async function main() {
  console.clear();
  console.log('🤖 OlaVoices Blog Automation System');
  console.log('=====================================\n');

  const startTime = Date.now();

  try {
    // Step 1: Generate Content
    console.log('📝 Step 1: Generating blog content...\n');
    const contentGen = new ContentGenerator();
    const content = await contentGen.generateBlogPost();
    console.log(`\n✅ Generated: "${content.title}"\n`);

    // Step 2: Download Image
    console.log('🖼️  Step 2: Finding and optimizing image...\n');
    const imageGen = new ImageGenerator();
    const slug = content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const image = await imageGen.getImage(content.imageSearchQuery, content.imageAltText, slug);
    console.log('');

    // Step 3: Generate HTML
    console.log('🏗️  Step 3: Creating blog page...\n');
    const htmlGen = new HTMLGenerator();
    const blogPost = await htmlGen.generateBlogPage(content, image);
    console.log('');

    // Step 3.5: Update blog listing
    console.log('📋 Step 3.5: Updating blog listing...\n');
    const blogUpdater = new BlogListUpdater();
    await blogUpdater.addBlogPost(content, image, blogPost);
    console.log('');

    // Step 3.6: Update sitemap
    console.log('🗺️  Step 3.6: Updating sitemap...\n');
    const sitemapUpdater = new SitemapUpdater();
    await sitemapUpdater.addBlogPost(blogPost);
    console.log('');

    // Step 3.7: Update RSS feed
    console.log('📡 Step 3.7: Updating RSS feed...\n');
    const rssFeedGenerator = new RssFeedGenerator();
    await rssFeedGenerator.generateFeed();
    console.log('');

    // Step 3.8: Post to Pinterest (automatic!)
    console.log('📌 Step 3.8: Posting to Pinterest...\n');
    const pinterestPoster = new PinterestPoster();
    await pinterestPoster.createPin(content, image, blogPost);
    console.log('');

    // Step 4: Git Automation (if enabled)
    if (AUTO_COMMIT) {
      console.log('🚀 Step 4: Committing to Git and pushing...\n');
      const git = new GitAutomation();
      const files = [
        blogPost.filename,
        `assets/images/blog/${image.filename}`,
        'blog.html',
        'sitemap.xml',
        'rss.xml'
      ];
      await git.commitAndPush(content.title, files);
      console.log('');
    }

    // Success!
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('🎉 SUCCESS! Blog post published!\n');
    console.log('📊 Summary:');
    console.log(`   - Title: ${content.title}`);
    console.log(`   - Category: ${content.category.name}`);
    console.log(`   - Words: ~${content.body.split(/\s+/).length}`);
    console.log(`   - Image: ${image.filename}`);
    console.log(`   - File: ${blogPost.filename}`);
    console.log(`   - Time: ${duration}s`);
    console.log(`   - Cost: $0.00 💰`);
    if (AUTO_COMMIT) {
      console.log(`   - Status: Pushed to GitHub → Netlify deploying! 🚀`);
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n📜 Stack:', error.stack);
    process.exit(1);
  }
}

// Run
main();
