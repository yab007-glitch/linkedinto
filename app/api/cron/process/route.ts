import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const DB_PATH = path.join(process.cwd(), 'automation-db.json');

// Interface for Settings
interface AutomationSettings {
  isEnabled: boolean;
  frequency: 'LOW' | 'MEDIUM' | 'HIGH';
  topics: string[];
  tone: string;
  smartTimezone: string;
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

/**
 * Smart Scheduling Logic
 * Returns true if we should post right now
 */
function shouldPost(settings: AutomationSettings): boolean {
  if (!settings.isEnabled) return false;

  const now = new Date();
  // Convert to target timezone
  const targetTime = new Date(now.toLocaleString('en-US', { timeZone: settings.smartTimezone }));
  const hour = targetTime.getHours();
  const day = targetTime.getDay(); // 0 = Sun, 6 = Sat

  // Weekend logic: Only HIGH frequency posts on weekends
  const isWeekend = day === 0 || day === 6;
  if (isWeekend && settings.frequency !== 'HIGH') return false;

  // Posting slots (Hours in 24h format)
  // LOW: 9 AM
  // MEDIUM: 9 AM, 5 PM (17)
  // HIGH: 9 AM, 1 PM (13), 5 PM (17)
  
  const slots: number[] = [];
  if (settings.frequency === 'LOW') {
    slots.push(9);
  } else if (settings.frequency === 'MEDIUM') {
    slots.push(9, 17);
  } else if (settings.frequency === 'HIGH') {
    slots.push(9, 13, 17);
  }

  // We check if current hour is in the slot key
  // We add a 'processed' check ideally, but for now we rely on the cron running once per hour
  // To correspond to GitHub Actions randomness, we accept the window.
  return slots.includes(hour);
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

  // 2. Generate Content
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Topic Discovery
    const topicsResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    const topicContent = topicsResponse.choices[0].message.content || '{}';
    const cleanTopicJson = topicContent.replace(/```json\n?|```/g, '').trim();
    const topicData = JSON.parse(cleanTopicJson);

    // Post Generation
    const postResponse = await openai.chat.completions.create({
       model: 'gpt-4o-mini',
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
    const postContent = postResponse.choices[0].message.content || '{}';
    const cleanPostJson = postContent.replace(/```json\n?|```/g, '').trim();
    const post = JSON.parse(cleanPostJson);
    
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

    return NextResponse.json({ success: true, message: 'Autonomously posted!', topic: topicData.topic });

  } catch (error: unknown) {
    console.error('Cron job failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
