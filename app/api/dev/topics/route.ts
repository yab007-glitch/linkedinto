import { NextResponse } from 'next/server';
import OpenAI from 'openai';



// Topic categories for LinkedIn content
const TOPIC_CATEGORIES = [
  'AI and Machine Learning',
  'Leadership and Management',
  'Career Development',
  'Technology Trends',
  'Productivity and Work-Life Balance',
  'Entrepreneurship',
  'Remote Work',
  'Professional Skills',
  'Industry Insights',
  'Innovation',
];

interface TrendingTopic {
  topic: string;
  category: string;
  hook: string;
  relevance: string;
}

/**
 * GET /api/dev/topics - Discover trending topics for LinkedIn posts
 */
export async function GET() {
  if (process.env.DEV_MODE !== 'true') {
    return NextResponse.json({ error: 'Dev mode not enabled' }, { status: 403 });
  }

  try {
    // Select 3 random categories to focus on
    const selectedCategories = TOPIC_CATEGORIES
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a LinkedIn content strategist. Generate trending, engaging topics that would perform well on LinkedIn in January 2026.
          
          Focus on topics that:
          - Are timely and relevant to current trends
          - Would drive engagement (likes, comments, shares)
          - Appeal to professionals across industries
          - Have a unique angle or perspective
          
          Return JSON array with exactly 5 topics in this format:
          [
            {
              "topic": "The specific topic to write about",
              "category": "Category name",
              "hook": "An engaging opening hook for the post",
              "relevance": "Why this topic matters now"
            }
          ]`,
        },
        {
          role: 'user',
          content: `Generate 5 trending LinkedIn post topics for these categories: ${selectedCategories.join(', ')}. 
          
          Consider current trends like:
          - AI advancements and their impact on work
          - Economic outlook for 2026
          - Skills in demand
          - Workplace culture changes
          - Tech industry developments
          
          Make them specific and actionable, not generic.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    });

    const messageContent = response.choices[0].message.content || '[]';
    
    // Parse JSON from response
    let jsonStr = messageContent;
    if (messageContent.includes('```json')) {
      jsonStr = messageContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (messageContent.includes('```')) {
      jsonStr = messageContent.replace(/```\n?/g, '');
    }
    
    const topics: TrendingTopic[] = JSON.parse(jsonStr.trim());

    return NextResponse.json({
      topics,
      categories: selectedCategories,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error discovering topics:', error);
    return NextResponse.json(
      { error: 'Failed to discover topics' },
      { status: 500 }
    );
  }
}
