import fs from 'fs/promises';
import path from 'path';

/**
 * Updates blog.html with new blog post card
 */
export class BlogListUpdater {
  /**
   * Add new blog post to blog.html
   */
  async addBlogPost(content, image, blogPost) {
    try {
      console.log('📝 Updating blog listing page...');

      const blogHtmlPath = path.join(process.cwd(), '..', 'blog.html');
      let html = await fs.readFile(blogHtmlPath, 'utf-8');

      // Create blog card HTML
      const blogCard = this.createBlogCard(content, image, blogPost);

      // Find the blog-grid div and insert the new card at the top
      const gridStart = html.indexOf('<div class="blog-grid">');
      if (gridStart === -1) {
        throw new Error('Could not find blog-grid in blog.html');
      }

      const insertPosition = html.indexOf('\n', gridStart) + 1;
      html = html.slice(0, insertPosition) + '\n' + blogCard + '\n' + html.slice(insertPosition);

      // Write updated HTML
      await fs.writeFile(blogHtmlPath, html);
      console.log('✅ Blog listing updated');

      return true;
    } catch (error) {
      console.error('❌ Error updating blog listing:', error.message);
      return false;
    }
  }

  /**
   * Create HTML for blog card
   */
  createBlogCard(content, image, blogPost) {
    const categoryColors = {
      'Personal Story': 'red',
      'Cultural Insights': 'blue',
      'Professional Tips': 'green',
      'Industry News': 'purple',
      'Technical Guide': 'yellow'
    };

    const color = categoryColors[content.category.name] || 'gray';
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Extract first paragraph as excerpt
    const excerpt = content.metaDescription;

    return `            <!-- Auto-generated Blog Post -->
            <div class="bg-white rounded-lg shadow-md overflow-hidden blog-card">
                <img src="assets/images/blog/${image.filename}" alt="${this.escapeHtml(image.alt)}" class="w-full h-48 object-cover">
                <div class="blog-card-content p-6">
                    <div class="mb-2">
                        <span class="inline-block bg-${color}-100 text-${color}-600 text-xs font-semibold px-2 py-1 rounded-full mb-2">${this.escapeHtml(content.category.name)}</span>
                    </div>
                    <h2 class="text-xl font-bold mb-2 leading-tight">${this.escapeHtml(content.title)}</h2>
                    <p class="text-gray-500 text-sm mb-3">Published on ${date}</p>
                    <p class="text-gray-700 mb-4 blog-card-excerpt text-sm leading-relaxed">
                        ${this.escapeHtml(excerpt)}
                    </p>
                    <a href="${blogPost.filename}" class="inline-block bg-red-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-red-700 transition text-sm">Read More <i class="fas fa-arrow-right ml-2"></i></a>
                </div>
            </div>`;
  }

  /**
   * Escape HTML special characters
   */
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
