import BaseScraper from './baseScraper.js';

class ProjectCastingScraper extends BaseScraper {
  constructor(config) {
    super('Project Casting', config);
  }

  extractJobs($) {
    const jobs = [];

    // Project Casting job listings
    $('.casting-call, article.job, .job-listing, .casting-listing').each((i, element) => {
      const $el = $(element);

      const title = this.getText($el.find('h2, h3, .title, .casting-title'));
      const description = this.getText($el.find('.description, .details, .casting-details'));
      const location = this.getText($el.find('.location, .casting-location'));
      const url = $el.find('a').first().attr('href');
      const postedDate = this.getText($el.find('.date, .posted, time'));

      if (title && title.length > 0) {
        jobs.push({
          title,
          description,
          location,
          budget: this.extractBudget(description),
          url,
          postedDate,
          tags: ''
        });
      }
    });

    return jobs;
  }

  extractBudget(text) {
    // Try to extract budget from description
    const budgetPatterns = [
      /\$\d+(?:,\d{3})*(?:\.\d{2})?/,
      /budget:?\s*\$?\d+/i,
      /pay:?\s*\$?\d+/i
    ];

    for (const pattern of budgetPatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }

    return '';
  }
}

export default ProjectCastingScraper;
