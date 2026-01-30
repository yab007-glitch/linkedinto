import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const DB_PATH = path.join(process.cwd(), 'automation-db.json');

// Interface for Settings
interface AutomationSettings {
  isEnabled: boolean;
  frequency: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  topics: string[];
  tone: string;
  smartTimezone: string;
  lastPosted?: string;
  customIntervalEnabled?: boolean;
  customIntervalMins?: number;
}

// Helper to clean and parse JSON from LLM response
function parseLLMJson(text: string) {
  try {
    let json = text;
    if (text.includes('```json')) {
      json = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (text.includes('```')) {
      json = text.replace(/```\n?/g, '');
    }
    
    // Determine if it's an object or array based on what comes first
    const firstBrace = json.indexOf('{');
    const firstBracket = json.indexOf('[');
    
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      // It's an array
      const lastBracket = json.lastIndexOf(']');
      if (lastBracket !== -1) {
        json = json.substring(firstBracket, lastBracket + 1);
      }
    } else if (firstBrace !== -1) {
      // It's an object
      const lastBrace = json.lastIndexOf('}');
      if (lastBrace !== -1) {
        json = json.substring(firstBrace, lastBrace + 1);
      }
    }
    
    return JSON.parse(json);
  } catch (e) {
    console.error('JSON Parse Error:', e);
    return null;
  }
}

// Helper to read DB
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

// Helper to write DB (needed for updating lastPosted)
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing DB:', error);
    return false;
  }
}

/**
 * Smart Scheduling Logic
 * Returns true if we should post right now
 */
function shouldPost(settings: AutomationSettings): boolean {
  if (!settings.isEnabled) return false;

  const now = new Date();
  // Convert to target timezone
  const targetTime = new Date(now.toLocaleString('en-US', { timeZone: settings.smartTimezone }));
  // Custom Interval Logic
  if (settings.customIntervalEnabled && settings.customIntervalMins) {
    if (!settings.lastPosted) return true; // First post immediately
    
    const lastPostedDate = new Date(settings.lastPosted);
    const diffMs = now.getTime() - lastPostedDate.getTime();
    const diffMins = diffMs / (1000 * 60);
    
    // Check if enough time has passed (allow 5 min buffer for cron drift)
    return diffMins >= (settings.customIntervalMins - 5);
  }

  // Standard Logic
  const hour = targetTime.getHours();
  const day = targetTime.getDay(); // 0 = Sun, 6 = Sat

  // Weekend logic: Only HIGH frequency posts on weekends
  const isWeekend = day === 0 || day === 6;
  if (isWeekend && settings.frequency !== 'HIGH') return false;

  // Posting slots (Hours in 24h format)
  // LOW: 9 AM
  // MEDIUM: 9 AM, 5 PM (17)
  // HIGH: 9 AM, 1 PM (13), 5 PM (17)
  // ULTRA: 8 AM, 11 AM, 2 PM, 6 PM
  
  const slots: number[] = [];
  if (settings.frequency === 'LOW') {
    slots.push(9);
  } else if (settings.frequency === 'MEDIUM') {
    slots.push(9, 17);
  } else if (settings.frequency === 'HIGH') {
    slots.push(9, 13, 17);
  } else if (settings.frequency === 'ULTRA') {
    slots.push(8, 11, 14, 18);
  }

  // We check if current hour is in the slot key
  // We add a 'processed' check ideally, but for now we rely on the cron running once per hour
  // To correspond to GitHub Actions randomness, we accept the window.
  return slots.includes(hour);
}

/**
 * Check if we already posted in this slot to prevent duplicates
 */
function alreadyPostedThisHour(settings: AutomationSettings): boolean {
  if (!settings.lastPosted) return false;
  
  const lastPostedDate = new Date(settings.lastPosted);
  const now = new Date();
  
  // Check if last posted was within the last 50 minutes (approx an hour window)
  // Or use custom interval window if enabled (allow small buffer)
  const diffMs = now.getTime() - lastPostedDate.getTime();
  const diffMins = diffMs / (1000 * 60);
  
  if (settings.customIntervalEnabled && settings.customIntervalMins) {
    return diffMins < (settings.customIntervalMins - 5);
  }
  
  return diffMins < 50;
}

/**
 * POST /api/cron/process - Triggered by GitHub Actions
 */
export async function POST(request: NextRequest) {
  // Security check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = readDb();
  if (!db || !db.automationSettings) {
    return NextResponse.json({ message: 'No settings found' });
  }

  const settings = db.automationSettings as AutomationSettings;

  // 1. Check Schedule
  if (!shouldPost(settings)) {
    return NextResponse.json({ 
      message: 'Skipped: Not the right time or disabled', 
      settings,
      currentTime: new Date().toLocaleString('en-US', { timeZone: settings.smartTimezone }) 
    });
  }
  // 1.5 Debounce check
  if (alreadyPostedThisHour(settings)) {
    return NextResponse.json({
      message: 'Skipped: Already posted recently',
      lastPosted: settings.lastPosted
    });
  }

  // 2. Generate Content
  try {
    const openai = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1/',
      apiKey: process.env.HUGGINGFACE_API_KEY
    });
    
    // Topic Discovery
    const topicsResponse = await openai.chat.completions.create({
      model: 'zai-org/GLM-4.7:novita',
      messages: [
        {
          role: 'system',
          content: 'You are a LinkedIn strategist. Generate 1 trending topic.'
        },
        {
          role: 'user',
          content: `Generate 1 trending LinkedIn topic about: ${settings.topics.join(', ') || 'Tech, Business, Leadership'}.
          Return JSON: {"topic": "...", "hook": "..."}`
        }
      ],
      temperature: 0.9,
    });
    const topicData = parseLLMJson(topicsResponse.choices[0].message.content || '{}') || { topic: 'Tech Trends', hook: 'Here is a new trend.' };

    // Post Generation
    const postResponse = await openai.chat.completions.create({
       model: 'zai-org/GLM-4.7:novita',
       messages: [
         {
           role: 'system',
           content: `Create a ${settings.tone} LinkedIn post.`
         },
         {
           role: 'user',
           content: `Topic: ${topicData.topic}
           Hook: ${topicData.hook}
           Write a generic viral professional post.
           Return JSON: {"content": "...", "hashtags": [...]}`
         }
       ]
    });
    const post = parseLLMJson(postResponse.choices[0].message.content || '{}');
    
    if (!post || !post.content) {
      throw new Error('Failed to generate valid post content');
    }
    
    // 3. Post to LinkedIn (Simulated or Real)
    // We assume access token availability
    if (process.env.LINKEDIN_ACCESS_TOKEN) {
        const axios = (await import('axios')).default;
        const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
             headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}` },
        });
        const linkedInId = profileRes.data.sub;
        const fullContent = post.content + '\n\n' + post.hashtags.map((h: string) => `#${h}`).join(' ');

        await axios.post(
            'https://api.linkedin.com/v2/ugcPosts',
            {
                author: `urn:li:person:${linkedInId}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: fullContent },
                    shareMediaCategory: 'NONE',
                },
                },
                visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
            },
            {
                headers: {
                Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                },
            }
        );
    }

    // 4. Update DB
    db.automationSettings.lastPosted = new Date().toISOString();
    writeDb(db);

    return NextResponse.json({ success: true, message: 'Autonomously posted!', topic: topicData.topic });

  } catch (error: unknown) {
    console.error('Cron job failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
