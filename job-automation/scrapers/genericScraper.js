import BaseScraper from './baseScraper.js';

/**
 * Generic scraper that works for multiple platforms
 * Uses common HTML patterns to extract job listings
 */
class GenericScraper extends BaseScraper {
  constructor(platformName, config) {
    super(platformName, config);
  }

  extractJobs($) {
    const jobs = [];

    // Try multiple common selectors for job listings
    const selectors = [
      'article',
      '.job',
      '.job-listing',
      '.job-post',
      '.job-card',
      '.casting-call',
      '.audition',
      '[class*="job"]',
      '[class*="casting"]'
    ];

    for (const selector of selectors) {
      const elements = $(selector);

      if (elements.length > 0) {
        console.log(`  Found ${elements.length} elements with selector: ${selector}`);

        elements.each((i, element) => {
          const $el = $(element);
          const job = this.extractJobFromElement($el, $);

          if (job && job.title) {
            jobs.push(job);
          }
        });

        // If we found jobs, don't try other selectors
        if (jobs.length > 0) break;
      }
    }

    return jobs;
  }

  extractJobFromElement($el, $) {
    // Try to find title
    const title = this.findText($el, [
      'h1', 'h2', 'h3',
      '.title', '.job-title', '.casting-title',
      '[class*="title"]'
    ]);

    if (!title) return null;

    // Try to find description
    const description = this.findText($el, [
      '.description', '.details', '.job-description',
      '.content', '.body', 'p',
      '[class*="description"]', '[class*="details"]'
    ]);

    // Try to find URL
    const url = $el.find('a').first().attr('href') || '';

    // Try to find budget/pay
    const budget = this.findText($el, [
      '.budget', '.pay', '.rate', '.compensation',
      '[class*="budget"]', '[class*="pay"]'
    ]);

    // Try to find location
    const location = this.findText($el, [
      '.location', '.place', '.where',
      '[class*="location"]'
    ]);

    // Try to find date
    const postedDate = this.findText($el, [
      '.date', '.posted', 'time',
      '[class*="date"]', '[class*="posted"]'
    ]);

    // Extract any tags/skills
    const tags = this.extractTags($el);

    return {
      title,
      description,
      budget,
      location,
      url,
      postedDate,
      tags
    };
  }

  findText($el, selectors) {
    for (const selector of selectors) {
      const element = $el.find(selector).first();
      if (element.length > 0) {
        const text = this.getText(element);
        if (text) return text;
      }
    }
    return '';
  }

  extractTags($el) {
    const tags = [];
    $el.find('.tag, .skill, .keyword, [class*="tag"], [class*="skill"]').each((i, el) => {
      const tag = $(el).text().trim();
      if (tag) tags.push(tag);
    });
    return tags.join(', ');
  }
}

export default GenericScraper;
