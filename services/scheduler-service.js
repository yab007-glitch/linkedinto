import cron from 'node-cron';
import { fetchAllFeeds, getUnprocessedArticles, markArticleProcessed } from './rss-service.js';
import { 
  createScheduledPost, 
  calculateNextPostTime, 
  getAutomationConfig, 
  updateAutomationConfig,
  getReadyPosts,
  markPostAsPosted,
  markPostAsFailed,
  approvePost
} from './post-queue-service.js';
import { scorePost, getQualityGrade } from './quality-scorer.js';
import { 
  sendPostPublishedNotification,
  sendGenerationFailureAlert,
  sendFeedErrorAlert,
  sendQualityScoreAlert,
  initializeEmailService
} from './email-service.js';
import { InferenceClient } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const HF_TOKEN = process.env.VITE_HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY;
const hf = new InferenceClient(HF_TOKEN);

// System instruction for generating LinkedIn posts from articles
const SYSTEM_INSTRUCTION = `
You are a world-class LinkedIn ghostwriter specializing in healthcare and medical content.

Your goal is to transform healthcare news articles into engaging LinkedIn posts that:
1. Start with a compelling hook that grabs attention
2. Provide valuable insights or takeaways
3. Use clear, professional language
4. Include relevant context and implications
5. End with a thought-provoking question or call-to-action

Formatting Rules:
- Keep paragraphs short (1-3 sentences)
- Use line breaks for readability
- Add 1-2 relevant emojis (tastefully)
- Include 3-5 relevant hashtags at the end
- Aim for 150-250 words
- NO markdown headers (# or ##)
- Return ONLY the post text
`;

// Generate LinkedIn post from article
async function generatePostFromArticle(article) {
  try {
    const userPrompt = `
Transform this healthcare news article into an engaging LinkedIn post:

Title: ${article.title}
Source: ${article.feedName}
Category: ${article.category}
Summary: ${article.description.substring(0, 500)}...

Create a post that:
- Highlights the key insight or development
- Explains why it matters to healthcare professionals
- Includes a call-to-action or discussion prompt
- Uses appropriate hashtags for ${article.category}
    `;

    console.log(`🤖 Generating post for: "${article.title.substring(0, 50)}..."`);

    const chatCompletion = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.7
    });

    if (chatCompletion.choices && chatCompletion.choices.length > 0) {
      const content = chatCompletion.choices[0].message.content;
      console.log(`✅ Generated post (${content.length} chars)`);
      return content;
    } else {
      throw new Error("No content generated");
    }

  } catch (error) {
    console.error("❌ Error generating post:", error.message);
    throw error;
  }
}

// Main automation job - runs every 6 hours
async function runPostGenerationJob() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 RUNNING POST GENERATION JOB');
  console.log('='.repeat(60));

  const config = await getAutomationConfig();
  
  if (!config.enabled) {
    console.log('⏸️  Automation is disabled. Skipping...');
    return;
  }

  try {
    // Get unprocessed articles
    const articles = await getUnprocessedArticles(5);
    
    if (articles.length === 0) {
      console.log('📭 No unprocessed articles available.');
      return;
    }

    // Select the most recent article
    const article = articles[0];
    console.log(`\n📰 Selected article: "${article.title}"`);
    console.log(`   Source: ${article.feedName}`);
    console.log(`   Published: ${new Date(article.pubDate).toLocaleString()}`);

    // Generate LinkedIn post
    let content = await generatePostFromArticle(article);

    // Quality check
    console.log('\n🔍 Checking post quality...');
    let qualityScore = scorePost(content);
    const grade = getQualityGrade(qualityScore.totalScore);
    console.log(`📊 Quality Score: ${qualityScore.totalScore}/100 (${grade.grade} - ${grade.label})`);

    // If quality is below threshold, try to regenerate with improvements
    const MIN_QUALITY_SCORE = parseInt(process.env.MIN_QUALITY_SCORE) || 70;
    if (!qualityScore.passed && qualityScore.totalScore < MIN_QUALITY_SCORE) {
      console.log(`⚠️  Quality below threshold (${MIN_QUALITY_SCORE}). Regenerating with improvements...`);
      
      // Add improvement instructions to the prompt
      const improvements = qualityScore.suggestions.join('\n- ');
      const improvedPrompt = `
Transform this healthcare news article into an engaging LinkedIn post:

Title: ${article.title}
Source: ${article.feedName}
Category: ${article.category}
Summary: ${article.description.substring(0, 500)}...

IMPORTANT IMPROVEMENTS NEEDED:
- ${improvements}

Create a post that:
- Highlights the key insight or development
- Explains why it matters to healthcare professionals
- Includes a call-to-action or discussion prompt
- Uses appropriate hashtags for ${article.category}
      `;

      try {
        const chatCompletion = await hf.chatCompletion({
          model: "Qwen/Qwen2.5-7B-Instruct",
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: improvedPrompt }
          ],
          max_tokens: 800,
          temperature: 0.7
        });

        if (chatCompletion.choices && chatCompletion.choices.length > 0) {
          content = chatCompletion.choices[0].message.content;
          qualityScore = scorePost(content);
          console.log(`✅ Regenerated. New score: ${qualityScore.totalScore}/100`);
        }
      } catch (error) {
        console.error('⚠️  Regeneration failed, using original:', error.message);
      }
    }

    // Calculate next posting time
    const scheduledFor = calculateNextPostTime(config.postingInterval);

    // Create scheduled post
    const post = await createScheduledPost(article.id, content, scheduledFor);

    // Auto-approve if quality is good
    if (qualityScore.totalScore >= 80) {
      await approvePost(post.id);
      console.log('✅ Auto-approved (high quality score)');
    }

    // Send quality score notification
    try {
      await sendQualityScoreAlert(post, qualityScore);
    } catch (error) {
      console.log('⚠️  Email notification failed:', error.message);
    }

    // Mark article as processed
    await markArticleProcessed(article.id);

    // Update automation config
    await updateAutomationConfig({
      lastRun: new Date().toISOString(),
      nextRun: calculateNextPostTime(config.postingInterval)
    });

    console.log(`\n✅ Post scheduled for: ${new Date(scheduledFor).toLocaleString()}`);
    console.log(`📊 Post ID: ${post.id}`);
    console.log(`🎯 Quality: ${qualityScore.totalScore}/100 (${grade.label})`);

  } catch (error) {
    console.error('\n❌ Job failed:', error.message);
    
    // Send failure notification
    try {
      const article = articles && articles.length > 0 ? articles[0] : null;
      await sendGenerationFailureAlert(error, article);
    } catch (emailError) {
      console.log('⚠️  Email notification failed:', emailError.message);
    }
  }

  console.log('='.repeat(60) + '\n');
}

// Feed refresh job - runs every 2 hours
async function runFeedRefreshJob() {
  console.log('\n📡 Refreshing RSS feeds...');
  try {
    await fetchAllFeeds();
  } catch (error) {
    console.error('❌ Feed refresh failed:', error.message);
  }
}

// Publishing job - checks for approved posts ready to publish
async function runPublishingJob() {
  const readyPosts = await getReadyPosts();
  
  if (readyPosts.length === 0) {
    return;
  }

  console.log(`\n📤 Found ${readyPosts.length} post(s) ready to publish`);

  for (const post of readyPosts) {
    try {
      console.log(`Publishing post: ${post.id}`);
      
      // Mark as posted (LinkedIn integration would go here)
      // TODO: Integrate with LinkedIn API when OAuth tokens are available
      // const linkedInPostId = await postToLinkedIn(post.content, userId);
      
      const linkedInPostId = null; // Placeholder
      await markPostAsPosted(post.id, linkedInPostId);
      console.log(`✅ Published post: ${post.id}`);
      
      // Send success notification
      try {
        const linkedInUrl = linkedInPostId 
          ? `https://www.linkedin.com/feed/update/${linkedInPostId}`
          : null;
        await sendPostPublishedNotification(post, linkedInUrl);
      } catch (emailError) {
        console.log('⚠️  Email notification failed:', emailError.message);
      }
      
    } catch (error) {
      console.error(`❌ Failed to publish post ${post.id}:`, error.message);
      await markPostAsFailed(post.id, error.message);
    }
  }
}

// Initialize scheduler
export async function initializeScheduler() {
  console.log('\n🕐 Initializing automation scheduler...');

  // Initialize email service
  await initializeEmailService();

  // Post generation job - every 6 hours (at 12am, 6am, 12pm, 6pm)
  cron.schedule('0 */6 * * *', async () => {
    await runPostGenerationJob();
  });
  console.log('✅ Post generation job scheduled (every 6 hours)');

  // Feed refresh job - every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    await runFeedRefreshJob();
  });
  console.log('✅ Feed refresh job scheduled (every 2 hours)');

  // Publishing check - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await runPublishingJob();
  });
  console.log('✅ Publishing job scheduled (every 30 minutes)');

  console.log('🎉 Scheduler initialized successfully!\n');
}

// Manual trigger functions (for testing and API endpoints)
export async function manualGeneratePost() {
  return await runPostGenerationJob();
}

export async function manualRefreshFeeds() {
  return await runFeedRefreshJob();
}

export async function manualPublishPosts() {
  return await runPublishingJob();
}
