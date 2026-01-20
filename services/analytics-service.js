import { getDb, saveDb } from './rss-service.js';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

// Fetch engagement data from LinkedIn (placeholder - requires LinkedIn API integration)
async function fetchLinkedInEngagement(linkedInPostId) {
  // TODO: Integrate with LinkedIn API to fetch real engagement data
  // For now, return mock data structure
  return {
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    clicks: 0
  };
}

// Store analytics data for a post
export async function trackPostEngagement(postId, linkedInPostId) {
  if (!linkedInPostId) {
    console.log('⚠️  No LinkedIn post ID, skipping analytics tracking');
    return null;
  }

  try {
    const engagement = await fetchLinkedInEngagement(linkedInPostId);
    const db = await getDb();

    if (!db.analytics) {
      db.analytics = [];
    }

    const analyticsEntry = {
      postId,
      linkedInPostId,
      impressions: engagement.impressions,
      likes: engagement.likes,
      comments: engagement.comments,
      shares: engagement.shares,
      clicks: engagement.clicks,
      engagementRate: calculateEngagementRate(engagement),
      clickThroughRate: calculateCTR(engagement),
      fetchedAt: new Date().toISOString()
    };

    // Update or add analytics entry
    const existingIndex = db.analytics.findIndex(a => a.postId === postId);
    if (existingIndex >= 0) {
      db.analytics[existingIndex] = analyticsEntry;
    } else {
      db.analytics.push(analyticsEntry);
    }

    await saveDb(db);
    console.log(`📊 Analytics tracked for post: ${postId}`);
    return analyticsEntry;

  } catch (error) {
    console.error('❌ Failed to track engagement:', error?.message || String(error));
    return null;
  }
}

// Calculate engagement rate
function calculateEngagementRate(engagement) {
  if (!engagement.impressions || engagement.impressions === 0) {
    return 0;
  }

  const totalEngagements = engagement.likes + engagement.comments + engagement.shares;
  return ((totalEngagements / engagement.impressions) * 100).toFixed(2);
}

// Calculate click-through rate
function calculateCTR(engagement) {
  if (!engagement.impressions || engagement.impressions === 0) {
    return 0;
  }

  return ((engagement.clicks / engagement.impressions) * 100).toFixed(2);
}

// Get analytics for a specific post
export async function getPostAnalytics(postId) {
  const db = await getDb();
  if (!db.analytics) return null;
  
  return db.analytics.find(a => a.postId === postId);
}

// Get all analytics
export async function getAllAnalytics() {
  const db = await getDb();
  return db.analytics || [];
}

// Get analytics for a time range
export async function getAnalyticsByTimeRange(startDate, endDate) {
  const db = await getDb();
  if (!db.analytics) return [];

  return db.analytics.filter(a => {
    const fetchDate = new Date(a.fetchedAt);
    return fetchDate >= startDate && fetchDate <= endDate;
  });
}

// Get top performing posts
export async function getTopPerformingPosts(limit = 10, metric = 'engagementRate') {
  const db = await getDb();
  if (!db.analytics) return [];

  return db.analytics
    .sort((a, b) => (parseFloat(b[metric]) || 0) - (parseFloat(a[metric]) || 0))
    .slice(0, limit)
    .map(a => {
      const post = db.scheduledPosts?.find(p => p.id === a.postId);
      return {
        ...a,
        post: post ? {
          content: post.content.substring(0, 200),
          scheduledFor: post.scheduledFor,
          status: post.status
        } : null
      };
    });
}

// Get analytics summary
export async function getAnalyticsSummary(days = 30) {
  const db = await getDb();
  if (!db.analytics || db.analytics.length === 0) {
    return {
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      avgEngagementRate: 0,
      avgCTR: 0,
      topPost: null
    };
  }

  const startDate = subDays(new Date(), days);
  const recentAnalytics = db.analytics.filter(a => 
    new Date(a.fetchedAt) >= startDate
  );

  if (recentAnalytics.length === 0) {
    return {
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      avgEngagementRate: 0,
      avgCTR: 0,
      topPost: null
    };
  }

  const totalImpressions = recentAnalytics.reduce((sum, a) => sum + a.impressions, 0);
  const totalEngagements = recentAnalytics.reduce((sum, a) => 
    sum + a.likes + a.comments + a.shares, 0
  );
  const avgEngagementRate = (recentAnalytics.reduce((sum, a) => 
    sum + parseFloat(a.engagementRate), 0
  ) / recentAnalytics.length).toFixed(2);
  const avgCTR = (recentAnalytics.reduce((sum, a) => 
    sum + parseFloat(a.clickThroughRate), 0
  ) / recentAnalytics.length).toFixed(2);

  const topPost = recentAnalytics.reduce((max, a) => 
    parseFloat(a.engagementRate) > parseFloat(max.engagementRate) ? a : max
  );

  return {
    totalPosts: recentAnalytics.length,
    totalImpressions,
    totalEngagements,
    avgEngagementRate,
    avgCTR,
    topPost: {
      postId: topPost.postId,
      engagementRate: topPost.engagementRate,
      impressions: topPost.impressions,
      likes: topPost.likes,
      comments: topPost.comments,
      shares: topPost.shares
    }
  };
}

// Get best performing topics/categories
export async function getTopPerformingTopics(limit = 5) {
  const db = await getDb();
  if (!db.analytics || !db.articles) return [];

  const topicStats = {};

  db.analytics.forEach(analytics => {
    const post = db.scheduledPosts?.find(p => p.id === analytics.postId);
    if (!post) return;

    const article = db.articles?.find(a => a.id === post.articleId);
    if (!article) return;

    const category = article.category;
    if (!topicStats[category]) {
      topicStats[category] = {
        category,
        postCount: 0,
        totalEngagements: 0,
        totalImpressions: 0,
        avgEngagementRate: 0
      };
    }

    topicStats[category].postCount++;
    topicStats[category].totalEngagements += analytics.likes + analytics.comments + analytics.shares;
    topicStats[category].totalImpressions += analytics.impressions;
  });

  // Calculate averages
  Object.values(topicStats).forEach(stat => {
    stat.avgEngagementRate = stat.totalImpressions > 0
      ? ((stat.totalEngagements / stat.totalImpressions) * 100).toFixed(2)
      : 0;
  });

  return Object.values(topicStats)
    .sort((a, b) => parseFloat(b.avgEngagementRate) - parseFloat(a.avgEngagementRate))
    .slice(0, limit);
}

// Get optimal posting times based on historical performance
export async function getOptimalPostingTimes() {
  const db = await getDb();
  if (!db.analytics || !db.scheduledPosts) {
    return {
      bestHour: null,
      bestDay: null,
      hourlyPerformance: {},
      dailyPerformance: {}
    };
  }

  const hourlyStats = {};
  const dailyStats = {};

  db.analytics.forEach(analytics => {
    const post = db.scheduledPosts.find(p => p.id === analytics.postId);
    if (!post || !post.postedAt) return;

    const postedDate = new Date(post.postedAt);
    const hour = postedDate.getHours();
    const day = postedDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Hourly stats
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { count: 0, totalEngagementRate: 0 };
    }
    hourlyStats[hour].count++;
    hourlyStats[hour].totalEngagementRate += parseFloat(analytics.engagementRate);

    // Daily stats
    if (!dailyStats[day]) {
      dailyStats[day] = { count: 0, totalEngagementRate: 0 };
    }
    dailyStats[day].count++;
    dailyStats[day].totalEngagementRate += parseFloat(analytics.engagementRate);
  });

  // Calculate averages
  const hourlyPerformance = {};
  Object.keys(hourlyStats).forEach(hour => {
    hourlyPerformance[hour] = (hourlyStats[hour].totalEngagementRate / hourlyStats[hour].count).toFixed(2);
  });

  const dailyPerformance = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  Object.keys(dailyStats).forEach(day => {
    dailyPerformance[dayNames[day]] = (dailyStats[day].totalEngagementRate / dailyStats[day].count).toFixed(2);
  });

  // Find best times
  const bestHour = Object.keys(hourlyPerformance).reduce((max, hour) => 
    parseFloat(hourlyPerformance[hour]) > parseFloat(hourlyPerformance[max] || 0) ? hour : max
  , null);

  const bestDay = Object.keys(dailyPerformance).reduce((max, day) => 
    parseFloat(dailyPerformance[day]) > parseFloat(dailyPerformance[max] || 0) ? day : max
  , null);

  return {
    bestHour: bestHour ? `${bestHour}:00` : null,
    bestDay,
    hourlyPerformance,
    dailyPerformance
  };
}

// Generate analytics report
export async function generateAnalyticsReport(days = 30) {
  const summary = await getAnalyticsSummary(days);
  const topPosts = await getTopPerformingPosts(5);
  const topTopics = await getTopPerformingTopics(5);
  const optimalTimes = await getOptimalPostingTimes();

  return {
    period: `Last ${days} days`,
    summary,
    topPosts,
    topTopics,
    optimalTimes,
    generatedAt: new Date().toISOString()
  };
}

// Refresh analytics for all posted content
export async function refreshAllAnalytics() {
  const db = await getDb();
  const postedPosts = db.scheduledPosts.filter(p => 
    p.status === 'posted' && p.linkedInPostId
  );

  console.log(`\n📊 Refreshing analytics for ${postedPosts.length} posts...`);

  let updated = 0;
  for (const post of postedPosts) {
    const result = await trackPostEngagement(post.id, post.linkedInPostId);
    if (result) updated++;
  }

  console.log(`✅ Updated analytics for ${updated} posts\n`);
  return { total: postedPosts.length, updated };
}
