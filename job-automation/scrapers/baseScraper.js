import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Base scraper class with common functionality
 */
class BaseScraper {
  constructor(platformName, config) {
    this.platformName = platformName;
    this.config = config;
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  }

  /**
   * Fetch HTML content from URL
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} - HTML content
   */
  async fetchHTML(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`❌ Error fetching ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Parse HTML with Cheerio
   * @param {string} html - HTML content
   * @returns {Object} - Cheerio object
   */
  parseHTML(html) {
    return cheerio.load(html);
  }

  /**
   * Extract job listings - must be implemented by child classes
   * @param {Object} $ - Cheerio object
   * @returns {Array} - Array of job objects
   */
  extractJobs($) {
    throw new Error('extractJobs() must be implemented by child class');
  }

  /**
   * Scrape jobs from platform
   * @returns {Promise<Array>} - Array of job objects
   */
  async scrape() {
    console.log(`🔍 Scraping ${this.platformName}...`);

    const html = await this.fetchHTML(this.config.url || this.config.searchUrl);

    if (!html) {
      console.log(`  ⚠️  Could not fetch ${this.platformName}`);
      return [];
    }

    const $ = this.parseHTML(html);
    const jobs = this.extractJobs($);

    console.log(`  ✅ Found ${jobs.length} jobs on ${this.platformName}`);

    return jobs.map(job => ({
      ...job,
      platform: this.platformName,
      scrapedAt: new Date().toISOString(),
      url: this.normalizeURL(job.url)
    }));
  }

  /**
   * Normalize job URL to absolute URL
   * @param {string} url - Relative or absolute URL
   * @returns {string} - Absolute URL
   */
  normalizeURL(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const baseUrl = this.config.url || this.config.searchUrl;
    const base = new URL(baseUrl);
    return new URL(url, base.origin).href;
  }

  /**
   * Extract text safely from element
   * @param {Object} element - Cheerio element
   * @returns {string} - Trimmed text
   */
  getText(element) {
    return element.text().trim();
  }

  /**
   * Rate limiting delay
   * @param {number} ms - Milliseconds to wait
   */
  async delay(ms = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BaseScraper;
