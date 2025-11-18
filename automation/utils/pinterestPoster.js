import fetch from 'node-fetch';

/**
 * Pinterest Poster - Auto-posts blog posts to Pinterest
 */
export class PinterestPoster {
  constructor() {
    this.accessToken = process.env.PINTEREST_ACCESS_TOKEN;
    this.boardId = process.env.PINTEREST_BOARD_ID;
  }

  /**
   * Create a pin from blog post
   */
  async createPin(content, image, blogPost) {
    if (!this.accessToken) {
      console.log('⚠️  Pinterest access token not configured - skipping Pinterest post');
      return null;
    }

    try {
      console.log('📌 Creating Pinterest pin...');

      // Construct pin data
      const pinData = {
        title: content.title.substring(0, 100), // Pinterest limit: 100 chars
        description: this.buildDescription(content),
        link: `https://olavoices.com/${blogPost.filename}`,
        media_source: {
          source_type: 'image_url',
          url: `https://olavoices.com/assets/images/blog/${image.filename}`
        }
      };

      // Add board_id if configured
      if (this.boardId) {
        pinData.board_id = this.boardId;
      }

      // Create pin via Pinterest API
      const response = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pinData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Pinterest API error: ${error.message || response.statusText}`);
      }

      const pin = await response.json();
      console.log(`✅ Pin created: ${pin.id}`);
      console.log(`📍 Pin URL: https://pinterest.com/pin/${pin.id}/`);

      return pin;
    } catch (error) {
      console.error(`❌ Pinterest posting failed: ${error.message}`);
      // Don't throw - Pinterest failure shouldn't stop blog automation
      return null;
    }
  }

  /**
   * Build Pinterest description with hashtags
   */
  buildDescription(content) {
    const baseDescription = content.excerpt || content.metaDescription;

    // Add hashtags
    const hashtags = [
      '#VoiceActing',
      '#NigerianVoiceActor',
      '#VoiceOver',
      '#AfricanVoices',
      '#WestAfricanVoices',
      '#StudioSetup',
      '#CommercialVO',
      '#PodcastVoices',
      '#CorporateVideo',
      '#Elearning'
    ];

    // Pinterest description limit: 500 chars
    let description = `${baseDescription}\n\n🎙️ Professional Nigerian voice-over insights.\n\n`;

    // Add as many hashtags as fit
    for (const tag of hashtags) {
      if ((description + tag + ' ').length <= 490) {
        description += tag + ' ';
      } else {
        break;
      }
    }

    return description.trim();
  }

  /**
   * Get board ID by name (optional - for first-time setup)
   */
  async getBoardId(boardName) {
    if (!this.accessToken) {
      throw new Error('Pinterest access token not configured');
    }

    try {
      const response = await fetch('https://api.pinterest.com/v5/boards', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch boards: ${response.statusText}`);
      }

      const data = await response.json();
      const board = data.items.find(b => b.name === boardName);

      if (board) {
        console.log(`✅ Found board: ${boardName} (ID: ${board.id})`);
        return board.id;
      } else {
        console.log(`⚠️  Board "${boardName}" not found`);
        console.log('Available boards:', data.items.map(b => b.name).join(', '));
        return null;
      }
    } catch (error) {
      console.error(`❌ Error fetching boards: ${error.message}`);
      return null;
    }
  }
}
