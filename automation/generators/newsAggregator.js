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
   * Fetch trending African news from multiple sources
   */
  async fetchAfricanNews() {
    if (!this.newsApiKey) {
      console.log('⚠️  NewsAPI key not configured, using fallback method...');
      return await this.fetchFromGoogleNewsRSS();
    }

    try {
      console.log('📰 Fetching African news from NewsAPI...');

      // Broad search covering all African countries and topics
      const queries = [
        'Nigeria OR Ghana OR Kenya OR "South Africa" OR Africa',
        'Lagos OR Accra OR Nairobi OR "Cape Town" OR African',
        'Nollywood OR Afrobeats OR "African tech" OR "African business"'
      ];

      let allArticles = [];

      // Fetch from multiple queries for variety
      for (const query of queries) {
        const response = await fetch(
          `https://newsapi.org/v2/everything?` +
          `q=${encodeURIComponent(query)}&` +
          `language=en&` +
          `sortBy=publishedAt&` +
          `pageSize=20&` +
          `from=${new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()}`,
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

      console.log(`✅ Found ${uniqueArticles.length} unique articles from NewsAPI`);
      return uniqueArticles.slice(0, 30); // Return top 30

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
   * AI evaluates if news is emotionally compelling AND relevant to voice-over industry
   */
  async evaluateNewsAppeal(article) {
    try {
      const prompt = `You are a news editor for OlaVoices, a Nigerian voice-over artist's website.

STORY:
Title: ${article.title}
Description: ${article.description || 'N/A'}
Source: ${article.source?.name || 'Unknown'}
Published: ${article.publishedAt}

EVALUATION CRITERIA (ALL must be met):
✅ Does this story touch hearts, strike a nerve, or make you feel something?
✅ Can this story be connected to the voice-over/voice acting industry?
   Examples of connections:
   - Media/Entertainment (Nollywood, music, podcasts → voice actors work in these)
   - Tech/AI (voice technology, apps, assistants → voice-over applications)
   - Business/Marketing (advertising, branding → commercial voice-overs)
   - Education (e-learning, training → voice-over narration)
   - Culture/Language (African languages, accents → voice authenticity)
   - Politics/Social Issues (if it affects media/content creation)
✅ Would people want to share this or talk about it?
✅ Is it authentic and properly sourced?

REJECT if:
❌ Cannot be tied to voice-over industry in any meaningful way
❌ Too generic or unrelated to media/content creation

Rate this story from 1-10 on VOICE-OVER RELEVANCE + emotional appeal.
Then explain the voice-over connection in 1-2 sentences.

Respond in JSON format:
{
  "score": 7,
  "reasoning": "Nollywood's growth means more voice-over opportunities for Nigerian actors...",
  "voiceoverConnection": "Growing film industry = more dubbing and narration work",
  "shouldPublish": true
}

Score 7+ WITH voice-over connection = publish. Otherwise skip.`;

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
    console.log(`\n🔍 Searching for ${targetCount} compelling African news stories...\n`);

    const articles = await this.fetchAfricanNews();

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
