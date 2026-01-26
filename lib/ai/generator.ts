import OpenAI from 'openai';



export interface AIGenerationOptions {
  topic?: string;
  tone?: 'professional' | 'casual' | 'inspirational' | 'educational' | 'humorous';
  length?: 'short' | 'medium' | 'long';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  targetAudience?: string;
  callToAction?: string;
}

export interface AIGenerationResult {
  content: string;
  hashtags: string[];
  tokenUsage?: number;
  model: string;
}

interface OpenAIError {
  message: string;
}

interface GeneratedContent {
  content?: string;
  hashtags?: string[];
}

export class AIContentGenerator {
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
    }
    return this.openai;
  }

  /**
   * Generate LinkedIn post content using AI
   */
  async generatePost(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const prompt = this.buildPrompt(options);

    try {
      const response = await this.getClient().chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini which supports json_object
        messages: [
          {
            role: 'system',
            content: `You are an expert LinkedIn content creator. Generate engaging, professional LinkedIn posts that drive engagement. 
            Focus on:
            - Clear, concise messaging
            - Professional yet approachable tone
            - Value-driven content
            - Strategic use of line breaks and formatting
            - Relevant hashtags (3-5 maximum)
            
            IMPORTANT: Your response must be valid JSON with this exact structure:
            {
              "content": "The post text (without hashtags)",
              "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
            }`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: this.getMaxTokens(options.length),
      });

      const messageContent = response.choices[0].message.content || '{}';
      
      // Parse JSON from the response (handle potential markdown code blocks)
      let jsonStr = messageContent;
      if (messageContent.includes('```json')) {
        jsonStr = messageContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (messageContent.includes('```')) {
        jsonStr = messageContent.replace(/```\n?/g, '');
      }
      
      const result: GeneratedContent = JSON.parse(jsonStr.trim());
      
      return {
        content: result.content || '',
        hashtags: result.hashtags || [],
        tokenUsage: response.usage?.total_tokens,
        model: response.model,
      };
    } catch (error) {
      const openaiError = error as OpenAIError;
      console.error('OpenAI API Error:', openaiError.message);
      throw new Error('Failed to generate content with AI');
    }
  }

  /**
   * Improve existing content
   */
  async improveContent(content: string, instructions: string): Promise<AIGenerationResult> {
    try {
      const response = await this.getClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert LinkedIn content editor. Improve the given content based on the user's instructions while maintaining the core message.
            
            IMPORTANT: Your response must be valid JSON with this exact structure:
            {
              "content": "The improved post text",
              "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
            }`,
          },
          {
            role: 'user',
            content: `Original content:\n${content}\n\nInstructions: ${instructions}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const messageContent = response.choices[0].message.content || '{}';
      
      // Parse JSON from the response
      let jsonStr = messageContent;
      if (messageContent.includes('```json')) {
        jsonStr = messageContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (messageContent.includes('```')) {
        jsonStr = messageContent.replace(/```\n?/g, '');
      }
      
      const result: GeneratedContent = JSON.parse(jsonStr.trim());
      
      return {
        content: result.content || content,
        hashtags: result.hashtags || [],
        tokenUsage: response.usage?.total_tokens,
        model: response.model,
      };
    } catch (error) {
      const openaiError = error as OpenAIError;
      console.error('OpenAI API Error:', openaiError.message);
      throw new Error('Failed to improve content with AI');
    }
  }

  /**
   * Generate multiple variations of a post
   */
  async generateVariations(baseContent: string, count: number = 3): Promise<AIGenerationResult[]> {
    const variations: AIGenerationResult[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const result = await this.improveContent(
          baseContent,
          `Create a different variation of this post while keeping the core message. Make it unique and engaging.`
        );
        variations.push(result);
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error);
      }
    }

    return variations;
  }

  private buildPrompt(options: AIGenerationOptions): string {
    const parts: string[] = [];

    if (options.topic) {
      parts.push(`Topic: ${options.topic}`);
    }

    if (options.tone) {
      parts.push(`Tone: ${options.tone}`);
    }

    if (options.length) {
      const lengthGuide = {
        short: '50-100 words',
        medium: '100-200 words',
        long: '200-300 words',
      };
      parts.push(`Length: ${lengthGuide[options.length]}`);
    }

    if (options.targetAudience) {
      parts.push(`Target audience: ${options.targetAudience}`);
    }

    if (options.callToAction) {
      parts.push(`Include this call-to-action: ${options.callToAction}`);
    }

    if (options.includeEmojis) {
      parts.push('Use relevant emojis sparingly for emphasis');
    }

    if (options.includeHashtags) {
      parts.push('Include 3-5 relevant hashtags');
    }

    return `Create a LinkedIn post with the following requirements:\n\n${parts.join('\n')}`;
  }

  private getMaxTokens(length?: 'short' | 'medium' | 'long'): number {
    const tokenMap = {
      short: 300,
      medium: 500,
      long: 800,
    };
    return length ? tokenMap[length] : 500;
  }
}