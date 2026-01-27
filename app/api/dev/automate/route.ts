import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';



interface AutomationRequest {
  count?: number;
  categories?: string[];
  tone?: 'professional' | 'casual' | 'inspirational' | 'educational' | 'humorous';
  length?: 'short' | 'medium' | 'long';
  autoPost?: boolean;
}

interface GeneratedPost {
  topic: string;
  category: string;
  content: string;
  hashtags: string[];
  hook: string;
  status: 'generated' | 'posted' | 'failed';
  linkedInUrl?: string;
  cost: number;
  tokens: number;
}

// Cost constants
const INPUT_COST_PER_TOKEN = 0.00000015;
const OUTPUT_COST_PER_TOKEN = 0.0000006;

/**
 * POST /api/dev/automate - Full automation: discover topics and generate posts
 */
export async function POST(request: NextRequest) {
  if (process.env.DEV_MODE !== 'true') {
    return NextResponse.json({ error: 'Dev mode not enabled' }, { status: 403 });
  }

  try {
    const body: AutomationRequest = await request.json();
    const count = Math.min(body.count || 3, 10); // Max 10 posts
    const tone = body.tone || 'professional';
    const length = body.length || 'medium';
    const autoPost = body.autoPost || false;

    const results: GeneratedPost[] = [];
    let totalCost = 0;
    let totalTokens = 0;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Step 1: Discover trending topics
    const topicsResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a LinkedIn content strategist. Generate ${count} unique, engaging topics that would perform exceptionally well on LinkedIn.
          
          Focus on:
          - Timely and relevant trends for January 2026
          - Topics that spark professional discussions
          - Unique angles that stand out
          - Mix of categories (tech, leadership, career, productivity)
          
          Return JSON array:
          [{"topic": "...", "category": "...", "hook": "engaging opening line"}]`,
        },
        {
          role: 'user',
          content: `Generate ${count} LinkedIn post topics. Include a mix of:
          - AI/Technology trends
          - Career and professional development  
          - Leadership insights
          - Productivity tips
          - Industry observations
          
          Make each topic specific and thought-provoking.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 800,
    });

    const topicsContent = topicsResponse.choices[0].message.content || '[]';
    let topicsJson = topicsContent;
    if (topicsContent.includes('```json')) {
      topicsJson = topicsContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (topicsContent.includes('```')) {
      topicsJson = topicsContent.replace(/```\n?/g, '');
    }
    
    const topics = JSON.parse(topicsJson.trim());
    
    // Calculate topic discovery cost
    const topicInputTokens = 300;
    const topicOutputTokens = (topicsResponse.usage?.total_tokens || 500) - topicInputTokens;
    totalCost += topicInputTokens * INPUT_COST_PER_TOKEN + topicOutputTokens * OUTPUT_COST_PER_TOKEN;
    totalTokens += topicsResponse.usage?.total_tokens || 0;

    // Step 2: Generate posts for each topic (Parallel Execution)
    const generationPromises = topics.map(async (topicData: any) => {
      try {
        const lengthGuide = {
          short: '80-120 words',
          medium: '150-200 words',
          long: '250-300 words',
        };

        const postResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a top LinkedIn content creator known for viral, engaging posts. Create a ${tone} post that drives massive engagement.
              
              Writing style:
              - Start with the provided hook or an even better one
              - Use strategic line breaks for readability
              - Include a thought-provoking question or call-to-action
              - Keep it ${lengthGuide[length]}
              - Make it personal and authentic
              - End with a question to drive comments
              
              Return JSON:
              {
                "content": "The full post text (no hashtags)",
                "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4"]
              }`,
            },
            {
              role: 'user',
              content: `Topic: ${topicData.topic}
Category: ${topicData.category}
Opening hook: ${topicData.hook}

Create an exceptional LinkedIn post that will resonate with professionals and drive engagement.`,
            },
          ],
          temperature: 0.8,
          max_tokens: 600,
        });

        const postContent = postResponse.choices[0].message.content || '{}';
        let postJson = postContent;
        if (postContent.includes('```json')) {
          postJson = postContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (postContent.includes('```')) {
          postJson = postContent.replace(/```\n?/g, '');
        }
        
        const post = JSON.parse(postJson.trim());

        // Calculate cost
        const postInputTokens = 350;
        const postOutputTokens = (postResponse.usage?.total_tokens || 400) - postInputTokens;
        const postCost = postInputTokens * INPUT_COST_PER_TOKEN + postOutputTokens * OUTPUT_COST_PER_TOKEN;
        
        // Return result and cost/tokens for aggregation
        const result: GeneratedPost = {
          topic: topicData.topic,
          category: topicData.category,
          content: post.content || '',
          hashtags: post.hashtags || [],
          hook: topicData.hook,
          status: 'generated',
          cost: postCost,
          tokens: postResponse.usage?.total_tokens || 0,
        };

        // Step 3: Auto-post if enabled
        if (autoPost && result.content) {
          try {
            const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
            if (accessToken) {
              const axios = (await import('axios')).default;
              
              const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const linkedInId = profileRes.data.sub;

              const fullContent = result.content + '\n\n' + result.hashtags.map((h: string) => `#${h}`).join(' ');
              
              const postRes = await axios.post(
                'https://api.linkedin.com/v2/ugcPosts',
                {
                  author: `urn:li:person:${linkedInId}`,
                  lifecycleState: 'PUBLISHED',
                  specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                      shareCommentary: { text: fullContent },
                      shareMediaCategory: 'NONE',
                    },
                  },
                  visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
                },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                  },
                }
              );

              const postId = postRes.headers['x-restli-id'] || postRes.data.id;
              result.status = 'posted';
              result.linkedInUrl = `https://www.linkedin.com/feed/update/${postId}`;
            }
          } catch (postError) {
            console.error('Auto-post failed:', postError);
            result.status = 'failed';
          }
        }

        return result;

      } catch (genError) {
        console.error('Post generation failed:', genError);
        return {
          topic: topicData.topic,
          category: topicData.category,
          content: '',
          hashtags: [],
          hook: topicData.hook,
          status: 'failed',
          cost: 0,
          tokens: 0,
        } as GeneratedPost;
      }
    });

    const generatedResults = await Promise.all(generationPromises);
    
    // Aggregate results
    generatedResults.forEach(result => {
      results.push(result);
      totalCost += result.cost;
      totalTokens += result.tokens;
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        generated: results.filter(r => r.status === 'generated').length,
        posted: results.filter(r => r.status === 'posted').length,
        failed: results.filter(r => r.status === 'failed').length,
        totalTokens,
        totalCost,
        formattedCost: `$${totalCost.toFixed(6)}`,
      },
    });
  } catch (error) {
    console.error('Automation error:', error);
    return NextResponse.json(
      { error: 'Automation failed' },
      { status: 500 }
    );
  }
}
