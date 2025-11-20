#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import scrapeAllPlatforms from './scrapers/scrapeAll.js';
import KeywordMatcher from './filters/keywordMatcher.js';
import ProposalGenerator from './generators/proposalGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

class JobAutomation {
  constructor() {
    this.config = null;
    this.dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  }

  async run() {
    console.log('🎯 Starting Voice-Over Job Automation System');
    console.log('==========================================\n');

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No applications will be sent\n');
    }

    // Load configuration
    this.config = await this.loadConfig();

    // Initialize data directory
    await this.ensureDataDirectory();

    // Step 1: Scrape job boards
    const allJobs = await this.scrapeJobs();

    // Step 2: Filter jobs by keywords
    const matchedJobs = await this.filterJobs(allJobs);

    // Step 3: Generate proposals
    const jobsWithProposals = await this.generateProposals(matchedJobs);

    // Step 4: Save results
    await this.saveResults(allJobs, matchedJobs, jobsWithProposals);

    // Step 5: Show summary
    await this.showSummary(allJobs, matchedJobs, jobsWithProposals);

    console.log('\n✅ Automation complete!');
  }

  async loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  }

  async ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  async scrapeJobs() {
    console.log('🔍 STEP 1: Scraping job boards\n');

    const jobs = await scrapeAllPlatforms(this.config);

    console.log(`\n  Total jobs scraped: ${jobs.length}\n`);

    return jobs;
  }

  async filterJobs(jobs) {
    console.log('🎯 STEP 2: Filtering for relevant jobs\n');

    const matcher = new KeywordMatcher(this.config);
    const matchedJobs = matcher.matchJobs(jobs);

    const stats = matcher.getStats(matchedJobs);

    console.log(`  Total matched: ${stats.total}`);
    console.log(`  High confidence: ${stats.highConfidence}`);
    console.log(`  Medium confidence: ${stats.mediumConfidence}`);
    console.log(`  Low confidence: ${stats.lowConfidence}`);
    console.log(`  Average score: ${stats.averageScore.toFixed(1)}\n`);

    // Show top matches
    if (matchedJobs.length > 0) {
      console.log('  Top 5 matches:');
      matchedJobs.slice(0, 5).forEach((job, i) => {
        console.log(`  ${i + 1}. [${job.matchResult.score}] ${job.title} (${job.platform})`);
        if (job.matchResult.matchedKeywords.primary.length > 0) {
          console.log(`     Keywords: ${job.matchResult.matchedKeywords.primary.join(', ')}`);
        }
      });
      console.log('');
    }

    return matchedJobs;
  }

  async generateProposals(matchedJobs) {
    console.log('📝 STEP 3: Generating proposals\n');

    if (matchedJobs.length === 0) {
      console.log('  No matched jobs to generate proposals for.\n');
      return [];
    }

    // Limit to daily application limit
    const limit = parseInt(process.env.DAILY_APPLICATION_LIMIT) || this.config.application.dailyLimit;
    const jobsToProcess = matchedJobs.slice(0, limit);

    console.log(`  Generating proposals for top ${jobsToProcess.length} jobs...\n`);

    const generator = new ProposalGenerator(this.config);
    const jobsWithProposals = await generator.generateProposals(jobsToProcess);

    console.log(`  ✅ Generated ${jobsWithProposals.length} proposals\n`);

    return jobsWithProposals;
  }

  async saveResults(allJobs, matchedJobs, jobsWithProposals) {
    console.log('💾 STEP 4: Saving results\n');

    const timestamp = new Date().toISOString().split('T')[0];

    // Save all scraped jobs
    const allJobsFile = path.join(__dirname, 'data', `jobs-all-${timestamp}.json`);
    await fs.writeFile(allJobsFile, JSON.stringify(allJobs, null, 2), 'utf-8');
    console.log(`  Saved all jobs: ${allJobsFile}`);

    // Save matched jobs
    if (matchedJobs.length > 0) {
      const matchedJobsFile = path.join(__dirname, 'data', `jobs-matched-${timestamp}.json`);
      await fs.writeFile(matchedJobsFile, JSON.stringify(matchedJobs, null, 2), 'utf-8');
      console.log(`  Saved matched jobs: ${matchedJobsFile}`);
    }

    // Save jobs with proposals
    if (jobsWithProposals.length > 0) {
      const proposalsFile = path.join(__dirname, 'data', `proposals-${timestamp}.json`);
      await fs.writeFile(proposalsFile, JSON.stringify(jobsWithProposals, null, 2), 'utf-8');
      console.log(`  Saved proposals: ${proposalsFile}`);

      // Also save human-readable proposals
      const proposalsReadableFile = path.join(__dirname, 'data', `proposals-${timestamp}.txt`);
      const readableContent = jobsWithProposals.map((job, i) => {
        return `
==============================================
JOB ${i + 1}: ${job.title}
Platform: ${job.platform}
URL: ${job.url}
Score: ${job.matchResult.score} (${job.matchResult.confidence})
==============================================

${job.proposal}

`;
      }).join('\n');

      await fs.writeFile(proposalsReadableFile, readableContent, 'utf-8');
      console.log(`  Saved readable proposals: ${proposalsReadableFile}`);
    }

    console.log('');
  }

  async showSummary(allJobs, matchedJobs, jobsWithProposals) {
    console.log('📊 STEP 5: Summary\n');

    console.log(`  Jobs scraped: ${allJobs.length}`);
    console.log(`  Jobs matched: ${matchedJobs.length}`);
    console.log(`  Proposals generated: ${jobsWithProposals.length}`);

    if (jobsWithProposals.length > 0) {
      console.log(`\n  💡 Next steps:`);
      if (this.dryRun || this.config.application.requireManualReview) {
        console.log(`  1. Review proposals in: data/proposals-${new Date().toISOString().split('T')[0]}.txt`);
        console.log(`  2. Manually apply to jobs you're interested in`);
        console.log(`  3. Copy/paste proposals or customize as needed`);
      } else {
        console.log(`  1. Proposals ready to send (auto-apply is disabled)`);
        console.log(`  2. Enable auto-apply in config.json to automate fully`);
      }
    } else {
      console.log(`\n  ⚠️  No matching jobs found today.`);
      console.log(`  💡 Try:`);
      console.log(`  - Broadening keyword filters in config.json`);
      console.log(`  - Adding more platforms to scrape`);
      console.log(`  - Running at different times of day`);
    }

    // Platform breakdown
    const platformCounts = {};
    allJobs.forEach(job => {
      platformCounts[job.platform] = (platformCounts[job.platform] || 0) + 1;
    });

    if (Object.keys(platformCounts).length > 0) {
      console.log(`\n  Jobs by platform:`);
      Object.entries(platformCounts).forEach(([platform, count]) => {
        console.log(`    ${platform}: ${count}`);
      });
    }
  }
}

// Run the automation
const automation = new JobAutomation();
automation.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
