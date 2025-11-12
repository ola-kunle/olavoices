import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SequenceManager {
  constructor(config) {
    this.config = config;
    this.leadsFile = path.join(__dirname, '../data/leads.json');
  }

  async getLeadsToEmail(dailyLimit) {
    const leads = await this.loadLeads();
    const leadsToEmail = [];

    for (const lead of leads) {
      if (leadsToEmail.length >= dailyLimit) {
        break;
      }

      // Skip if already responded or bounced
      if (lead.emailSequence.responded || lead.emailSequence.bounced) {
        continue;
      }

      const shouldEmail = await this.shouldEmailLead(lead);
      if (shouldEmail) {
        leadsToEmail.push(lead);
      }
    }

    return leadsToEmail;
  }

  async shouldEmailLead(lead) {
    const sequence = this.config.emailSequence.sequence;
    const currentStep = lead.emailSequence.step;

    // Check if sequence is complete
    if (currentStep >= sequence.length) {
      return false;
    }

    // If never emailed, send step 1
    if (currentStep === 0) {
      return true;
    }

    // Check if enough days have passed for next step
    const lastEmailDate = new Date(lead.emailSequence.lastEmailDate);
    const daysSinceLastEmail = this.getDaysDifference(lastEmailDate, new Date());

    const nextStep = sequence[currentStep];
    const requiredDelay = nextStep.delayDays;

    return daysSinceLastEmail >= requiredDelay;
  }

  async updateLeadSequence(lead, step, sentDate, messageId) {
    const leads = await this.loadLeads();

    const leadIndex = leads.findIndex(l => l.id === lead.id);
    if (leadIndex !== -1) {
      leads[leadIndex].emailSequence.step = step + 1;
      leads[leadIndex].emailSequence.lastEmailDate = sentDate;
      leads[leadIndex].emailSequence.lastMessageId = messageId;

      await this.saveLeads(leads);
    }
  }

  async markLeadAsResponded(leadEmail) {
    const leads = await this.loadLeads();

    const leadIndex = leads.findIndex(l => l.email === leadEmail);
    if (leadIndex !== -1) {
      leads[leadIndex].emailSequence.responded = true;
      leads[leadIndex].status = 'responded';
      await this.saveLeads(leads);

      console.log(`🎉 Lead ${leadEmail} has responded! Stopping sequence.`);
    }
  }

  async markLeadAsBounced(leadEmail) {
    const leads = await this.loadLeads();

    const leadIndex = leads.findIndex(l => l.email === leadEmail);
    if (leadIndex !== -1) {
      leads[leadIndex].emailSequence.bounced = true;
      leads[leadIndex].status = 'bounced';
      await this.saveLeads(leads);
    }
  }

  getTemplateForLead(lead, step) {
    const sequence = this.config.emailSequence.sequence[step];
    const industry = lead.industry;

    if (industry === 'ngos') {
      return sequence.templateNGO;
    } else if (industry === 'gaming') {
      return sequence.templateGaming;
    }

    return sequence.templateNGO; // Default
  }

  getDaysDifference(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  async loadLeads() {
    try {
      const data = await fs.readFile(this.leadsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveLeads(leads) {
    await fs.writeFile(
      this.leadsFile,
      JSON.stringify(leads, null, 2),
      'utf-8'
    );
  }

  async getStats() {
    const leads = await this.loadLeads();

    return {
      total: leads.length,
      new: leads.filter(l => l.emailSequence.step === 0).length,
      inSequence: leads.filter(l => l.emailSequence.step > 0 && l.emailSequence.step < 3).length,
      completed: leads.filter(l => l.emailSequence.step >= 3).length,
      responded: leads.filter(l => l.emailSequence.responded).length,
      bounced: leads.filter(l => l.emailSequence.bounced).length
    };
  }
}

export default SequenceManager;
