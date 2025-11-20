import BaseScraper from './baseScraper.js';

class UpworkScraper extends BaseScraper {
  constructor(config) {
    super('Upwork', config);
  }

  extractJobs($) {
    const jobs = [];

    // Upwork uses various selectors, this is a simplified version
    // In production, this may need authentication/API access
    $('[data-test="job-tile"], .job-tile, article[data-ev-label="search_result"]').each((i, element) => {
      const $el = $(element);

      const title = this.getText($el.find('h2, h3, .job-title, [data-test="job-tile-title"]'));
      const description = this.getText($el.find('.description, .job-description, [data-test="job-description"]'));
      const budget = this.getText($el.find('.budget, [data-test="budget"]'));
      const url = $el.find('a').first().attr('href');
      const postedDate = this.getText($el.find('.posted, .date, time'));

      if (title) {
        jobs.push({
          title,
          description,
          budget,
          url,
          postedDate,
          tags: this.extractTags($el)
        });
      }
    });

    return jobs;
  }

  extractTags($element) {
    const tags = [];
    $element.find('.skill, .tag, [data-test="token"]').each((i, el) => {
      tags.push($(el).text().trim());
    });
    return tags.join(', ');
  }
}

export default UpworkScraper;
