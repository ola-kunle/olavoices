import fetch from 'node-fetch';

class AIPersonalizer {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
  }

  async personalize(lead) {
    if (!this.geminiApiKey) {
      console.log('⚠️  Gemini API key not found. Skipping AI personalization.');
      return {};
    }

    try {
      const prompt = `
You are researching a potential client for a cold email outreach.

Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Title: ${lead.title}
- Company: ${lead.company}
- Industry: ${lead.industry}

Task: Find ONE recent project or initiative this company is working on that relates to voice-over, media production, training content, or public communication.

Return ONLY the project name/description in 3-8 words. Be specific and accurate.

Examples of good responses:
- "polio vaccination campaign in Northern Nigeria"
- "Far Cry 6 diverse character casting"
- "health worker training video series"

If you cannot find a specific recent project, return: "your recent initiatives"

Response:`;

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
        const recentProject = data.candidates[0].content.parts[0].text.trim();
        return { recentProject };
      }

      return {};
    } catch (error) {
      console.error(`⚠️  AI personalization error for ${lead.company}:`, error.message);
      return {};
    }
  }

  async personalizeBatch(leads) {
    console.log(`🤖 Personalizing emails for ${leads.length} leads...`);

    const personalized = [];

    for (const lead of leads) {
      const content = await this.personalize(lead);
      personalized.push({
        lead,
        content
      });

      // Rate limit: 1 request per second
      await this.sleep(1000);
    }

    return personalized;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AIPersonalizer;
