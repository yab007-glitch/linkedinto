import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
 * POST /api/ai/generate - Generate LinkedIn post content using AI
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const options = generateSchema.parse(body);

    // Generate content using AI
    const generator = new AIContentGenerator();
    const result = await generator.generatePost(options);

    // Save generation to database
    const aiGeneration = await prisma.aIGeneration.create({
      data: {
        userId: session.user.id,
        prompt: JSON.stringify(options),
        generatedText: result.content,
        model: result.model,
        tone: options.tone,
        topic: options.topic,
        tokenUsage: result.tokenUsage,
      },
    });

    return NextResponse.json({
      content: result.content,
      hashtags: result.hashtags,
      generationId: aiGeneration.id,
      tokenUsage: result.tokenUsage,
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