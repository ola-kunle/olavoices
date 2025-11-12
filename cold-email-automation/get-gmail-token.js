#!/usr/bin/env node

import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getRefreshToken() {
  console.log('🔐 Gmail API - Refresh Token Generator\n');

  const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env file');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ]
  });

  console.log('📋 STEP 1: Authorize this app\n');
  console.log('Visit this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('⚠️  You may see a warning "Google hasn\'t verified this app"');
  console.log('   Click "Advanced" → "Go to OlaVoices Gmail Automation (unsafe)"');
  console.log('   This is normal for personal projects!\n');

  const code = await question('📋 STEP 2: Paste the authorization code here: ');

  console.log('\n🔄 Exchanging code for refresh token...\n');

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.error('❌ Error: No refresh token received.');
      console.error('   This can happen if you\'ve authorized before.');
      console.error('   Try revoking access at: https://myaccount.google.com/permissions');
      console.error('   Then run this script again.');
      process.exit(1);
    }

    console.log('✅ Success! Refresh token obtained:\n');
    console.log(tokens.refresh_token);
    console.log('\n');

    // Update .env file
    const envPath = '.env';
    let envContent = await fs.readFile(envPath, 'utf-8');

    envContent = envContent.replace(
      /GMAIL_REFRESH_TOKEN=.*/,
      `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`
    );

    await fs.writeFile(envPath, envContent, 'utf-8');

    console.log('✅ Updated .env file with refresh token!');
    console.log('\n🎉 Gmail API setup complete!\n');
    console.log('You can now run: npm run test\n');

  } catch (error) {
    console.error('❌ Error getting refresh token:', error.message);
    process.exit(1);
  }

  rl.close();
}

getRefreshToken();
