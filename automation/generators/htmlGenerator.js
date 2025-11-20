import fs from 'fs/promises';
import path from 'path';

/**
 * HTML Generator - Creates blog post pages
 */
export class HTMLGenerator {
  /**
   * Generate complete blog post HTML page
   */
  async generateBlogPage(content, image) {
    const slug = this.createSlug(content.title);
    const publishDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(content.title)} | OlaVoices Blog</title>
    <meta name="description" content="${this.escapeHtml(content.metaDescription)}">
    <meta name="keywords" content="${content.keywords.join(', ')}">

    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZLFTKSBLMT"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-ZLFTKSBLMT');
    </script>

    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;700&display=swap" rel="stylesheet">
    <style>
        .font-ubuntu { font-family: 'Ubuntu', sans-serif; }
        .article-content h2 {
            font-size: 1.75rem;
            font-weight: bold;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: #DC3545;
        }
        .article-content h3 {
            font-size: 1.5rem;
            font-weight: bold;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
        }
        .article-content p {
            margin-bottom: 1.25rem;
            line-height: 1.75;
        }
        .article-content ul {
            margin-bottom: 1.25rem;
            padding-left: 2rem;
            list-style: disc;
        }
        .article-content li {
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body class="bg-gray-50 font-ubuntu">

<header class="bg-white shadow-md py-4">
    <div class="container mx-auto px-4 flex items-center justify-between">
        <div class="logo-container">
            <a href="index.html">
                <img src="assets/logo/favicon.png" alt="OlaVoices Logo" class="h-12">
            </a>
        </div>
        <nav>
            <ul class="flex space-x-6">
                <li><a href="index.html" class="hover:text-red-600">Home</a></li>
                <li><a href="blog.html" class="hover:text-red-600 font-bold">Blog</a></li>
                <li><a href="index.html#contact" class="hover:text-red-600">Contact</a></li>
            </ul>
        </nav>
    </div>
</header>

<article class="py-12 bg-white">
    <div class="container mx-auto px-4 max-w-4xl">
        <div class="mb-4">
            <span class="inline-block bg-${content.category.color}-100 text-${content.category.color}-600 text-sm font-semibold px-3 py-1 rounded-full">
                ${content.category.name}
            </span>
        </div>

        <h1 class="text-4xl md:text-5xl font-bold mb-4 leading-tight text-gray-900">
            ${this.escapeHtml(content.title)}
        </h1>

        <div class="flex items-center text-gray-600 mb-8 text-sm">
            <span class="mr-4">📅 ${publishDate}</span>
            <span>⏱️ ${this.estimateReadTime(content.body)} min read</span>
        </div>

        <div class="mb-8 rounded-lg overflow-hidden shadow-lg">
            <img src="assets/images/blog/${image.filename}"
                 alt="${this.escapeHtml(image.alt)}"
                 class="w-full h-auto object-cover">
        </div>

        <div class="article-content prose prose-lg max-w-none">
            ${content.body}
        </div>

        <div class="mt-12 p-8 bg-gradient-to-r from-red-600 to-red-700 rounded-lg text-white text-center">
            <h3 class="text-2xl font-bold mb-3">${content.callToAction || 'Ready to Work Together?'}</h3>
            <p class="mb-6 text-lg">
                Experience authentic Nigerian and West African voice-over excellence.
            </p>
            <a href="index.html#contact" class="inline-block bg-white text-red-600 px-8 py-3 rounded-full font-bold hover:bg-gray-100">
                Get in Touch →
            </a>
        </div>

        <div class="mt-8 text-center">
            <a href="blog.html" class="text-red-600 hover:text-red-700 font-semibold">
                ← Back to Blog
            </a>
        </div>
    </div>
</article>

<footer class="bg-gray-800 text-white py-8 mt-16">
    <div class="container mx-auto px-4 text-center">
        <p>&copy; ${new Date().getFullYear()} OlaVoices. All rights reserved.</p>
    </div>
</footer>

</body>
</html>`;

    const filename = `${slug}.html`;
    const filepath = path.join(process.cwd(), '..', filename);

    await fs.writeFile(filepath, html, 'utf-8');
    console.log(`✅ Blog page created: ${filename}`);

    return {
      filename,
      slug,
      filepath
    };
  }

  createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  estimateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
