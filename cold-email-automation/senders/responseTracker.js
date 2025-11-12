import { google } from 'googleapis';

class ResponseTracker {
  constructor(config) {
    this.config = config;
    this.gmail = null;
  }

  async initialize() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async checkForResponses(leads) {
    console.log('📬 Checking for email responses...');

    const responses = [];

    // Get emails from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateQuery = `after:${Math.floor(sevenDaysAgo.getTime() / 1000)}`;

    try {
      // Search for emails in inbox (replies)
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `in:inbox ${dateQuery} -from:me`,
        maxResults: 50
      });

      if (response.data.messages) {
        for (const message of response.data.messages) {
          const email = await this.getEmailDetails(message.id);

          // Check if email is from any of our leads
          const lead = leads.find(l =>
            email.from.toLowerCase().includes(l.email.toLowerCase())
          );

          if (lead) {
            responses.push({
              leadEmail: lead.email,
              leadName: `${lead.firstName} ${lead.lastName}`,
              company: lead.company,
              subject: email.subject,
              snippet: email.snippet,
              date: email.date,
              messageId: email.messageId
            });
          }
        }
      }

      if (responses.length > 0) {
        console.log(`🎉 Found ${responses.length} response(s)!`);
        for (const response of responses) {
          console.log(`  - ${response.leadName} (${response.company}): "${response.snippet}"`);
        }
      } else {
        console.log('  No responses found.');
      }

    } catch (error) {
      console.error('❌ Error checking responses:', error.message);
    }

    return responses;
  }

  async getEmailDetails(messageId) {
    const message = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });

    const headers = message.data.payload.headers;
    const from = headers.find(h => h.name === 'From')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';

    return {
      messageId: message.data.id,
      from,
      subject,
      snippet: message.data.snippet,
      date
    };
  }

  async checkBounces(leads) {
    console.log('📧 Checking for bounced emails...');

    const bounces = [];

    try {
      // Search for bounce notifications
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'from:mailer-daemon OR from:postmaster OR subject:("delivery failure" OR "undeliverable" OR "bounced")',
        maxResults: 50
      });

      if (response.data.messages) {
        for (const message of response.data.messages) {
          const email = await this.getEmailDetails(message.id);

          // Check if bounce is for any of our leads
          const lead = leads.find(l =>
            email.snippet.toLowerCase().includes(l.email.toLowerCase())
          );

          if (lead) {
            bounces.push({
              leadEmail: lead.email,
              leadName: `${lead.firstName} ${lead.lastName}`,
              reason: email.snippet
            });
          }
        }
      }

      if (bounces.length > 0) {
        console.log(`⚠️  Found ${bounces.length} bounced email(s)`);
      }

    } catch (error) {
      console.error('❌ Error checking bounces:', error.message);
    }

    return bounces;
  }
}

export default ResponseTracker;
