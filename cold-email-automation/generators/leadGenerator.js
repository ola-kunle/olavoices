import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LeadGenerator {
  constructor(config) {
    this.config = config;
    this.apolloApiKey = process.env.APOLLO_API_KEY;
    this.leadsFile = path.join(__dirname, '../data/leads.json');
  }

  async generateLeads() {
    console.log('🔍 Starting lead generation...');

    const existingLeads = await this.loadExistingLeads();
    const newLeads = [];

    const dailyLimit = this.config.leadGeneration.dailyLimit;
    const leadsPerIndustry = Math.ceil(dailyLimit / 2); // Split between NGO and Gaming

    // Generate NGO leads
    if (this.config.targetProfiles.ngos.enabled) {
      console.log('🏥 Searching for NGO leads...');
      const ngoLeads = await this.searchApollo('ngos', leadsPerIndustry);
      newLeads.push(...ngoLeads);
    }

    // Generate Gaming leads
    if (this.config.targetProfiles.gaming.enabled) {
      console.log('🎮 Searching for Gaming leads...');
      const gamingLeads = await this.searchApollo('gaming', leadsPerIndustry);
      newLeads.push(...gamingLeads);
    }

    // Filter quality leads
    const qualityLeads = await this.filterQualityLeads(newLeads, existingLeads);

    // Save leads
    await this.saveLeads([...existingLeads, ...qualityLeads]);

    console.log(`✅ Generated ${qualityLeads.length} quality leads`);
    return qualityLeads;
  }

  async searchApollo(industry, limit) {
    if (!this.apolloApiKey) {
      console.log('⚠️  Apollo API key not found. Using manual mode.');
      return [];
    }

    const profile = this.config.targetProfiles[industry];
    const leads = [];

    try {
      // Apollo.io People Search API
      const searchParams = {
        api_key: this.apolloApiKey,
        person_titles: profile.jobTitles,
        person_seniorities: ['director', 'vp', 'c_suite', 'manager'],
        organization_num_employees_ranges: [`${profile.minimumEmployees}+`],
        per_page: limit,
        page: 1
      };

      // Add location filters for NGOs
      if (industry === 'ngos') {
        searchParams.person_locations = profile.locationFilters;
        searchParams.organization_industry_tag_ids = ['5567cd4773696439b10b0000']; // Non-profit
      }

      // Add industry filters for Gaming
      if (industry === 'gaming') {
        searchParams.organization_industry_tag_ids = ['5567cd4773696439b1180000']; // Computer Games
      }

      const response = await fetch('https://api.apollo.io/v1/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(searchParams)
      });

      const data = await response.json();

      if (data.contacts && data.contacts.length > 0) {
        for (const person of data.contacts) {
          if (this.meetsQualityCriteria(person, profile)) {
            leads.push({
              id: person.id || this.generateId(),
              firstName: person.first_name,
              lastName: person.last_name,
              email: person.email,
              company: person.organization?.name || 'Unknown',
              title: person.title,
              industry: industry,
              location: person.city || person.country,
              companySize: person.organization?.estimated_num_employees,
              linkedIn: person.linkedin_url,
              source: 'apollo',
              addedDate: new Date().toISOString(),
              status: 'new',
              emailSequence: {
                step: 0,
                lastEmailDate: null,
                responded: false,
                bounced: false
              }
            });
          }
        }
      }

      console.log(`  Found ${leads.length} ${industry} leads from Apollo`);
    } catch (error) {
      console.error(`❌ Error searching Apollo for ${industry}:`, error.message);
    }

    return leads;
  }

  meetsQualityCriteria(person, profile) {
    // Check if person has email
    if (!person.email || person.email === '') {
      return false;
    }

    // Check job title contains relevant keywords
    const title = (person.title || '').toLowerCase();
    const hasRelevantTitle = profile.jobTitles.some(jobTitle =>
      title.includes(jobTitle.toLowerCase().split(' ')[0])
    );

    if (!hasRelevantTitle) {
      return false;
    }

    // Exclude junior/assistant roles
    const excludeKeywords = this.config.leadGeneration.qualityFilters.excludeKeywords;
    const hasExcludedKeyword = excludeKeywords.some(keyword =>
      title.includes(keyword)
    );

    if (hasExcludedKeyword) {
      return false;
    }

    // Check company size
    const companySize = person.organization?.estimated_num_employees || 0;
    if (companySize < profile.minimumEmployees) {
      return false;
    }

    return true;
  }

  async filterQualityLeads(newLeads, existingLeads) {
    const existingEmails = new Set(existingLeads.map(lead => lead.email));

    // Remove duplicates
    const uniqueLeads = newLeads.filter(lead => !existingEmails.has(lead.email));

    console.log(`  Filtered out ${newLeads.length - uniqueLeads.length} duplicate leads`);

    return uniqueLeads;
  }

  async loadExistingLeads() {
    try {
      const data = await fs.readFile(this.leadsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
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

  generateId() {
    return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Manual lead import from CSV
  async importManualLeads(csvPath) {
    console.log('📥 Importing manual leads from CSV...');
    // This would parse CSV and add to leads.json
    // Implementation can be added later if needed
  }
}

export default LeadGenerator;
