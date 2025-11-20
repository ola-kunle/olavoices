import fetch from 'node-fetch';

class ProposalGenerator {
  constructor(config) {
    this.config = config;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.profile = config.profile;
  }

  /**
   * Generate personalized proposal for a job
   * @param {Object} job - Job object
   * @returns {Promise<string>} - Generated proposal
   */
  async generateProposal(job) {
    if (!this.config.application.useAI || !this.geminiApiKey) {
      return this.generateTemplateProposal(job);
    }

    try {
      const prompt = this.createPrompt(job);
      const proposal = await this.callGemini(prompt);
      return proposal;
    } catch (error) {
      console.error(`⚠️  AI generation failed for "${job.title}":`, error.message);
      return this.generateTemplateProposal(job);
    }
  }

  createPrompt(job) {
    return `You are ${this.profile.name}, a professional voice actor from Nigeria with an authentic West African accent.

Job Details:
Title: ${job.title}
Description: ${job.description}
Platform: ${job.platform}
${job.budget ? `Budget: ${job.budget}` : ''}

Your Profile:
- Specialties: ${this.profile.specialties.join(', ')}
- Experience: ${this.profile.experience}
- Website: ${this.profile.website}
- Demo Reel: ${this.config.application.demoReelUrl}

Task: Write a compelling, personalized proposal (150-250 words) that:
1. Shows you read and understand their specific needs
2. Highlights relevant experience (Nigerian/African accent if mentioned)
3. Mentions 1-2 relevant past projects or skills
4. Is professional but warm and conversational
5. Includes a clear call-to-action
6. Does NOT mention rates unless they asked

Important:
- Be specific to THIS job (don't be generic)
- Sound authentic and genuine (not salesy)
- Keep it concise and scannable
- End with: "You can hear my work at ${this.profile.website}"

Write only the proposal text, no subject line or greetings like "Dear Client":`;
  }

  async callGemini(prompt) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.candidates && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text.trim();
    }

    throw new Error('No response from Gemini');
  }

  /**
   * Generate template-based proposal (fallback)
   * @param {Object} job - Job object
   * @returns {string} - Template proposal
   */
  generateTemplateProposal(job) {
    const isAfricanJob = job.matchResult?.matchedKeywords?.primary?.length > 0;

    let proposal = `Hi there,\n\n`;

    if (isAfricanJob) {
      proposal += `I noticed you're looking for ${job.matchResult.matchedKeywords.primary[0]} - that's exactly my specialty as a professional Nigerian voice actor.\n\n`;
    } else {
      proposal += `I'm interested in your "${job.title}" project.\n\n`;
    }

    proposal += `I'm ${this.profile.name}, a professional voice actor specializing in ${this.profile.specialties.slice(0, 3).join(', ')}. `;

    if (isAfricanJob) {
      proposal += `With my authentic West African accent and years of experience, I can bring the genuine, culturally authentic sound you're looking for.\n\n`;
    } else {
      proposal += `I deliver high-quality, professional voice-over from my broadcast-standard home studio.\n\n`;
    }

    proposal += `I'd love to discuss your project in more detail and share samples that match your needs.\n\n`;

    proposal += `You can hear my work at ${this.profile.website}\n\n`;

    proposal += `Looking forward to working with you!\n\n`;
    proposal += `Best regards,\n${this.profile.name}`;

    return proposal;
  }

  /**
   * Generate proposals for multiple jobs
   * @param {Array} jobs - Array of job objects
   * @returns {Promise<Array>} - Jobs with generated proposals
   */
  async generateProposals(jobs) {
    console.log(`📝 Generating proposals for ${jobs.length} jobs...`);

    const jobsWithProposals = [];

    for (const job of jobs) {
      const proposal = await this.generateProposal(job);

      jobsWithProposals.push({
        ...job,
        proposal
      });

      // Rate limiting: 1 request per second
      await this.sleep(1000);
    }

    return jobsWithProposals;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ProposalGenerator;
