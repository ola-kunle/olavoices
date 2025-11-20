#!/usr/bin/env node

import dotenv from 'dotenv';
import { NewsAggregator } from './generators/newsAggregator.js';
import { NewsContentGenerator } from './generators/newsContentGenerator.js';
import { ImageGenerator } from './generators/imageGenerator.js';
import { NewsHtmlGenerator } from './generators/newsHtmlGenerator.js';
import { GitAutomation } from './utils/gitAutomation.js';
import { SitemapUpdater } from './utils/sitemapUpdater.js';
import { RssFeedGenerator } from './utils/rssFeedGenerator.js';

// Load environment variables
dotenv.config();

// Check if Git automation is enabled
const AUTO_COMMIT = process.env.AUTO_COMMIT !== 'false';

/**
 * Complete News Automation
 */
async function main() {
  console.clear();
  console.log('📰 OlaVoices News Automation System');
  console.log('=====================================\n');

  const startTime = Date.now();

  try {
    // Step 1: Find Compelling News
    console.log('🔍 Step 1: Finding compelling African news stories...\n');
    const newsAggregator = new NewsAggregator();
    const compellingStories = await newsAggregator.findCompellingNews(3); // Target 3 stories

    if (compellingStories.length === 0) {
      console.log('\n⚠️  No compelling news stories found at this time.');
      console.log('💡 This is normal - we only publish when news is emotionally engaging.');
      console.log('🔄 Will try again in the next scheduled run.\n');
      process.exit(0);
    }

    console.log(`\n✅ Found ${compellingStories.length} compelling stories to publish!\n`);

    const publishedArticles = [];

    // Step 2-5: Process each story
    for (let i = 0; i < compellingStories.length; i++) {
      const story = compellingStories[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Processing Story ${i + 1}/${compellingStories.length}`);
      console.log(`${'='.repeat(60)}\n`);

      // Step 2: Generate Article Content
      console.log('📝 Step 2: Generating article content...\n');
      const contentGen = new NewsContentGenerator();
      const article = await contentGen.generateNewsArticle(story);
      console.log(`✅ Article: "${article.headline}"\n`);

      // Step 3: Get Image
      console.log('🖼️  Step 3: Finding and optimizing image...\n');
      const imageGen = new ImageGenerator();
      const imageQuery = contentGen.generateImageQuery(article);
      const slug = contentGen.generateSlug(article.headline);

      // Use news subdirectory for images
      const image = await imageGen.getImage(imageQuery, article.headline, slug);

      // Move image to news subdirectory
      await moveImageToNewsFolder(image.filename);
      console.log('');

      // Step 4: Generate HTML
      console.log('🏗️  Step 4: Creating news page...\n');
      const htmlGen = new NewsHtmlGenerator();
      const newsPage = await htmlGen.generateNewsPage(article, image);
      console.log('');

      // Step 5: Update News Listing
      console.log('📋 Step 5: Updating news.html listing...\n');
      await htmlGen.addToNewsListing(article, image, newsPage);
      console.log('');

      publishedArticles.push({
        article,
        image,
        newsPage
      });
    }

    // Step 6: Update Sitemap
    console.log('🗺️  Step 6: Updating sitemap...\n');
    const sitemapUpdater = new SitemapUpdater();
    for (const { newsPage } of publishedArticles) {
      await sitemapUpdater.addBlogPost(newsPage); // Reuse existing sitemap updater
    }
    console.log('');

    // Step 7: Update RSS Feed
    console.log('📡 Step 7: Updating RSS feed...\n');
    const rssFeedGenerator = new RssFeedGenerator();
    await rssFeedGenerator.generateFeed();
    console.log('');

    // Step 8: Git Automation (if enabled)
    if (AUTO_COMMIT) {
      console.log('🚀 Step 8: Committing to Git and pushing...\n');
      const git = new GitAutomation();

      const files = [
        'news.html',
        'sitemap.xml',
        'rss.xml',
        ...publishedArticles.map(({ newsPage }) => newsPage.filename),
        ...publishedArticles.map(({ image }) => `assets/images/news/${image.filename}`)
      ];

      const commitMessage = publishedArticles.length === 1
        ? publishedArticles[0].article.headline
        : `${publishedArticles.length} breaking African news stories`;

      await git.commitAndPush(commitMessage, files);
      console.log('');
    }

    // Success!
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('🎉 SUCCESS! News articles published!\n');
    console.log('📊 Summary:');
    publishedArticles.forEach(({ article }, i) => {
      console.log(`\n   Story ${i + 1}:`);
      console.log(`   - Headline: ${article.headline}`);
      console.log(`   - Category: ${article.category}`);
      console.log(`   - Source: ${article.source.name}`);
      console.log(`   - Appeal Score: ${article.appealScore}/10`);
    });
    console.log(`\n   - Total Time: ${duration}s`);
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

/**
 * Move image from blog to news subdirectory
 */
async function moveImageToNewsFolder(filename) {
  const fs = await import('fs/promises');
  const path = await import('path');

  const blogImagePath = path.join(process.cwd(), '../assets/images/blog', filename);
  const newsImagePath = path.join(process.cwd(), '../assets/images/news', filename);

  // Ensure news directory exists
  await fs.mkdir(path.dirname(newsImagePath), { recursive: true });

  // Move the file
  try {
    await fs.rename(blogImagePath, newsImagePath);
    console.log(`   📁 Moved to news folder`);
  } catch (error) {
    // If file doesn't exist in blog folder, it might already be in news folder
    console.log(`   📁 Image in news folder`);
  }
}

// Run
main();
