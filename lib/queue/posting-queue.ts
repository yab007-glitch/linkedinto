import 'server-only';
import Bull from 'bull';
import { prisma } from '../prisma';
import { LinkedInClient } from '../linkedin/client';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const postingQueue = new Bull('linkedin-posting', REDIS_URL);

interface PostJobData {
  postId: string;
}

interface PostJobError {
  message: string;
}

/**
 * Process scheduled LinkedIn posts
 */
postingQueue.process(async (job) => {
  const { postId } = job.data as PostJobData;

  try {
    // Fetch post from database
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        linkedInAccount: true,
        user: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    if (!post.linkedInAccount) {
      throw new Error('No LinkedIn account linked to this post');
    }

    // Update post status to PUBLISHING
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' },
    });

    // Create LinkedIn client with access token
    const linkedInClient = new LinkedInClient(post.linkedInAccount.accessToken);

    // Prepare post data
    const postData = {
      author: `urn:li:person:${post.linkedInAccount.linkedInId}`,
      text: post.content,
      visibility: post.visibility as 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN',
      mediaUrls: post.mediaUrls,
    };

    // Post to LinkedIn
    const result = await linkedInClient.createPost(postData);

    // Update post status to PUBLISHED
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        linkedInPostId: result.id,
        linkedInPostUrl: result.url,
      },
    });

    // Create initial analytics record
    await prisma.postAnalytics.create({
      data: {
        postId: postId,
      },
    });

    return { success: true, linkedInPostId: result.id };
  } catch (error) {
    const jobError = error as PostJobError;
    console.error(`Failed to publish post ${postId}:`, error);

    // Update post status to FAILED
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        errorMessage: jobError.message,
      },
    });

    throw error;
  }
});

/**
 * Schedule a post for publishing
 */
export async function schedulePost(postId: string, scheduledFor: Date) {
  const delay = scheduledFor.getTime() - Date.now();

  if (delay < 0) {
    throw new Error('Scheduled time must be in the future');
  }

  await postingQueue.add(
    { postId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    }
  );

  // Update post schedule status
  await prisma.postSchedule.updateMany({
    where: { postId },
    data: { status: 'SCHEDULED' },
  });
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(postId: string) {
  const jobs = await postingQueue.getJobs(['waiting', 'delayed']);
  
  for (const job of jobs) {
    const jobData = job.data as PostJobData;
    if (jobData.postId === postId) {
      await job.remove();
    }
  }

  // Update post schedule status
  await prisma.postSchedule.updateMany({
    where: { postId },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Publish a post immediately
 */
export async function publishPostNow(postId: string) {
  await postingQueue.add(
    { postId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
    }
  );
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    postingQueue.getWaitingCount(),
    postingQueue.getActiveCount(),
    postingQueue.getCompletedCount(),
    postingQueue.getFailedCount(),
    postingQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}