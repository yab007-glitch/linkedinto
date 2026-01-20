import { getDb, saveDb } from './rss-service.js';
import { addHours, formatDistanceToNow } from 'date-fns';

// Get all scheduled posts
export async function getScheduledPosts() {
  const db = await getDb();
  return [...(db.scheduledPosts || [])].sort((a, b) => 
    new Date(a.scheduledFor) - new Date(b.scheduledFor)
  );
}

// Get upcoming posts (next N posts)
export async function getUpcomingPosts(limit = 10) {
  const db = await getDb();
  const now = new Date();

  return (db.scheduledPosts || [])
    .filter(post => post.status === 'pending' || post.status === 'approved')
    .filter(post => new Date(post.scheduledFor) >= now)
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
    .slice(0, limit);
}

// Get posts ready to publish (scheduled time has passed and approved)
export async function getReadyPosts() {
  const db = await getDb();
  const now = new Date();

  return (db.scheduledPosts || [])
    .filter(post => post.status === 'approved')
    .filter(post => new Date(post.scheduledFor) <= now)
    .filter(post => !post.postedAt);
}

// Create a new scheduled post
export async function createScheduledPost(articleId, content, scheduledFor) {
  const db = await getDb();
  
  const newPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    articleId,
    content,
    scheduledFor: scheduledFor || new Date().toISOString(),
    status: 'pending', // pending, approved, posted, failed
    linkedInPostId: null,
    createdAt: new Date().toISOString(),
    postedAt: null,
    error: null
  };

  db.scheduledPosts.push(newPost);
  await saveDb(db);
  
  console.log(`📝 Created scheduled post for ${new Date(newPost.scheduledFor).toLocaleString()}`);
  return newPost;
}

// Approve a post for publishing
export async function approvePost(postId) {
  const db = await getDb();
  const post = db.scheduledPosts?.find(p => p.id === postId);

  if (post) {
    post.status = 'approved';
    await saveDb(db);
    console.log(`✅ Approved post: ${postId}`);
    return post;
  }

  throw new Error('Post not found');
}

// Mark post as posted
export async function markPostAsPosted(postId, linkedInPostId = null) {
  const db = await getDb();
  const post = db.scheduledPosts?.find(p => p.id === postId);

  if (post) {
    post.status = 'posted';
    post.postedAt = new Date().toISOString();
    post.linkedInPostId = linkedInPostId;
    await saveDb(db);
    console.log(`✅ Marked post as posted: ${postId}`);
    return post;
  }

  throw new Error('Post not found');
}

// Mark post as failed
export async function markPostAsFailed(postId, error) {
  const db = await getDb();
  const post = db.scheduledPosts?.find(p => p.id === postId);

  if (post) {
    post.status = 'failed';
    post.error = error;
    await saveDb(db);
    console.log(`❌ Marked post as failed: ${postId} - ${error}`);
    return post;
  }

  throw new Error('Post not found');
}

// Delete a scheduled post
export async function deleteScheduledPost(postId) {
  const db = await getDb();
  db.scheduledPosts = (db.scheduledPosts || []).filter(p => p.id !== postId);
  await saveDb(db);
  console.log(`🗑️ Deleted scheduled post: ${postId}`);
}

// Get queue statistics
export async function getQueueStats() {
  const db = await getDb();
  const now = new Date();
  
  const stats = {
    totalPosts: (db.scheduledPosts || []).length,
    pending: (db.scheduledPosts || []).filter(p => p.status === 'pending').length,
    approved: (db.scheduledPosts || []).filter(p => p.status === 'approved').length,
    posted: (db.scheduledPosts || []).filter(p => p.status === 'posted').length,
    failed: (db.scheduledPosts || []).filter(p => p.status === 'failed').length,
    upcoming: (db.scheduledPosts || []).filter(p =>
      (p.status === 'pending' || p.status === 'approved') &&
      new Date(p.scheduledFor) >= now
    ).length,
    overdue: (db.scheduledPosts || []).filter(p =>
      p.status === 'approved' &&
      new Date(p.scheduledFor) < now &&
      !p.postedAt
    ).length,
    unprocessedArticles: (db.articles || []).filter(a => !a.processed).length,
    totalArticles: (db.articles || []).length
  };

  // Get next scheduled post
  const nextPost = (db.scheduledPosts || [])
    .filter(p => (p.status === 'pending' || p.status === 'approved') && new Date(p.scheduledFor) >= now)
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];

  if (nextPost) {
    stats.nextPostTime = nextPost.scheduledFor;
    stats.nextPostIn = formatDistanceToNow(new Date(nextPost.scheduledFor), { addSuffix: true });
  }

  return stats;
}

// Calculate next posting time based on interval
export function calculateNextPostTime(intervalHours = 6) {
  return addHours(new Date(), intervalHours).toISOString();
}

// Get automation config
export async function getAutomationConfig() {
  const db = await getDb();
  return db.automationConfig;
}

// Update automation config
export async function updateAutomationConfig(config) {
  const db = await getDb();
  if (db.automationConfig) {
    db.automationConfig = { ...db.automationConfig, ...config };
  }
  await saveDb(db);
  return db.automationConfig;
}

// Toggle automation on/off
export async function toggleAutomation(enabled) {
  const db = await getDb();
  if (db.automationConfig) {
    db.automationConfig.enabled = enabled;

    if (enabled && !db.automationConfig.nextRun) {
      // Schedule first run
      db.automationConfig.nextRun = calculateNextPostTime(db.automationConfig.postingInterval);
    }
  }

  await saveDb(db);
  console.log(`🔄 Automation ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return db.automationConfig;
}
