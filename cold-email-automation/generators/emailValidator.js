import fetch from 'node-fetch';

class EmailValidator {
  constructor() {
    this.hunterApiKey = process.env.HUNTER_API_KEY;
  }

  async validateEmail(email) {
    if (!this.hunterApiKey) {
      console.log('⚠️  Hunter API key not found. Skipping validation.');
      return {
        valid: true,
        score: 0,
        reason: 'No API key - assuming valid'
      };
    }

    try {
      const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.hunterApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.data) {
        const result = data.data;

        return {
          valid: result.status === 'valid',
          score: result.score,
          reason: result.result,
          acceptAll: result.accept_all,
          disposable: result.disposable,
          free: result.webmail
        };
      }

      return { valid: false, reason: 'Validation failed' };
    } catch (error) {
      console.error(`❌ Error validating ${email}:`, error.message);
      return { valid: true, reason: 'Validation error - assuming valid' };
    }
  }

  async validateBatch(emails) {
    console.log(`🔍 Validating ${emails.length} emails...`);

    const results = [];

    for (const email of emails) {
      const validation = await this.validateEmail(email);
      results.push({
        email,
        ...validation
      });

      // Respect rate limits
      await this.sleep(1000); // 1 second delay between requests
    }

    const validEmails = results.filter(r => r.valid);
    console.log(`✅ ${validEmails.length}/${emails.length} emails are valid`);

    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default EmailValidator;
