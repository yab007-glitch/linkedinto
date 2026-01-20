import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { InferenceClient } from "@huggingface/inference";
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import logger from './config/logger.js';
import DB_PATHS from './config/db-config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { healthCheck, liveness, readiness, metrics } from './middleware/healthCheck.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requestLogger, performanceMonitor } from './middleware/requestLogger.js';
import { sanitize } from './middleware/validation.js';
import {
  createABTest,
  getAllABTests,
  getABTestById,
  getActiveABTests,
  getTestResults,
  stopABTest,
  deleteABTest,
  getABTestSummary,
  updateTestMetrics
} from './services/ab-testing-service.js';
import {
  getAnalyticsSummary,
  getTopPerformingPosts,
  getTopPerformingTopics,
  getOptimalPostingTimes,
  generateAnalyticsReport,
  refreshAllAnalytics,
  getPostAnalytics
} from './services/analytics-service.js';
import {
  getScheduleConfig,
  updateScheduleConfig,
  getUpcomingScheduledTimes,
  validateCustomSchedule,
  applySchedulePreset,
  getScheduleStats,
  SCHEDULE_PRESETS
} from './services/custom-scheduling-service.js';
import {
  getScheduledPosts,
  getUpcomingPosts,
  approvePost,
  deleteScheduledPost,
  getQueueStats,
  toggleAutomation,
  getAutomationConfig,
  updateAutomationConfig
} from './services/post-queue-service.js';
import {
  fetchFeed,
  getAllFeeds,
  addFeed,
  removeFeed,
  toggleFeed
} from './services/rss-service.js';
import {
  initializeScheduler,
  manualGeneratePost,
  manualRefreshFeeds
} from './services/scheduler-service.js';
import {
  fillTemplate,
  saveCustomTemplate,
  getAllTemplatesWithCustom,
  deleteCustomTemplate,
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory
} from './services/template-service.js';

// Load env vars
dotenv.config(); // Loads .env by default
// Fallback for local development if .env.local is used
dotenv.config({ path: '.env.local' });


// app initialization
const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for containers behind reverse proxies (load balancers, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.linkedin.com", "https://api-inference.huggingface.co"],
      workerSrc: ["'self'", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compression middleware
app.use(compression());

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);
app.use(performanceMonitor);

// Input sanitization
app.use(sanitize);

// Health check endpoints (no rate limiting)
app.get('/health', healthCheck);
app.get('/health/live', liveness);
app.get('/health/ready', readiness);
app.get('/metrics', metrics);

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files in production
const distPath = path.join(__dirname, 'dist');
import { existsSync } from 'node:fs';
if (existsSync(distPath)) {
  // Serve static files from the dist folder
  app.use(express.static(distPath));
  
  // For SPA - serve index.html for all non-API routes
  // Note: Express 5 requires named parameters, so use {*splat} instead of *
  app.get('/{*splat}', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Development/API-only mode - show API info
  app.get('/', (_req, res) => {
    res.json({
      name: 'LinkedInto API',
      version: '1.0.0',
      description: 'AI-powered LinkedIn content automation with RSS feed integration',
      status: 'running',
      mode: 'api-only',
      note: 'Frontend not built. Run `npm run build` to build the frontend.',
      endpoints: {
        health: '/health',
        feeds: '/api/feeds',
        automation: '/api/automation/stats',
        posts: '/api/scheduled-posts',
        history: '/api/history'
      },
      documentation: 'https://github.com/yab007-glitch/linkedinto'
    });
  });
}

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Initialize HF Client
const HF_TOKEN = process.env.VITE_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

if (!HF_TOKEN) {
    logger.warn("Warning: HF_TOKEN/HUGGINGFACE_API_KEY not found in environment variables.");
}

const hf = new InferenceClient(HF_TOKEN);

// Database simulation (simple JSON file)
const DB_FILE = DB_PATHS.MAIN_DB;

const getDb = async () => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default structure
    if (error.code === 'ENOENT') {
      return { posts: [] };
    }
    throw error; // Re-throw other errors
  }
};

const saveDb = async (data) => {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
};

// --- API Routes ---

// 1. History Endpoints
app.get('/api/history', async (_req, res) => {
  try {
    const db = await getDb();
    // Sort by timestamp desc
    const sorted = db.posts.sort((a, b) => b.timestamp - a.timestamp);
    res.json(sorted);
  } catch (error) {
    logger.error("Failed to fetch history:", error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/history', async (req, res) => {
  try {
    const newPost = req.body;
    const db = await getDb();
    db.posts.push(newPost);
    await saveDb(db);
    res.status(201).json(newPost);
  } catch (error) {
    logger.error("Failed to save post:", error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// 2. Generation Endpoints (Backend Proxy)
app.post('/api/generate', async (req, res) => {
    try {
        const { model, messages, ...params } = req.body;
        
        logger.info("Generating with model:", model || "Qwen/Qwen2.5-7B-Instruct");

        const chatCompletion = await hf.chatCompletion({
            model: model || "Qwen/Qwen2.5-7B-Instruct",
            messages: messages,
            ...params
        });

        if (chatCompletion.choices && chatCompletion.choices.length > 0) {
             res.json({ content: chatCompletion.choices[0].message.content });
        } else {
             throw new Error("No content generated");
        }

    } catch (error) {
        logger.error("Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate content" });
    }
});

// 3. LinkedIn Proxy Endpoints
app.get('/api/linkedin/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  try {
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { 'Authorization': authHeader }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error("LinkedIn Proxy Error:", error);
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.post('/api/linkedin/post', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.text();
    
    // We try to parse JSON, if not return text
    let json;
    try {
        json = JSON.parse(data);
    } catch(_e) {
        json = { message: data };
    }

    res.status(response.status).json(json);
  } catch (error) {
    logger.error("LinkedIn Proxy Error:", error);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// 4. RSS Feed Automation Endpoints

// Get all RSS feeds
app.get('/api/feeds', async (_req, res) => {
  try {
    const feeds = await getAllFeeds();
    res.json(feeds);
  } catch (error) {
    logger.error("Failed to fetch feeds:", error);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
});

// Add a new feed
app.post('/api/feeds', async (req, res) => {
  try {
    const newFeed = await addFeed(req.body);
    res.status(201).json(newFeed);
  } catch (error) {
    logger.error("Failed to add feed:", error);
    res.status(500).json({ error: 'Failed to add feed' });
  }
});

// Delete a feed
app.delete('/api/feeds/:id', async (req, res) => {
  try {
    await removeFeed(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to remove feed:", error);
    res.status(500).json({ error: 'Failed to remove feed' });
  }
});

// Toggle feed enabled status
app.patch('/api/feeds/:id/toggle', async (req, res) => {
  try {
    await toggleFeed(req.params.id, req.body.enabled);
    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to toggle feed:", error);
    res.status(500).json({ error: 'Failed to toggle feed' });
  }
});

// Manually refresh a specific feed
app.post('/api/feeds/:id/refresh', async (req, res) => {
  try {
    const result = await fetchFeed(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error("Failed to refresh feed:", error);
    res.status(500).json({ error: 'Failed to refresh feed' });
  }
});

// Manually refresh all feeds
app.post('/api/feeds/refresh-all', async (_req, res) => {
  try {
    const results = await manualRefreshFeeds();
    res.json(results);
  } catch (error) {
    logger.error("Failed to refresh feeds:", error);
    res.status(500).json({ error: 'Failed to refresh feeds' });
  }
});

// Get all scheduled posts
app.get('/api/scheduled-posts', async (_req, res) => {
  try {
    const posts = await getScheduledPosts();
    res.json(posts);
  } catch (error) {
    logger.error("Failed to fetch scheduled posts:", error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// Get upcoming posts
app.get('/api/scheduled-posts/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const posts = await getUpcomingPosts(limit);
    res.json(posts);
  } catch (error) {
    logger.error("Failed to fetch upcoming posts:", error);
    res.status(500).json({ error: 'Failed to fetch upcoming posts' });
  }
});

// Approve a post
app.post('/api/scheduled-posts/:id/approve', async (req, res) => {
  try {
    const post = await approvePost(req.params.id);
    res.json(post);
  } catch (error) {
    logger.error("Failed to approve post:", error);
    res.status(500).json({ error: 'Failed to approve post' });
  }
});

// Delete a scheduled post
app.delete('/api/scheduled-posts/:id', async (req, res) => {
  try {
    await deleteScheduledPost(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete post:", error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get queue statistics
app.get('/api/automation/stats', async (_req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    logger.error("Failed to fetch stats:", error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get automation config
app.get('/api/automation/config', async (_req, res) => {
  try {
    const config = await getAutomationConfig();
    res.json(config);
  } catch (error) {
    logger.error("Failed to fetch config:", error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Toggle automation
app.post('/api/automation/toggle', async (req, res) => {
  try {
    const config = await toggleAutomation(req.body.enabled);
    res.json(config);
  } catch (error) {
    logger.error("Failed to toggle automation:", error);
    res.status(500).json({ error: 'Failed to toggle automation' });
  }
});

// Update automation config (including posting interval)
app.put('/api/automation/config', async (req, res) => {
  try {
    const { postingInterval, enabled } = req.body;
    const updates = {};
    
    if (postingInterval !== undefined) {
      // Validate interval (minimum 1 hour, maximum 24 hours)
      const interval = parseInt(postingInterval, 10);
      if (isNaN(interval) || interval < 1 || interval > 24) {
        return res.status(400).json({ error: 'Posting interval must be between 1 and 24 hours' });
      }
      updates.postingInterval = interval;
    }
    
    if (enabled !== undefined) {
      updates.enabled = enabled;
    }
    
    const config = await updateAutomationConfig(updates);
    res.json(config);
  } catch (error) {
    logger.error("Failed to update automation config:", error);
    res.status(500).json({ error: 'Failed to update automation config' });
  }
});

// Manually trigger post generation
app.post('/api/automation/generate-now', async (_req, res) => {
  try {
    await manualGeneratePost();
    res.json({ success: true, message: 'Post generation triggered' });
  } catch (error) {
    logger.error("Failed to generate post:", error);
    res.status(500).json({ error: 'Failed to generate post' });
  }
});

// 5. Analytics Endpoints

// Get analytics summary
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const summary = await getAnalyticsSummary(days);
    res.json(summary);
  } catch (error) {
    logger.error("Failed to fetch analytics summary:", error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

// Get top performing posts
app.get('/api/analytics/top-posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const metric = req.query.metric || 'engagementRate';
    const topPosts = await getTopPerformingPosts(limit, metric);
    res.json(topPosts);
  } catch (error) {
    logger.error("Failed to fetch top posts:", error);
    res.status(500).json({ error: 'Failed to fetch top posts' });
  }
});

// Get top performing topics
app.get('/api/analytics/top-topics', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const topics = await getTopPerformingTopics(limit);
    res.json(topics);
  } catch (error) {
    logger.error("Failed to fetch top topics:", error);
    res.status(500).json({ error: 'Failed to fetch top topics' });
  }
});

// Get optimal posting times
app.get('/api/analytics/optimal-times', async (_req, res) => {
  try {
    const optimalTimes = await getOptimalPostingTimes();
    res.json(optimalTimes);
  } catch (error) {
    logger.error("Failed to fetch optimal times:", error);
    res.status(500).json({ error: 'Failed to fetch optimal times' });
  }
});

// Get full analytics report
app.get('/api/analytics/report', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const report = await generateAnalyticsReport(days);
    res.json(report);
  } catch (error) {
    logger.error("Failed to generate report:", error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Refresh all analytics
app.post('/api/analytics/refresh', async (_req, res) => {
  try {
    const result = await refreshAllAnalytics();
    res.json(result);
  } catch (error) {
    logger.error("Failed to refresh analytics:", error);
    res.status(500).json({ error: 'Failed to refresh analytics' });
  }
});

// Get analytics for specific post
app.get('/api/analytics/post/:id', async (req, res) => {
  try {
    const analytics = await getPostAnalytics(req.params.id);
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics not found' });
    }
    res.json(analytics);
  } catch (error) {
    logger.error("Failed to fetch post analytics:", error);
    res.status(500).json({ error: 'Failed to fetch post analytics' });
  }
});

// 6. Custom Scheduling Endpoints

// Get schedule configuration
app.get('/api/schedule/config', async (_req, res) => {
  try {
    const config = await getScheduleConfig();
    res.json(config);
  } catch (error) {
    logger.error("Failed to fetch schedule config:", error);
    res.status(500).json({ error: 'Failed to fetch schedule config' });
  }
});

// Update schedule configuration
app.put('/api/schedule/config', async (req, res) => {
  try {
    const config = await updateScheduleConfig(req.body);
    res.json(config);
  } catch (error) {
    logger.error("Failed to update schedule config:", error);
    res.status(500).json({ error: 'Failed to update schedule config' });
  }
});

// Get upcoming scheduled times
app.get('/api/schedule/upcoming', async (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 10;
    const times = await getUpcomingScheduledTimes(count);
    res.json(times);
  } catch (error) {
    logger.error("Failed to fetch upcoming times:", error);
    res.status(500).json({ error: 'Failed to fetch upcoming times' });
  }
});

// Validate custom schedule
app.post('/api/schedule/validate', async (req, res) => {
  try {
    const validation = validateCustomSchedule(req.body.schedule);
    res.json(validation);
  } catch (error) {
    logger.error("Failed to validate schedule:", error);
    res.status(500).json({ error: 'Failed to validate schedule' });
  }
});

// Get schedule presets
app.get('/api/schedule/presets', async (_req, res) => {
  try {
    res.json(SCHEDULE_PRESETS);
  } catch (error) {
    logger.error("Failed to fetch presets:", error);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// 7. Template Endpoints

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const includeCustom = req.query.includeCustom === 'true';
    const templates = includeCustom 
      ? await getAllTemplatesWithCustom()
      : getAllTemplates();
    res.json(templates);
  } catch (error) {
    logger.error("Failed to fetch templates:", error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Get templates by category
app.get('/api/templates/category/:category', async (req, res) => {
  try {
    const templates = getTemplatesByCategory(req.params.category);
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Fill template with variables
app.post('/api/templates/:id/fill', async (req, res) => {
  try {
    const content = fillTemplate(req.params.id, req.body.variables);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save custom template
app.post('/api/templates/custom', async (req, res) => {
  try {
    const template = await saveCustomTemplate(req.body);
    res.status(201).json(template);
  } catch {
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Delete custom template
app.delete('/api/templates/custom/:id', async (req, res) => {
  try {
    await deleteCustomTemplate(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// 8. A/B Testing Endpoints

// Get all A/B tests
app.get('/api/ab-tests', async (_req, res) => {
  try {
    const tests = await getAllABTests();
    res.json(tests);
  } catch {
    res.status(500).json({ error: 'Failed to fetch A/B tests' });
  }
});

// Get A/B test by ID
app.get('/api/ab-tests/:id', async (req, res) => {
  try {
    const test = await getABTestById(req.params.id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Get active A/B tests
app.get('/api/ab-tests/status/active', async (_req, res) => {
  try {
    const tests = await getActiveABTests();
    res.json(tests);
  } catch {
    res.status(500).json({ error: 'Failed to fetch active tests' });
  }
});

// Create A/B test
app.post('/api/ab-tests', async (req, res) => {
  try {
    const test = await createABTest(req.body);
    res.status(201).json(test);
  } catch {
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// Get test results
app.get('/api/ab-tests/:id/results', async (req, res) => {
  try {
    const results = await getTestResults(req.params.id);
    res.json(results);
  } catch {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Update test metrics
app.post('/api/ab-tests/:id/update-metrics', async (req, res) => {
  try {
    const test = await updateTestMetrics(req.params.id);
    res.json(test);
  } catch {
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});

// Stop A/B test
app.post('/api/ab-tests/:id/stop', async (req, res) => {
  try {
    const test = await stopABTest(req.params.id);
    res.json(test);
  } catch {
    res.status(500).json({ error: 'Failed to stop test' });
  }
});

// Delete A/B test
app.delete('/api/ab-tests/:id', async (req, res) => {
  try {
    await deleteABTest(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

// Get A/B test summary
app.get('/api/ab-tests-summary', async (_req, res) => {
  try {
    const summary = await getABTestSummary();
    res.json(summary);
  } catch {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Apply schedule preset
app.post('/api/schedule/preset/:name', async (req, res) => {
  try {
    const config = await applySchedulePreset(req.params.name);
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to apply preset' });
  }
});

// Get schedule statistics
app.get('/api/schedule/stats', async (_req, res) => {
  try {
    const stats = await getScheduleStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch schedule stats' });
  }
});

// Initialize scheduler
logger.info('\n🚀 Starting automation services...');
initializeScheduler();

app.listen(PORT, () => {
  logger.info(`Backend server running at http://localhost:${PORT}`);
});

// 404 handler - must be after all routes
app.use(notFound);

// Error handler - must be last
app.use(errorHandler);
