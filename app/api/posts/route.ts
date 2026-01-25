import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { PostStatus } from '@prisma/client';

const createPostSchema = z.object({
  content: z.string().min(1).max(3000),
  linkedInAccountId: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS', 'LOGGED_IN']).default('PUBLIC'),
  hashtags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
});

/**
 * GET /api/posts - Fetch user's posts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PostStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const posts = await prisma.post.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        linkedInAccount: true,
        analytics: true,
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts - Create a new post
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createPostSchema.parse(body);

    // Create post
    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content: data.content,
        linkedInAccountId: data.linkedInAccountId,
        visibility: data.visibility,
        hashtags: data.hashtags,
        mediaUrls: data.mediaUrls,
        status: data.scheduledFor ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      },
    });

    // Create schedule if scheduledFor is provided
    if (data.scheduledFor) {
      await prisma.postSchedule.create({
        data: {
          postId: post.id,
          scheduledFor: new Date(data.scheduledFor),
        },
      });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}