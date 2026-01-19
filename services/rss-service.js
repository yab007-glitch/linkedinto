import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import DB_PATHS from '../config/db-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new Parser({
  customFields: {
    item: ['description', 'content', 'content:encoded']
  }
});

const DB_FILE = DB_PATHS.AUTOMATION_DB;

// Default RSS feeds - Healthcare & Technology
const DEFAULT_FEEDS = [
  // ===== HEALTHCARE FEEDS =====
  {
    id: 'healthcare-dive',
    name: 'Healthcare Dive',
    url: 'https://www.healthcaredive.com/feeds/news/',
    enabled: true,
    category: 'Healthcare Business'
  },
  {
    id: 'stat-news',
    name: 'STAT News',
    url: 'https://www.statnews.com/feed/',
    enabled: true,
    category: 'Health & Medicine'
  },
  {
    id: 'medpage-today',
    name: 'MedPage Today',
    url: 'https://www.medpagetoday.com/rss/headlines.xml',
    enabled: true,
    category: 'Medical News'
  },
  // Disabled feeds (returning errors)
  {
    id: 'fierce-healthcare',
    name: 'FierceHealthcare',
    url: 'https://www.fiercehealthcare.com/rss/xml',
    enabled: false, // Disabled: returning parse errors
    category: 'Healthcare Industry'
  },
  {
    id: 'medical-news-today',
    name: 'Medical News Today',
    url: 'https://www.medicalnewstoday.com/rss',
    enabled: false, // Disabled: returning 404
    category: 'Medical News'
  },
  {
    id: 'healthcare-it-news',
    name: 'Healthcare IT News',
    url: 'https://www.healthcareitnews.com/news.rss',
    enabled: false, // Disabled: returning 404
    category: 'Healthcare Technology'
  },
  {
    id: 'medscape',
    name: 'Medscape Medical News',
    url: 'https://www.medscape.com/rss/medicalNews.xml',
    enabled: false, // Disabled: returning 404
    category: 'Clinical Medicine'
  },
  // ===== TECHNOLOGY FEEDS =====
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    enabled: true,
    category: 'Tech Industry'
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    enabled: true,
    category: 'Technology'
  },
  {
    id: 'wired',
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    enabled: true,
    category: 'Tech & Culture'
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    enabled: true,
    category: 'Technology'
  },
  {
    id: 'mit-tech-review',
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    enabled: true,
    category: 'Tech Innovation'
  }
];

// Initialize database
async function initializeDb() {
  try {
    await fs.access(DB_FILE);
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Create new database with default structure
    const newDb = {
      feeds: DEFAULT_FEEDS.map(feed => ({
        ...feed,
        lastFetch: null,
        articleCount: 0,
        errors: []
      })),
      articles: [],
      scheduledPosts: [],
      automationConfig: {
        enabled: false,
        postingInterval: 6, // hours
        lastRun: null,
        nextRun: null
      }
    };
    await saveDb(newDb);
    return newDb;
  }
}

async function saveDb(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

async function getDb() {
  return await initializeDb();
}

// Fetch and parse a single RSS feed
export async function fetchFeed(feedId) {
  const db = await getDb();
  const feed = db.feeds.find(f => f.id === feedId);
  
  if (!feed) {
    throw new Error(`Feed not found: ${feedId}`);
  }

  if (!feed.enabled) {
    return { success: false, message: 'Feed is disabled' };
  }

  try {
    console.log(`Fetching feed: ${feed.name} (${feed.url})`);
    const rssFeed = await parser.parseURL(feed.url);
    
    const newArticles = [];
    const existingLinks = new Set(db.articles.map(a => a.link));

    for (const item of rssFeed.items) {
      // Skip if already processed
      if (existingLinks.has(item.link)) {
        continue;
      }

      const article = {
        id: `${feedId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        feedId: feed.id,
        feedName: feed.name,
        category: feed.category,
        title: item.title || '',
        description: item.contentSnippet || item.description || item.content || '',
        link: item.link || '',
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        processed: false,
        createdAt: new Date().toISOString()
      };

      newArticles.push(article);
      db.articles.push(article);
    }

    // Update feed metadata
    const feedIndex = db.feeds.findIndex(f => f.id === feedId);
    db.feeds[feedIndex].lastFetch = new Date().toISOString();
    db.feeds[feedIndex].articleCount = db.articles.filter(a => a.feedId === feedId).length;
    db.feeds[feedIndex].errors = [];

    await saveDb(db);

    console.log(`✅ Fetched ${newArticles.length} new articles from ${feed.name}`);
    return { 
      success: true, 
      newArticles: newArticles.length,
      totalArticles: db.feeds[feedIndex].articleCount 
    };

  } catch (error) {
    console.error(`❌ Error fetching feed ${feed.name}:`, error.message);
    
    // Log error in feed metadata
    const feedIndex = db.feeds.findIndex(f => f.id === feedId);
    db.feeds[feedIndex].errors.push({
      message: error.message,
      timestamp: new Date().toISOString()
    });
    await saveDb(db);

    return { success: false, error: error.message };
  }
}

// Fetch all enabled feeds
export async function fetchAllFeeds() {
  const db = await getDb();
  const enabledFeeds = db.feeds.filter(f => f.enabled);
  
  console.log(`\n🔄 Fetching ${enabledFeeds.length} RSS feeds...`);
  
  const results = [];
  for (const feed of enabledFeeds) {
    const result = await fetchFeed(feed.id);
    results.push({ feedId: feed.id, feedName: feed.name, ...result });
    // Small delay to avoid overwhelming servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const totalNew = results.reduce((sum, r) => sum + (r.newArticles || 0), 0);
  console.log(`\n✅ Feed refresh complete: ${totalNew} new articles\n`);

  return results;
}

// Get unprocessed articles for post generation
export async function getUnprocessedArticles(limit = 10) {
  const db = await getDb();
  return db.articles
    .filter(a => !a.processed)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, limit);
}

// Mark article as processed
export async function markArticleProcessed(articleId) {
  const db = await getDb();
  const article = db.articles.find(a => a.id === articleId);
  if (article) {
    article.processed = true;
    await saveDb(db);
  }
}

// Get all feeds
export async function getAllFeeds() {
  const db = await getDb();
  return db.feeds;
}

// Add a new feed
export async function addFeed(feedData) {
  const db = await getDb();
  const newFeed = {
    id: `custom-${Date.now()}`,
    name: feedData.name,
    url: feedData.url,
    enabled: true,
    category: feedData.category || 'Custom',
    lastFetch: null,
    articleCount: 0,
    errors: []
  };
  db.feeds.push(newFeed);
  await saveDb(db);
  return newFeed;
}

// Remove a feed
export async function removeFeed(feedId) {
  const db = await getDb();
  db.feeds = db.feeds.filter(f => f.id !== feedId);
  await saveDb(db);
}

// Toggle feed enabled status
export async function toggleFeed(feedId, enabled) {
  const db = await getDb();
  const feed = db.feeds.find(f => f.id === feedId);
  if (feed) {
    feed.enabled = enabled;
    await saveDb(db);
  }
}

export { getDb, saveDb };
