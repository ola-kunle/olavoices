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
   * Generate content using Google Gemini (FREE - MULTI-MODEL FALLBACK)
   */
  async generateWithGemini(topic, category) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const prompt = this.buildPrompt(topic, category);
    const fullPrompt = `${this.getSystemPrompt()}\n\n${prompt}`;

    // Try multiple Gemini models in order (in case one is overloaded)
    const models = [
      'gemini-2.5-flash-preview-05-20',  // Preview version (more stable)
      'gemini-2.5-flash',                 // Stable version
      'gemini-2.5-pro-preview-05-06'     // Pro preview (fallback)
    ];

    let lastError = null;
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
          const errorMsg = error.error?.message || response.statusText;

          // If overloaded (503), try next model
          if (error.error?.code === 503) {
            console.warn(`⚠️  ${model} is overloaded, trying next model...`);
            lastError = new Error(`${model}: ${errorMsg}`);
            continue;
          }

          throw new Error(`Gemini API error (${model}): ${errorMsg}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        console.log(`✅ Generated with ${model}`);
        return this.parseAIResponse(text);
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error('All Gemini models failed');
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
    // Detect if this is an SEO keyword (contains "hire", "cost", "rates", etc.)
    const isSearchIntent = /hire|cost|rates|pricing|how to|best|guide|find/i.test(topic);

    return `Write a comprehensive, SEO-optimized blog post for OlaVoices, a professional Nigerian voice-over artist's website.

Topic: ${topic}
Category: ${category.name}
Target Audience: ${isSearchIntent ? 'Businesses and clients actively searching to hire voice actors' : 'Voice-over clients, aspiring voice actors, and businesses seeking authentic African voices'}

Requirements:
- Write 1200-1800 words (longer content ranks better)
- Use a professional yet conversational tone
${isSearchIntent ? '- DIRECTLY answer the search query in the first paragraph with actionable information' : '- Include personal insights from a Nigerian voice actor\'s perspective'}
${isSearchIntent ? '- Include specific pricing ranges ($50-$300 per project), process details, timelines (24-48hr turnaround)' : '- Add practical tips and actionable advice'}
- Include cultural nuance and authenticity about Nigerian/West African voice work
- Make it SEO-friendly with natural keyword integration (use topic keywords 3-5 times)
- Structure with clear H2 and H3 headings (at least 4-6 sections)
- Add a "Frequently Asked Questions" section with 3-4 common questions (great for SEO)
- Include internal linking opportunities: mention "portfolio", "rates", "contact" naturally
${isSearchIntent ? '- End with a clear, compelling call-to-action: "Get a FREE quote for your project today"' : '- End with a call-to-action encouraging readers to explore OlaVoices services'}
${isSearchIntent ? '- Include trust signals: "10+ years experience", "international clients", "broadcast-quality recordings", "fast turnaround"' : ''}
- Use listicles, numbered steps, or bullet points where appropriate (better for Pinterest pins)
- Make the first 150 words extremely valuable and keyword-rich (for featured snippets)

Return ONLY a JSON object with this exact structure:
{
  "title": "Engaging, SEO-optimized title with primary keyword (50-60 characters)",
  "metaDescription": "Compelling meta description with call-to-action (140-160 characters)",
  "keywords": ["primary-keyword", "secondary-keyword", "long-tail-keyword-1", "long-tail-keyword-2", "location-keyword"],
  "excerpt": "Value-packed 2-3 sentence excerpt with primary keyword (150-200 characters)",
  "body": "Full article content in semantic HTML with <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote> tags. Include FAQ section at the end.",
  "imageSearchQuery": "Specific, Pinterest-friendly search query (e.g., 'Nigerian voice actor recording studio professional microphone')",
  "imageAltText": "Detailed, keyword-rich alt text (80-125 characters)",
  "callToAction": "Action-oriented CTA with urgency or value proposition"
}

Important:
- Ensure the content reflects authentic Nigerian/West African voice acting perspective
- Include real-world examples, case studies, or scenarios
- Make it valuable for both clients looking to hire AND voice actors learning
- Use conversational English that's clear and professional
- Naturally mention "Nigerian voice actor", "West African accent", "authentic African voice" 2-3 times
- Don't use overly promotional language - focus on education and value
- Structure content for easy scanning (short paragraphs, subheadings, lists)
- Optimize for voice search (use natural question phrases in headings)`;
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
   * Prioritizes SEO keywords (70% of the time) for better organic traffic
   */
  selectTopic() {
    // 70% chance to use SEO keyword if available
    if (config.seoKeywords && Math.random() > 0.3) {
      return config.seoKeywords[Math.floor(Math.random() * config.seoKeywords.length)];
    }
    // Otherwise use regular topics
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
