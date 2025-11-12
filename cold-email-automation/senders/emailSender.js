import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailSender {
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

  async sendEmail(lead, templateName, personalizedContent) {
    try {
      const template = await this.loadTemplate(templateName);
      const emailBody = this.personalizeTemplate(template, lead, personalizedContent);

      const subjectMatch = emailBody.match(/^Subject: (.*)$/m);
      const subject = subjectMatch ? subjectMatch[1] : 'Collaboration Opportunity';
      const body = emailBody.replace(/^Subject: .*\n\n/, '');

      const message = this.createMessage(
        process.env.FROM_EMAIL,
        lead.email,
        subject,
        body
      );

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log(`✅ Email sent to ${lead.firstName} ${lead.lastName} (${lead.email})`);

      return {
        success: true,
        messageId: response.data.id,
        sentDate: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Error sending to ${lead.email}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.txt`);
    return await fs.readFile(templatePath, 'utf-8');
  }

  personalizeTemplate(template, lead, personalizedContent = {}) {
    let personalized = template;

    // Basic personalization
    personalized = personalized.replace(/\{\{firstName\}\}/g, lead.firstName);
    personalized = personalized.replace(/\{\{lastName\}\}/g, lead.lastName);
    personalized = personalized.replace(/\{\{company\}\}/g, lead.company);
    personalized = personalized.replace(/\{\{title\}\}/g, lead.title);

    // AI-generated personalization
    if (personalizedContent.recentProject) {
      personalized = personalized.replace(
        /\{\{recentProject\}\}/g,
        personalizedContent.recentProject
      );
    } else {
      // Fallback: remove the placeholder sentence
      personalized = personalized.replace(/[^.]*\{\{recentProject\}\}[^.]*\./g, '');
    }

    return personalized;
  }

  createMessage(from, to, subject, body) {
    const email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async getDailySentCount() {
    const today = new Date().toISOString().split('T')[0];
    const sentFile = path.join(__dirname, '../data/sent.json');

    try {
      const data = await fs.readFile(sentFile, 'utf-8');
      const sentEmails = JSON.parse(data);
      return sentEmails.filter(email => email.sentDate.startsWith(today)).length;
    } catch (error) {
      return 0;
    }
  }

  async saveSentEmail(lead, result) {
    const sentFile = path.join(__dirname, '../data/sent.json');

    let sentEmails = [];
    try {
      const data = await fs.readFile(sentFile, 'utf-8');
      sentEmails = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }

    sentEmails.push({
      leadId: lead.id,
      email: lead.email,
      sentDate: result.sentDate,
      messageId: result.messageId,
      step: lead.emailSequence.step
    });

    await fs.writeFile(sentFile, JSON.stringify(sentEmails, null, 2), 'utf-8');
  }
}

export default EmailSender;
