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

      const article = JSON.parse(jsonMatch[0]);

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
   */
  generateImageQuery(article) {
    const headline = article.headline?.toLowerCase() || '';
    const category = article.category?.toLowerCase() || '';

    // Match specific topics for better image relevance
    if (headline.includes('anime') || headline.includes('manga') || headline.includes('jujutsu')) {
      return 'anime voice acting studio microphone recording booth';
    }

    if (headline.includes('ai') || headline.includes('artificial intelligence') || headline.includes('technology')) {
      return 'artificial intelligence technology digital ai voice assistant';
    }

    if (headline.includes('audiobook') || headline.includes('narration') || headline.includes('narrator')) {
      return 'audiobook recording headphones microphone narrator reading';
    }

    if (headline.includes('podcast') || headline.includes('podcasting')) {
      return 'podcast recording microphone studio host broadcasting';
    }

    if (headline.includes('nollywood') || headline.includes('film') || headline.includes('movie')) {
      return 'film production movie set camera director recording';
    }

    if (headline.includes('voice actor') || headline.includes('voice acting') || headline.includes('dubbing')) {
      return 'voice actor recording studio microphone sound booth professional';
    }

    // Fallback based on category
    const queries = {
      'tech': 'technology innovation digital audio recording studio',
      'business': 'professional microphone recording business audio production',
      'culture': 'voice actor recording studio creative artistic',
      'human interest': 'microphone recording voice professional studio'
    };

    return queries[category] || 'professional voice recording studio microphone audio production';
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
