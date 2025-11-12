#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import LeadGenerator from './generators/leadGenerator.js';
import EmailValidator from './generators/emailValidator.js';
import EmailSender from './senders/emailSender.js';
import SequenceManager from './senders/sequenceManager.js';
import ResponseTracker from './senders/responseTracker.js';
import AIPersonalizer from './utils/aiPersonalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

class ColdEmailAutomation {
  constructor() {
    this.config = null;
    this.dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
  }

  async run() {
    console.log('🚀 Starting Cold Email Automation System');
    console.log('==========================================\n');

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No emails will be sent\n');
    }

    // Load configuration
    this.config = await this.loadConfig();

    // Initialize data directory
    await this.ensureDataDirectory();

    // Step 1: Check for responses first
    await this.checkResponses();

    // Step 2: Generate new leads
    await this.generateLeads();

    // Step 3: Send emails
    await this.sendEmails();

    // Step 4: Show stats
    await this.showStats();

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

    // Initialize empty files if they don't exist
    const leadsFile = path.join(dataDir, 'leads.json');
    const sentFile = path.join(dataDir, 'sent.json');

    try {
      await fs.access(leadsFile);
    } catch {
      await fs.writeFile(leadsFile, '[]', 'utf-8');
    }

    try {
      await fs.access(sentFile);
    } catch {
      await fs.writeFile(sentFile, '[]', 'utf-8');
    }
  }

  async checkResponses() {
    console.log('📬 STEP 1: Checking for responses\n');

    const responseTracker = new ResponseTracker(this.config);
    await responseTracker.initialize();

    const sequenceManager = new SequenceManager(this.config);
    const leads = await sequenceManager.loadLeads();

    const responses = await responseTracker.checkForResponses(leads);
    const bounces = await responseTracker.checkBounces(leads);

    // Mark leads as responded
    for (const response of responses) {
      await sequenceManager.markLeadAsResponded(response.leadEmail);
    }

    // Mark leads as bounced
    for (const bounce of bounces) {
      await sequenceManager.markLeadAsBounced(bounce.leadEmail);
    }

    console.log('');
  }

  async generateLeads() {
    console.log('🔍 STEP 2: Generating new leads\n');

    const leadGenerator = new LeadGenerator(this.config);
    const newLeads = await leadGenerator.generateLeads();

    if (newLeads.length > 0) {
      // Validate emails
      const validator = new EmailValidator();
      const validationResults = await validator.validateBatch(
        newLeads.map(l => l.email)
      );

      // Filter out invalid emails
      const validLeads = newLeads.filter((lead, index) => {
        const validation = validationResults[index];
        if (!validation.valid) {
          console.log(`  ⚠️  Skipping ${lead.email}: ${validation.reason}`);
          return false;
        }
        return true;
      });

      console.log(`  ✅ ${validLeads.length} valid leads ready\n`);
    } else {
      console.log('  No new leads generated (daily limit reached or API limit)\n');
    }

    console.log('');
  }

  async sendEmails() {
    console.log('📧 STEP 3: Sending emails\n');

    const sequenceManager = new SequenceManager(this.config);
    const emailSender = new EmailSender(this.config);
    const aiPersonalizer = new AIPersonalizer();

    // Check daily limit
    const sentToday = await emailSender.getDailySentCount();
    const dailyLimit = parseInt(process.env.DAILY_EMAIL_LIMIT) || this.config.emailSequence.warmupPhase.dailyLimit;
    const remainingToday = dailyLimit - sentToday;

    console.log(`  Daily limit: ${sentToday}/${dailyLimit} emails sent today`);

    if (remainingToday <= 0) {
      console.log('  ⚠️  Daily email limit reached. Skipping email sending.\n');
      return;
    }

    // Get leads to email
    const leadsToEmail = await sequenceManager.getLeadsToEmail(remainingToday);

    if (leadsToEmail.length === 0) {
      console.log('  No leads ready to email today.\n');
      return;
    }

    console.log(`  Found ${leadsToEmail.length} leads to email\n`);

    if (!this.dryRun) {
      await emailSender.initialize();
    }

    // Personalize and send
    for (const lead of leadsToEmail) {
      const currentStep = lead.emailSequence.step;
      const templateName = sequenceManager.getTemplateForLead(lead, currentStep);

      console.log(`  Preparing email for ${lead.firstName} ${lead.lastName} (${lead.company})`);
      console.log(`    Step: ${currentStep + 1}, Template: ${templateName}`);

      // AI personalization
      let personalizedContent = {};
      if (this.config.personalization.useAI && currentStep === 0) {
        personalizedContent = await aiPersonalizer.personalize(lead);
      }

      if (this.dryRun) {
        console.log(`    [DRY RUN] Would send email to ${lead.email}`);
      } else {
        const result = await emailSender.sendEmail(lead, templateName, personalizedContent);

        if (result.success) {
          await sequenceManager.updateLeadSequence(lead, currentStep, result.sentDate, result.messageId);
          await emailSender.saveSentEmail(lead, result);
        }

        // Rate limiting: 1 email per 5 seconds
        await this.sleep(5000);
      }
    }

    console.log('');
  }

  async showStats() {
    console.log('📊 STEP 4: Campaign Statistics\n');

    const sequenceManager = new SequenceManager(this.config);
    const stats = await sequenceManager.getStats();

    console.log(`  Total Leads: ${stats.total}`);
    console.log(`  New (not contacted): ${stats.new}`);
    console.log(`  In Sequence: ${stats.inSequence}`);
    console.log(`  Sequence Completed: ${stats.completed}`);
    console.log(`  ✅ Responded: ${stats.responded}`);
    console.log(`  ⚠️  Bounced: ${stats.bounced}`);

    if (stats.total > 0) {
      const responseRate = ((stats.responded / stats.total) * 100).toFixed(1);
      console.log(`  Response Rate: ${responseRate}%`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the automation
const automation = new ColdEmailAutomation();
automation.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
