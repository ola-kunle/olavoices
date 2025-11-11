import fs from 'fs/promises';
import path from 'path';

/**
 * Updates sitemap.xml with new blog post
 */
export class SitemapUpdater {
  /**
   * Add new blog post to sitemap.xml
   */
  async addBlogPost(blogPost) {
    try {
      console.log('🗺️  Updating sitemap.xml...');

      const sitemapPath = path.join(process.cwd(), '..', 'sitemap.xml');
      let xml = await fs.readFile(sitemapPath, 'utf-8');

      // Get blog slug without .html extension
      const slug = blogPost.slug;
      const today = new Date().toISOString().split('T')[0];

      // Create sitemap entry
      const sitemapEntry = `
  <url>
    <loc>https://olavoices.com/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  `;

      // Check if blog post already exists in sitemap
      if (xml.includes(`<loc>https://olavoices.com/${slug}</loc>`)) {
        console.log('ℹ️  Blog post already in sitemap');
        return true;
      }

      // Update Blog Index lastmod
      xml = xml.replace(
        /(<url>\s*<loc>https:\/\/olavoices\.com\/blog<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/,
        `$1${today}$2`
      );

      // Find the closing </urlset> tag and insert before it
      const closingTag = '</urlset>';
      const insertPosition = xml.lastIndexOf(closingTag);

      if (insertPosition === -1) {
        throw new Error('Could not find closing </urlset> tag in sitemap.xml');
      }

      xml = xml.slice(0, insertPosition) + sitemapEntry + '\n' + xml.slice(insertPosition);

      // Write updated sitemap
      await fs.writeFile(sitemapPath, xml);
      console.log('✅ Sitemap updated');

      return true;
    } catch (error) {
      console.error('❌ Error updating sitemap:', error.message);
      return false;
    }
  }
}
