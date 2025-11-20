import fs from 'fs/promises';
import path from 'path';

/**
 * News HTML Generator - Creates news article pages and updates listing
 */
export class NewsHtmlGenerator {
  /**
   * Generate individual news article HTML page
   */
  async generateNewsPage(article, image) {
    const slug = this.generateSlug(article.headline);
    const filename = `news-${slug}.html`;
    const filepath = path.join(process.cwd(), '..', filename);

    // Format publication date
    const pubDate = new Date(article.source.publishedAt);
    const formattedDate = pubDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Get source tier badge
    const sourceTier = this.getSourceTierBadge(article.source.name);

    // Format article with paragraphs
    const formattedArticle = article.article
      .split('\n\n')
      .map(para => `        <p class="text-gray-700 leading-relaxed mb-4">${para.trim()}</p>`)
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.headline} | OlaVoices News</title>
    <link rel="canonical" href="https://olavoices.com/${filename}">
    <meta name="description" content="${article.metaDescription}">
    <meta name="keywords" content="${article.tags.join(', ')}, African news, ${article.category}">

    <!-- Open Graph / Social Media -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${article.headline}">
    <meta property="og:description" content="${article.metaDescription}">
    <meta property="og:image" content="https://olavoices.com/assets/images/news/${image.filename}">
    <meta property="og:url" content="https://olavoices.com/${filename}">
    <meta name="twitter:card" content="summary_large_image">

    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        .font-ubuntu { font-family: 'Ubuntu', sans-serif; }
        .news-content p { margin-bottom: 1rem; line-height: 1.8; }
        .source-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #f3f4f6;
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
        }
        .verified-badge {
            color: #10b981;
            font-weight: 600;
        }
    </style>
</head>
<body class="bg-gray-50 font-ubuntu">

<!-- Header -->
<header class="bg-white shadow-md py-4 sticky top-0 z-50">
    <div class="container mx-auto px-4 flex items-center justify-between">
        <div class="logo-container">
            <a href="index.html">
                <img src="assets/logo/favicon.png" alt="OlaVoices Logo" class="h-12">
            </a>
        </div>
        <nav>
            <ul class="flex space-x-6">
                <li><a href="index.html" class="hover:text-red-600">Home</a></li>
                <li><a href="blog.html" class="hover:text-red-600">Blog</a></li>
                <li><a href="news.html" class="hover:text-red-600 font-bold">News</a></li>
                <li><a href="index.html#contact" class="hover:text-red-600">Contact</a></li>
            </ul>
        </nav>
    </div>
</header>

<!-- Article -->
<article class="py-12 bg-white">
    <div class="container mx-auto px-4 max-w-4xl">

        <!-- Category Badge -->
        <div class="mb-4">
            <span class="inline-block bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                ${article.category}
            </span>
        </div>

        <!-- Headline -->
        <h1 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900 leading-tight">
            ${article.headline}
        </h1>

        <!-- Subheadline -->
        <p class="text-xl text-gray-600 mb-6 leading-relaxed">
            ${article.subheadline}
        </p>

        <!-- Meta Info -->
        <div class="flex flex-wrap items-center gap-4 mb-8 text-sm text-gray-600">
            <div class="source-badge">
                <i class="fas fa-newspaper"></i>
                <span>${article.source.name}</span>
                ${sourceTier}
            </div>
            <div>
                <i class="far fa-clock"></i>
                <span class="ml-2">${formattedDate}</span>
            </div>
            <div>
                <i class="far fa-eye"></i>
                <span class="ml-2">${article.readingTime} min read</span>
            </div>
        </div>

        <!-- Featured Image -->
        <figure class="mb-8">
            <img src="assets/images/news/${image.filename}"
                 alt="${image.alt}"
                 class="w-full h-auto rounded-lg shadow-lg object-cover"
                 style="max-height: 500px;">
        </figure>

        <!-- Article Content -->
        <div class="news-content prose prose-lg max-w-none">
${formattedArticle}
        </div>

        <!-- Source Link -->
        <div class="mt-8 p-6 bg-gray-100 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">
                <i class="fas fa-link"></i> <strong>Original Source:</strong>
            </p>
            <a href="${article.source.url}"
               target="_blank"
               rel="noopener noreferrer"
               class="text-red-600 hover:text-red-700 font-semibold break-all">
                ${article.source.url}
            </a>
        </div>

        <!-- Tags -->
        <div class="mt-6 flex flex-wrap gap-2">
            ${article.tags.map(tag => `<span class="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">${tag}</span>`).join('\n            ')}
        </div>

        <!-- CTA -->
        <div class="mt-12 p-8 bg-red-50 rounded-lg text-center">
            <h3 class="text-2xl font-bold mb-3 text-gray-900">Need an Authentic African Voice?</h3>
            <p class="text-gray-700 mb-6">Professional Nigerian voice-over services for your global projects.</p>
            <a href="index.html#contact" class="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition">
                Get a Free Quote
            </a>
        </div>

        <!-- Back to News -->
        <div class="mt-8 text-center">
            <a href="news.html" class="text-red-600 hover:text-red-700 font-semibold">
                <i class="fas fa-arrow-left mr-2"></i> Back to All News
            </a>
        </div>

    </div>
</article>

<!-- Footer -->
<footer class="bg-gray-900 text-white py-8">
    <div class="container mx-auto px-4 text-center">
        <p>&copy; ${new Date().getFullYear()} OlaVoices. All rights reserved.</p>
        <p class="mt-2 text-gray-400 text-sm">
            <a href="blog.html" class="hover:text-red-500">Voice-Over Blog</a> |
            <a href="news.html" class="hover:text-red-500 ml-2">African News</a>
        </p>
    </div>
</footer>

</body>
</html>`;

    await fs.writeFile(filepath, html, 'utf-8');
    console.log(`✅ News page created: ${filename}`);

    return {
      filename,
      filepath,
      slug
    };
  }

  /**
   * Generate slug from headline
   */
  generateSlug(headline) {
    return headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
  }

  /**
   * Get source tier badge HTML
   */
  getSourceTierBadge(sourceName) {
    const tier1Sources = ['BBC', 'Reuters', 'Al Jazeera', 'CNN', 'AFP', 'Bloomberg'];
    const isTier1 = tier1Sources.some(source =>
      sourceName?.toLowerCase().includes(source.toLowerCase())
    );

    if (isTier1) {
      return '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>';
    }

    return '';
  }

  /**
   * Update news.html listing page with new article
   */
  async addToNewsListing(article, image, newsPage) {
    const newsListingPath = path.join(process.cwd(), '..', 'news.html');

    try {
      // Try to read existing news.html
      let html = await fs.readFile(newsListingPath, 'utf-8');

      // Find the insertion point (after opening <div class="news-grid">)
      const insertionMarker = '<div class="news-grid">';
      const insertionIndex = html.indexOf(insertionMarker);

      if (insertionIndex === -1) {
        throw new Error('Could not find news grid insertion point');
      }

      const insertionPoint = insertionIndex + insertionMarker.length;

      // Create news card HTML
      const newsCard = this.generateNewsCard(article, image, newsPage);

      // Insert the card
      html = html.slice(0, insertionPoint) + '\n\n' + newsCard + html.slice(insertionPoint);

      await fs.writeFile(newsListingPath, html, 'utf-8');
      console.log(`✅ Added to news.html listing`);

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  news.html does not exist yet, will create it');
        // Will be created in the next step
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate news card HTML for listing page
   */
  generateNewsCard(article, image, newsPage) {
    const pubDate = new Date(article.source.publishedAt);
    const timeAgo = this.getTimeAgo(pubDate);
    const isRecent = (Date.now() - pubDate.getTime()) < 24 * 60 * 60 * 1000; // Less than 24 hours

    return `            <!-- News Article -->
            <div class="bg-white rounded-lg shadow-md overflow-hidden news-card" data-category="${article.category}">
                ${isRecent ? '<div class="bg-red-600 text-white text-xs font-bold px-3 py-1 uppercase">Breaking</div>' : ''}
                <img src="assets/images/news/${image.filename}" alt="${image.alt}" class="w-full h-48 object-cover">
                <div class="p-6">
                    <div class="mb-2 flex items-center gap-2">
                        <span class="inline-block bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded-full">${article.category}</span>
                        <span class="text-xs text-gray-500"><i class="fas fa-clock"></i> ${timeAgo}</span>
                    </div>
                    <h2 class="text-xl font-bold mb-2 leading-tight hover:text-red-600 transition">
                        <a href="${newsPage.filename}">${article.headline}</a>
                    </h2>
                    <p class="text-gray-700 mb-3 text-sm leading-relaxed">
                        ${article.excerpt}
                    </p>
                    <div class="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span><i class="fas fa-newspaper"></i> ${article.source.name}</span>
                        <span><i class="far fa-eye"></i> ${article.readingTime} min</span>
                    </div>
                    <a href="${newsPage.filename}" class="inline-block bg-red-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-700 transition text-sm">
                        Read Full Story <i class="fas fa-arrow-right ml-2"></i>
                    </a>
                </div>
            </div>`;
  }

  /**
   * Calculate "time ago" string
   */
  getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
