import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Create email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER;
const FROM_EMAIL = process.env.EMAIL_USER;

// Verify transporter configuration
async function verifyEmailConfig() {
  if (!FROM_EMAIL || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email notifications disabled: EMAIL_USER or EMAIL_PASSWORD not configured');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Email service configured and ready');
    return true;
  } catch (error) {
    console.warn('⚠️  Email service verification failed:', error.message);
    return false;
  }
}

// Send email helper
async function sendEmail(subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"LinkedInto Automation" <${FROM_EMAIL}>`,
      to: NOTIFICATION_EMAIL,
      subject,
      html
    });
    console.log(`📧 Email sent: ${subject}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email: ${subject}`, error.message);
    throw error;
  }
}

// Notify when a post is successfully published
export async function sendPostPublishedNotification(post, linkedInUrl) {
  const subject = '✅ LinkedIn Post Published Successfully';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077b5;">🎉 Post Published!</h2>
      
      <p>Your automated LinkedIn post has been successfully published.</p>
      
      <div style="background: #f3f2ef; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Post Preview:</h3>
        <p style="white-space: pre-wrap;">${post.content.substring(0, 300)}${post.content.length > 300 ? '...' : ''}</p>
      </div>
      
      <div style="margin: 20px 0;">
        <strong>Scheduled For:</strong> ${new Date(post.scheduledFor).toLocaleString()}<br>
        <strong>Posted At:</strong> ${new Date(post.postedAt).toLocaleString()}<br>
        <strong>Post ID:</strong> ${post.id}
      </div>
      
      ${linkedInUrl ? `
        <a href="${linkedInUrl}" 
           style="display: inline-block; background: #0077b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          View on LinkedIn
        </a>
      ` : ''}
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LinkedInto Automation System.
      </p>
    </div>
  `;
  
  return await sendEmail(subject, html);
}

// Alert on post generation failure
export async function sendGenerationFailureAlert(error, article) {
  const subject = '❌ Post Generation Failed';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">⚠️ Generation Failure</h2>
      
      <p>Failed to generate LinkedIn post from article.</p>
      
      <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
        <h3 style="margin-top: 0; color: #d32f2f;">Error Details:</h3>
        <p><strong>Message:</strong> ${error.message || 'Unknown error'}</p>
        ${error.stack ? `<pre style="font-size: 11px; overflow-x: auto;">${error.stack.substring(0, 500)}</pre>` : ''}
      </div>
      
      ${article ? `
        <div style="background: #f3f2ef; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Article Details:</h3>
          <p><strong>Title:</strong> ${article.title}</p>
          <p><strong>Source:</strong> ${article.feedName}</p>
          <p><strong>Category:</strong> ${article.category}</p>
          <p><strong>Link:</strong> <a href="${article.link}">${article.link}</a></p>
        </div>
      ` : ''}
      
      <p style="margin-top: 30px;">
        <strong>Action Required:</strong> Check the automation system logs and retry generation manually if needed.
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This is an automated alert from LinkedInto Automation System.
      </p>
    </div>
  `;
  
  return await sendEmail(subject, html);
}

// Send daily summary of automation activity
export async function sendDailySummary(stats) {
  const subject = `📊 Daily Automation Summary - ${new Date().toLocaleDateString()}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077b5;">📊 Daily Summary</h2>
      
      <p>Here's your automation activity for today:</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #1976d2;">${stats.posted || 0}</div>
          <div style="color: #666;">Posts Published</div>
        </div>
        
        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #f57c00;">${stats.pending || 0}</div>
          <div style="color: #666;">Pending Approval</div>
        </div>
        
        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #7b1fa2;">${stats.unprocessedArticles || 0}</div>
          <div style="color: #666;">New Articles</div>
        </div>
        
        <div style="background: #ffebee; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #c62828;">${stats.failed || 0}</div>
          <div style="color: #666;">Failed</div>
        </div>
      </div>
      
      ${stats.nextPostTime ? `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Next Scheduled Post:</strong><br>
          ${new Date(stats.nextPostTime).toLocaleString()}<br>
          <small style="color: #666;">${stats.nextPostIn}</small>
        </div>
      ` : ''}
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This is an automated daily summary from LinkedInto Automation System.
      </p>
    </div>
  `;
  
  return await sendEmail(subject, html);
}

// Alert on RSS feed fetch errors
export async function sendFeedErrorAlert(feed, error) {
  const subject = `⚠️ RSS Feed Error: ${feed.name}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f57c00;">⚠️ Feed Fetch Error</h2>
      
      <p>Failed to fetch RSS feed: <strong>${feed.name}</strong></p>
      
      <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f57c00;">
        <h3 style="margin-top: 0; color: #f57c00;">Error Details:</h3>
        <p><strong>Message:</strong> ${error.message || 'Unknown error'}</p>
        <p><strong>Feed URL:</strong> <a href="${feed.url}">${feed.url}</a></p>
        <p><strong>Category:</strong> ${feed.category}</p>
      </div>
      
      <p><strong>Last Successful Fetch:</strong> ${feed.lastFetch ? new Date(feed.lastFetch).toLocaleString() : 'Never'}</p>
      
      <p style="margin-top: 30px;">
        <strong>Action Required:</strong> Check if the feed URL is still valid and accessible.
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This is an automated alert from LinkedInto Automation System.
      </p>
    </div>
  `;
  
  return await sendEmail(subject, html);
}

// Send quality score notification
export async function sendQualityScoreAlert(post, score) {
  const subject = score.passed 
    ? `✅ Post Quality Check Passed (${score.totalScore}/100)`
    : `⚠️ Post Quality Check Failed (${score.totalScore}/100)`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${score.passed ? '#4caf50' : '#f57c00'};">
        ${score.passed ? '✅' : '⚠️'} Quality Score: ${score.totalScore}/100
      </h2>
      
      <div style="background: #f3f2ef; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Score Breakdown:</h3>
        <ul style="list-style: none; padding: 0;">
          <li>📏 Length: ${score.breakdown.length}/20</li>
          <li>💬 Engagement: ${score.breakdown.engagement}/20</li>
          <li>📖 Readability: ${score.breakdown.readability}/20</li>
          <li>#️⃣ Hashtags: ${score.breakdown.hashtags}/15</li>
          <li>🎣 Hook: ${score.breakdown.hook}/15</li>
          <li>✍️ Tone: ${score.breakdown.tone}/10</li>
        </ul>
      </div>
      
      ${score.suggestions.length > 0 ? `
        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Suggestions for Improvement:</h3>
          <ul>
            ${score.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div style="background: #f3f2ef; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Post Preview:</h3>
        <p style="white-space: pre-wrap;">${post.content.substring(0, 300)}${post.content.length > 300 ? '...' : ''}</p>
      </div>
      
      <p style="margin-top: 30px;">
        ${score.passed 
          ? '<strong>Status:</strong> Post has been scheduled for publication.' 
          : '<strong>Status:</strong> Post will be regenerated with improvements.'}
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
      <p style="color: #666; font-size: 12px;">
        This is an automated notification from LinkedInto Automation System.
      </p>
    </div>
  `;
  
  return await sendEmail(subject, html);
}

// Initialize and verify email service
export async function initializeEmailService() {
  const isConfigured = await verifyEmailConfig();
  return isConfigured;
}
