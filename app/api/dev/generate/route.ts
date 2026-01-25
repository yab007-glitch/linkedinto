import { NextRequest, NextResponse } from 'next/server';
import { AIContentGenerator } from '@/lib/ai/generator';
import { z } from 'zod';

const generateSchema = z.object({
  topic: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'inspirational', 'educational', 'humorous']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  includeHashtags: z.boolean().default(true),
  includeEmojis: z.boolean().default(false),
  targetAudience: z.string().optional(),
  callToAction: z.string().optional(),
});

/**
 * POST /api/dev/generate - Generate LinkedIn post content using AI (dev mode)
 */
export async function POST(request: NextRequest) {
  if (process.env.DEV_MODE !== 'true') {
    return NextResponse.json({ error: 'Dev mode not enabled' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const options = generateSchema.parse(body);

    // Generate content using AI
    const generator = new AIContentGenerator();
    const result = await generator.generatePost(options);

    // Calculate cost (gpt-4o-mini pricing)
    const INPUT_COST_PER_TOKEN = 0.00000015;  // $0.15 per 1M tokens
    const OUTPUT_COST_PER_TOKEN = 0.0000006;  // $0.60 per 1M tokens
    
    // Estimate input tokens (system prompt ~200 + user prompt ~100-200)
    const estimatedInputTokens = 350;
    const outputTokens = result.tokenUsage ? result.tokenUsage - estimatedInputTokens : 300;
    
    const inputCost = estimatedInputTokens * INPUT_COST_PER_TOKEN;
    const outputCost = Math.max(outputTokens, 0) * OUTPUT_COST_PER_TOKEN;
    const totalCost = inputCost + outputCost;

    return NextResponse.json({
      content: result.content,
      hashtags: result.hashtags,
      tokenUsage: {
        total: result.tokenUsage || 0,
        estimatedInput: estimatedInputTokens,
        estimatedOutput: Math.max(outputTokens, 0),
      },
      cost: {
        input: inputCost,
        output: outputCost,
        total: totalCost,
        formatted: `$${totalCost.toFixed(6)}`,
      },
      model: result.model,
    });
  } catch (error) {
    console.error('Error generating content:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
