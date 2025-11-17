import fs from 'fs/promises';
import path from 'path';

/**
 * RSS Feed Generator for Pinterest/Zapier automation
 */
export class RssFeedGenerator {
  /**
   * Generate RSS feed from blog posts
   */
  async generateFeed() {
    console.log('📡 Generating RSS feed...');

    const blogPosts = await this.extractBlogPosts();
    const rssXml = this.createRssXml(blogPosts);

    const feedPath = path.join(process.cwd(), '..', 'rss.xml');
    await fs.writeFile(feedPath, rssXml, 'utf-8');

    console.log(`✅ RSS feed created: rss.xml (${blogPosts.length} posts)`);
    return feedPath;
  }

  /**
   * Extract blog posts from blog.html
   */
  async extractBlogPosts() {
    const blogHtmlPath = path.join(process.cwd(), '..', 'blog.html');
    const html = await fs.readFile(blogHtmlPath, 'utf-8');

    const posts = [];
    // Match blog cards more flexibly
    const cardRegex = /<div class="bg-white rounded-lg shadow-md overflow-hidden blog-card">([\s\S]*?)<\/a>\s*<\/div>\s*<\/div>/g;

    let match;
    while ((match = cardRegex.exec(html)) !== null) {
      const cardHtml = match[0]; // Use full match including opening tag

      // Extract image
      const imgMatch = cardHtml.match(/src="([^"]+)"/);
      const image = imgMatch ? imgMatch[1] : '';

      // Extract image alt
      const altMatch = cardHtml.match(/alt="([^"]+)"/);
      const imageAlt = altMatch ? altMatch[1] : '';

      // Extract category
      const categoryMatch = cardHtml.match(/<span[^>]*>([^<]+)<\/span>/);
      const category = categoryMatch ? categoryMatch[1] : 'General';

      // Extract title
      const titleMatch = cardHtml.match(/<h2[^>]*>([^<]+)<\/h2>/);
      const title = titleMatch ? titleMatch[1] : '';

      // Extract date
      const dateMatch = cardHtml.match(/Published on ([^<]+)</);
      const dateStr = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Extract description
      const descMatch = cardHtml.match(/<p class="text-gray-700[^>]*>([\s\S]*?)<\/p>/);
      const description = descMatch ? descMatch[1].trim() : '';

      // Extract link
      const linkMatch = cardHtml.match(/href="([^"]+)"/);
      const link = linkMatch ? linkMatch[1] : '';

      if (title && link) {
        posts.push({
          title: this.decodeHtml(title),
          link: `https://olavoices.com/${link}`,
          description: this.decodeHtml(description),
          category: this.decodeHtml(category),
          image: image.startsWith('http') ? image : `https://olavoices.com/${image}`,
          imageAlt: this.decodeHtml(imageAlt),
          pubDate: this.parseDate(dateStr)
        });
      }
    }

    return posts.slice(0, 20); // Latest 20 posts
  }

  /**
   * Create RSS XML from blog posts
   */
  createRssXml(posts) {
    const now = new Date().toUTCString();

    const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <description><![CDATA[${post.description}]]></description>
      <category><![CDATA[${post.category}]]></category>
      <pubDate>${post.pubDate.toUTCString()}</pubDate>
      <enclosure url="${post.image}" type="image/webp" />
      <media:content url="${post.image}" medium="image" type="image/webp">
        <media:title>${post.imageAlt}</media:title>
      </media:content>
    </item>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OlaVoices Blog - Nigerian Voice Actor Insights</title>
    <link>https://olavoices.com/blog.html</link>
    <description>Professional voice-over insights, tips, and stories from an authentic Nigerian voice actor. Learn about cultural nuance, studio setup, industry trends, and hiring voice talent.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://olavoices.com/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>https://olavoices.com/assets/logo/favicon.png</url>
      <title>OlaVoices</title>
      <link>https://olavoices.com</link>
    </image>
${items}
  </channel>
</rss>`;
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateStr) {
    try {
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  }

  /**
   * Decode HTML entities
   */
  decodeHtml(text) {
    const map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&nbsp;': ' '
    };
    return text.replace(/&[^;]+;/g, m => map[m] || m);
  }
}
