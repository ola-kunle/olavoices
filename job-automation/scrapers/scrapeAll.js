import UpworkScraper from './upworkScraper.js';
import ProjectCastingScraper from './projectCastingScraper.js';
import GenericScraper from './genericScraper.js';

/**
 * Scrape all configured platforms
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} - All scraped jobs
 */
async function scrapeAllPlatforms(config) {
  const allJobs = [];
  const platforms = config.jobScraping.platforms;

  // Scrape Upwork
  if (platforms.upwork?.enabled) {
    try {
      const scraper = new UpworkScraper(platforms.upwork);
      const jobs = await scraper.scrape();
      allJobs.push(...jobs);
      await scraper.delay(3000); // Be respectful
    } catch (error) {
      console.error(`❌ Upwork scraping failed:`, error.message);
    }
  }

  // Scrape Project Casting
  if (platforms.projectCasting?.enabled) {
    try {
      const scraper = new ProjectCastingScraper(platforms.projectCasting);
      const jobs = await scraper.scrape();
      allJobs.push(...jobs);
      await scraper.delay(3000);
    } catch (error) {
      console.error(`❌ Project Casting scraping failed:`, error.message);
    }
  }

  // Scrape Voices.com (generic)
  if (platforms.voicesDotCom?.enabled) {
    try {
      const scraper = new GenericScraper('Voices.com', platforms.voicesDotCom);
      const jobs = await scraper.scrape();
      allJobs.push(...jobs);
      await scraper.delay(3000);
    } catch (error) {
      console.error(`❌ Voices.com scraping failed:`, error.message);
    }
  }

  // Scrape Voice123 (generic)
  if (platforms.voice123?.enabled) {
    try {
      const scraper = new GenericScraper('Voice123', platforms.voice123);
      const jobs = await scraper.scrape();
      allJobs.push(...jobs);
      await scraper.delay(3000);
    } catch (error) {
      console.error(`❌ Voice123 scraping failed:`, error.message);
    }
  }

  // Scrape Voquent (generic)
  if (platforms.voquent?.enabled) {
    try {
      const scraper = new GenericScraper('Voquent', platforms.voquent);
      const jobs = await scraper.scrape();
      allJobs.push(...jobs);
      await scraper.delay(3000);
    } catch (error) {
      console.error(`❌ Voquent scraping failed:`, error.message);
    }
  }

  return allJobs;
}

export default scrapeAllPlatforms;
