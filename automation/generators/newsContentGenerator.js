import Groq from 'groq-sdk';

/**
 * News Content Generator - Creates engaging news articles from source material
 */
export class NewsContentGenerator {
  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Generate a full news article from source material
   */
  async generateNewsArticle(sourceArticle) {
    console.log(`\n📝 Generating article: "${sourceArticle.title}"`);

    const prompt = `You are a skilled journalist writing for OlaVoices News, a premium news site covering African stories that matter globally.

SOURCE MATERIAL:
Title: ${sourceArticle.title}
Description: ${sourceArticle.description || 'N/A'}
Content: ${sourceArticle.content || sourceArticle.description || 'N/A'}
Source: ${sourceArticle.source?.name || 'News Source'}
URL: ${sourceArticle.url}
Published: ${new Date(sourceArticle.publishedAt).toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
})}

INSTRUCTIONS:
Write a compelling 500-700 word news article that:
1. Opens with a PUNCHY, emotional hook (make readers FEEL something)
2. Expands on the story with key details and context
3. Includes relevant background information
4. **CRITICAL: Connects this news to the voice-over/voice acting industry**
   - How does this impact voice actors, voice-over work, or content creation?
   - Why should voice-over professionals care about this?
   - What opportunities or challenges does this create for voice talent?
   - Add a paragraph explaining the voice-over angle naturally
5. Explains why this matters (emotional/social/cultural impact)
6. Ends with a thought-provoking conclusion that ties to voice-over
7. Uses journalistic tone (authentic, credible, engaging)
8. Cites the source naturally in the text (e.g., "According to ${sourceArticle.source?.name}...")

STYLE:
- Conversational but professional
- Touch hearts, strike nerves, evoke reactions
- Make it shareable (people want to talk about this)
- Not dry/academic - write like a human
- **Authentic voice-over industry perspective**

IMPORTANT:
- Do NOT fabricate details not in the source
- Do NOT editorialize or add personal opinions
- DO make it emotionally engaging while staying factual
- **MUST include voice-over industry connection** (this is a voice-over artist's website)

Respond in JSON format:
{
  "headline": "Compelling, clickable headline (8-12 words)",
  "subheadline": "Supporting detail (10-15 words)",
  "article": "Full article text (500-700 words, with paragraphs separated by \\n\\n)",
  "excerpt": "Engaging 1-sentence summary for listing page (20-30 words)",
  "category": "One of: Breaking, Politics, Business, Tech, Culture, Sports, Human Interest",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert journalist writing emotionally compelling, factual news articles. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      });

      const responseText = completion.choices[0].message.content.trim();

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse article JSON from AI response');
      }

      // Clean JSON string: remove control characters that break JSON.parse
      let jsonString = jsonMatch[0]
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars
        .replace(/\n/g, '\\n')  // Escape real newlines
        .replace(/\r/g, '\\r')  // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs

      const article = JSON.parse(jsonString);

      // Add source information
      article.source = {
        name: sourceArticle.source?.name || 'News Source',
        url: sourceArticle.url,
        publishedAt: sourceArticle.publishedAt
      };

      // Add appeal metadata
      article.appealScore = sourceArticle.appealScore;
      article.appealReason = sourceArticle.appealReason;

      // Generate meta description for SEO
      article.metaDescription = article.excerpt;

      // Calculate reading time
      const wordCount = article.article.split(/\s+/).length;
      article.readingTime = Math.ceil(wordCount / 200); // 200 words per minute

      console.log(`✅ Article generated: ${wordCount} words, ${article.readingTime} min read`);

      return article;

    } catch (error) {
      console.error(`❌ Article generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate specific, relevant image search query based on article content
   * ENHANCED: Multiple query variations per topic for diversity
   */
  generateImageQuery(article) {
    const headline = article.headline?.toLowerCase() || '';
    const category = article.category?.toLowerCase() || '';

    // Helper to pick random query from array
    const pickRandom = (queries) => queries[Math.floor(Math.random() * queries.length)];

    // Match specific topics - NOW WITH MULTIPLE VARIATIONS
    if (headline.includes('anime') || headline.includes('manga') || headline.includes('jujutsu')) {
      return pickRandom([
        'anime voice acting studio microphone recording booth',
        'animation dubbing voice actor microphone studio',
        'japanese anime character voice recording session',
        'voice over talent anime production studio',
        'manga adaptation voice acting recording'
      ]);
    }

    if (headline.includes('ai') || headline.includes('artificial intelligence') || headline.includes('technology')) {
      return pickRandom([
        'artificial intelligence technology digital ai voice assistant',
        'ai voice synthesis technology futuristic studio',
        'voice recognition ai technology microphone',
        'digital voice assistant artificial intelligence',
        'ai powered voice technology modern workspace'
      ]);
    }

    if (headline.includes('audiobook') || headline.includes('narration') || headline.includes('narrator')) {
      return pickRandom([
        'audiobook recording headphones microphone narrator reading',
        'book narrator voice actor studio reading manuscript',
        'audiobook production professional narrator microphone',
        'voice talent reading book studio recording',
        'narrator performing audiobook with headphones'
      ]);
    }

    if (headline.includes('podcast') || headline.includes('podcasting')) {
      return pickRandom([
        'podcast recording microphone studio host broadcasting',
        'podcaster speaking into microphone sound booth',
        'podcast studio setup audio equipment broadcasting',
        'radio style podcast recording session',
        'podcast host microphone sound mixing board'
      ]);
    }

    if (headline.includes('nollywood') || headline.includes('film') || headline.includes('movie')) {
      return pickRandom([
        'film production movie set camera director recording',
        'cinema movie production behind the scenes',
        'film set voice over recording studio',
        'movie production audio recording session',
        'african film industry nollywood production'
      ]);
    }

    if (headline.includes('voice actor') || headline.includes('voice acting') || headline.includes('dubbing')) {
      return pickRandom([
        'voice actor recording studio microphone sound booth',
        'professional voice talent performing in booth',
        'voice over artist studio session recording',
        'dubbing actor microphone sound isolation booth',
        'voice performer audio recording equipment',
        'vocal artist in professional recording studio'
      ]);
    }

    // Fallback based on category - ALSO WITH VARIATIONS
    const categoryQueries = {
      'tech': [
        'technology innovation digital audio recording studio',
        'tech audio equipment modern recording setup',
        'digital voice technology professional workspace'
      ],
      'business': [
        'professional microphone recording business audio production',
        'corporate audio production meeting room',
        'business professional voice recording studio'
      ],
      'culture': [
        'voice actor recording studio creative artistic',
        'creative artist voice recording cultural expression',
        'artistic voice performance studio culture'
      ],
      'human interest': [
        'microphone recording voice professional studio',
        'human voice emotional performance recording',
        'personal story voice recording intimate setting'
      ]
    };

    if (categoryQueries[category]) {
      return pickRandom(categoryQueries[category]);
    }

    // Ultimate fallback with variations
    return pickRandom([
      'professional voice recording studio microphone audio production',
      'audio engineer sound mixing board recording studio',
      'broadcast quality voice recording professional setup',
      'voice recording session modern studio equipment',
      'audio production workspace professional microphone'
    ]);
  }

  /**
   * Generate SEO-friendly slug from headline
   */
  generateSlug(headline) {
    return headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80); // Limit length
  }
}
