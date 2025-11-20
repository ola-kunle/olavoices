import fetch from 'node-fetch';
import Groq from 'groq-sdk';

/**
 * News Aggregator - Finds emotionally compelling African news
 * Sources: 30+ credible outlets via NewsAPI
 */
export class NewsAggregator {
  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Fetch global voice-over industry news
   */
  async fetchVoiceOverNews() {
    if (!this.newsApiKey) {
      console.log('⚠️  NewsAPI key not configured, using fallback method...');
      return await this.fetchFromGoogleNewsRSS();
    }

    try {
      console.log('📰 Fetching global voice-over industry news from NewsAPI...');

      // Target voice-over industry specifically
      const queries = [
        '"voice actor" OR "voice-over" OR "voice acting" OR voiceover',
        'audiobook OR "audio book" OR narration OR narrator',
        'podcast OR podcasting OR "podcast production"',
        'dubbing OR "voice dubbing" OR localization',
        '"AI voice" OR "voice technology" OR "voice synthesis"',
        'Nollywood OR "Nigerian film" OR "African cinema"',
        '"e-learning" OR "online education" OR "educational video"'
      ];

      let allArticles = [];

      // Fetch from multiple queries for variety
      for (const query of queries) {
        const response = await fetch(
          `https://newsapi.org/v2/everything?` +
          `q=${encodeURIComponent(query)}&` +
          `language=en&` +
          `sortBy=publishedAt&` +
          `pageSize=15&` +
          `from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`,
          {
            headers: { 'X-Api-Key': this.newsApiKey }
          }
        );

        if (!response.ok) {
          console.error(`NewsAPI error: ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
          allArticles.push(...data.articles);
        }

        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Remove duplicates by URL
      const uniqueArticles = Array.from(
        new Map(allArticles.map(article => [article.url, article])).values()
      );

      console.log(`✅ Found ${uniqueArticles.length} unique voice-over industry articles`);
      return uniqueArticles.slice(0, 50); // Return top 50 for better filtering

    } catch (error) {
      console.error(`❌ NewsAPI fetch failed: ${error.message}`);
      return await this.fetchFromGoogleNewsRSS();
    }
  }

  /**
   * Fallback: Fetch from Google News RSS (free, no API key needed)
   */
  async fetchFromGoogleNewsRSS() {
    console.log('📰 Fetching from Google News RSS (fallback)...');

    // For now, return empty array - will implement RSS parsing if needed
    // This requires xml2js or similar parser
    console.log('⚠️  RSS fallback not yet implemented. Please add NEWS_API_KEY to .env');
    return [];
  }

  /**
   * AI evaluates if news is DIRECTLY about voice-over/voice acting industry
   * STRICT FILTER - No forced connections allowed
   */
  async evaluateNewsAppeal(article) {
    try {
      const prompt = `You are a news editor for OlaVoices, a Nigerian voice-over artist's professional website.

STORY:
Title: ${article.title}
Description: ${article.description || 'N/A'}
Source: ${article.source?.name || 'Unknown'}
Published: ${article.publishedAt}

STRICT EVALUATION CRITERIA:

✅ ONLY ACCEPT if story is DIRECTLY about one of these:
1. Voice acting industry itself (voice actors, voice-over work, dubbing studios)
2. Nollywood/African film PRODUCTION news (new movies being made, casting, production announcements)
3. Audiobook or podcast industry growth in Africa
4. E-learning platform launches or education tech developments
5. AI voice technology developments affecting voice actors
6. Recording equipment, studio technology, or audio production tools
7. Content creation platforms hiring voice talent

❌ REJECT ALL of these (no matter how you try to connect them):
- Celebrity news (unless they're hiring voice actors)
- Generic entertainment news (concerts, awards shows, etc.)
- Politics, social issues, general news (NO forced connections)
- Sports, business, culture news (unless directly about voice-over work)
- Any story requiring mental gymnastics to connect to voice-over

BE BRUTALLY HONEST:
- If the story doesn't mention voice-over, dubbing, narration, or audio production → REJECT
- If you have to stretch to make a connection → REJECT
- If it's not something a voice actor would care about professionally → REJECT

Rate from 1-10 on DIRECT voice-over industry relevance.

Respond in JSON format:
{
  "score": 9,
  "reasoning": "This is directly about Nollywood studios hiring voice actors for new film dubbing project",
  "isDirect": true,
  "shouldPublish": true
}

Score 8+ AND isDirect=true = publish. Otherwise skip.
Most stories will be rejected. That's good - authenticity over quantity.`;

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a news editor with excellent judgment for emotionally compelling stories. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const responseText = completion.choices[0].message.content.trim();

      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('⚠️  Could not parse AI evaluation, skipping article');
        return null;
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      console.log(`   Score: ${evaluation.score}/10 - ${evaluation.reasoning}`);

      return evaluation.shouldPublish ? evaluation : null;

    } catch (error) {
      console.error(`❌ Evaluation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Find the best news stories to publish (up to 3)
   */
  async findCompellingNews(targetCount = 3) {
    console.log(`\n🔍 Searching for ${targetCount} compelling voice-over industry stories...\n`);

    const articles = await this.fetchVoiceOverNews();

    if (articles.length === 0) {
      console.log('❌ No articles found from news sources');
      return [];
    }

    const compellingStories = [];

    // Evaluate articles until we find enough compelling ones
    for (const article of articles) {
      if (compellingStories.length >= targetCount) break;

      console.log(`\n📄 Evaluating: "${article.title}"`);
      console.log(`   Source: ${article.source?.name || 'Unknown'}`);

      const evaluation = await this.evaluateNewsAppeal(article);

      if (evaluation && evaluation.shouldPublish) {
        compellingStories.push({
          ...article,
          appealScore: evaluation.score,
          appealReason: evaluation.reasoning
        });
        console.log(`   ✅ SELECTED for publication!`);
      } else {
        console.log(`   ❌ Skipped (not compelling enough)`);
      }

      // Small delay between evaluations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Found ${compellingStories.length} compelling stories out of ${articles.length} evaluated\n`);

    return compellingStories;
  }

  /**
   * Get categorized source info for display
   */
  getSourceTier(sourceName) {
    const tiers = {
      tier1: ['BBC', 'Reuters', 'Al Jazeera', 'CNN', 'AFP', 'Associated Press', 'Bloomberg'],
      tier2: ['Premium Times', 'Guardian', 'Punch', 'Vanguard', 'Daily Nation', 'Mail & Guardian'],
      tier3: ['TechCabal', 'Quartz', 'Disrupt Africa', 'Business Day', 'Ventureburn'],
      tier4: ['Pulse', 'BellaNaija', 'Notjustok', '360Nobs']
    };

    for (const [tier, sources] of Object.entries(tiers)) {
      if (sources.some(source => sourceName?.toLowerCase().includes(source.toLowerCase()))) {
        return tier;
      }
    }

    return 'tier2'; // Default to tier 2 for unknown sources
  }
}
