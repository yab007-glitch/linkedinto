import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publishPostNow, schedulePost } from '@/lib/queue/posting-queue';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/posts/[id]/publish - Publish a post immediately or schedule it
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await context.params;

    // Fetch the post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { schedule: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify ownership
    if (post.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if post has a schedule
    if (post.scheduledFor && post.schedule) {
      // Schedule the post
      await schedulePost(postId, post.scheduledFor);
      
      await prisma.post.update({
        where: { id: postId },
        data: { status: 'SCHEDULED' },
      });

      return NextResponse.json({
        message: 'Post scheduled successfully',
        scheduledFor: post.scheduledFor,
      });
    } else {
      // Publish immediately
      await publishPostNow(postId);
      
      await prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHING' },
      });

      return NextResponse.json({
        message: 'Post queued for immediate publishing',
      });
    }
  } catch (error) {
    console.error('Error publishing post:', error);
    return NextResponse.json(
      { error: 'Failed to publish post' },
      { status: 500 }
    );
  }
}