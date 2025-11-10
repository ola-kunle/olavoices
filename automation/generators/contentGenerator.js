import fetch from 'node-fetch';
import config from '../config.json' with { type: 'json' };

/**
 * AI Content Generator with multi-provider fallback
 */
export class ContentGenerator {
  constructor() {
    // Order: Gemini (FREE) → Anthropic → OpenAI (paid as last resort)
    this.providers = [
      { name: 'gemini', handler: this.generateWithGemini.bind(this) },
      { name: 'anthropic', handler: this.generateWithAnthropic.bind(this) },
      { name: 'openai', handler: this.generateWithOpenAI.bind(this) }
    ];
  }

  /**
   * Generate blog post with automatic fallback
   */
  async generateBlogPost(topic = null, category = null) {
    const selectedTopic = topic || this.selectTopic();
    const selectedCategory = category || this.selectCategory();

    console.log(`📝 Generating blog post about: "${selectedTopic}"`);
    console.log(`📂 Category: ${selectedCategory.name}`);

    for (const provider of this.providers) {
      try {
        console.log(`🤖 Trying ${provider.name}...`);
        const content = await this.retryWithBackoff(
          () => provider.handler(selectedTopic, selectedCategory),
          3
        );

        if (content) {
          console.log(`✅ Successfully generated with ${provider.name}`);
          return {
            ...content,
            category: selectedCategory,
            topic: selectedTopic,
            generatedBy: provider.name,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (error) {
        console.warn(`⚠️  ${provider.name} failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All AI providers failed to generate content');
  }

  /**
   * Generate content using Google Gemini (FREE - FIXED MODEL)
   */
  async generateWithGemini(topic, category) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const prompt = this.buildPrompt(topic, category);
    const fullPrompt = `${this.getSystemPrompt()}\n\n${prompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return this.parseAIResponse(text);
  }

  /**
   * Generate content using OpenAI GPT-4
   */
  async generateWithOpenAI(topic, category) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const prompt = this.buildPrompt(topic, category);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseAIResponse(data.choices[0].message.content);
  }

  /**
   * Generate content using Anthropic Claude
   */
  async generateWithAnthropic(topic, category) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Anthropic API key not configured');

    const prompt = this.buildPrompt(topic, category);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 3000,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return this.parseAIResponse(data.content[0].text);
  }

  /**
   * Build prompt for AI generation
   */
  buildPrompt(topic, category) {
    return `Write a comprehensive, engaging blog post for OlaVoices, a professional Nigerian voice-over artist's website.

Topic: ${topic}
Category: ${category.name}
Target Audience: Voice-over clients, aspiring voice actors, and businesses seeking authentic African voices

Requirements:
- Write 1000-1500 words
- Use a professional yet conversational tone
- Include personal insights from a Nigerian voice actor's perspective
- Add practical tips and actionable advice
- Include cultural nuance and authenticity
- Make it SEO-friendly with natural keyword integration
- Structure with clear sections and subheadings
- End with a call-to-action encouraging readers to explore OlaVoices services

Return ONLY a JSON object with this exact structure:
{
  "title": "Engaging, SEO-optimized title (40-60 characters)",
  "metaDescription": "Compelling meta description (120-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "excerpt": "2-3 sentence excerpt for blog listing (150-200 characters)",
  "body": "Full article content in HTML format with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. Use proper semantic HTML.",
  "imageSearchQuery": "Specific search query for finding a relevant royalty-free image",
  "imageAltText": "Detailed, SEO-friendly alt text for the hero image",
  "callToAction": "Brief, engaging CTA text"
}

Important:
- Ensure the content reflects authentic Nigerian/West African voice acting perspective
- Include real-world examples and scenarios
- Make it valuable for both clients and voice actors
- Use conversational English that's clear and professional
- Don't use overly promotional language`;
  }

  /**
   * System prompt for AI persona
   */
  getSystemPrompt() {
    return `You are a professional content writer for OlaVoices, specializing in voice-over industry content. You write from the perspective of an authentic Nigerian voice actor with international experience. Your writing is:

- Authoritative yet approachable
- Culturally authentic and insightful
- SEO-optimized but natural
- Engaging and practical
- Professional without being stiff

You understand the voice-over industry, cultural nuance in voice acting, and the unique value of authentic African voices in global markets. You always return properly formatted JSON responses.`;
  }

  /**
   * Parse AI response and validate JSON
   */
  parseAIResponse(responseText) {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();

    // Remove markdown code block if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    try {
      // Fix common JSON issues from AI
      jsonText = jsonText
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/\n/g, ' ') // Remove newlines in strings
        .replace(/\r/g, ''); // Remove carriage returns

      const content = JSON.parse(jsonText);

      // Validate required fields
      const required = ['title', 'metaDescription', 'keywords', 'excerpt', 'body', 'imageSearchQuery', 'imageAltText'];
      for (const field of required) {
        if (!content[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return content;
    } catch (error) {
      console.error('Raw response:', responseText.substring(0, 500));
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
  }

  /**
   * Select random topic from config
   */
  selectTopic() {
    const topics = config.topics;
    return topics[Math.floor(Math.random() * topics.length)];
  }

  /**
   * Select random category from config
   */
  selectCategory() {
    const categories = config.contentCategories;
    return categories[Math.floor(Math.random() * categories.length)];
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = baseDelay * Math.pow(2, i);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
