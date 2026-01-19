import { PostConfig, LinkedInProfile } from '../types';

const API_BASE = '/api';

const SYSTEM_INSTRUCTION = `
You are a world-class LinkedIn ghostwriter and content strategist. You know exactly what makes a post go viral, drive engagement, and build personal brands.

Your goal is to write posts that:
1. Have a "Scroll-Stopping Hook" in the first 1-2 lines.
2. Use white space effectively (short paragraphs, single sentences).
3. Provide high value or emotional resonance.
4. Have a clear Call to Action (CTA) at the end.
5. Use emojis tastefully but not excessively (unless the tone is humorous).

Formatting Rules:
- No hashtags in the middle of sentences. Keep 3-5 relevant hashtags at the very bottom.
- Ensure the "See more" break is enticing (usually after line 3).
- Do not output markdown headers (like # or ##). Use bolding (Unicode bold if necessary or just caps for emphasis) sparingly. 
- Return ONLY the raw text of the post.
`;

export const generateLinkedInPost = async (config: PostConfig, authorProfile?: LinkedInProfile | null): Promise<string> => {
  try {
    let authorContext = "";
    if (authorProfile) {
      authorContext = `
      AUTHOR CONTEXT:
      Name: ${authorProfile.name}
      Professional Headline: ${authorProfile.headline}
      
      Instruction: Ensure the tone and content aligns with someone who has this professional background. 
      `;
    }

    const userPrompt = `
      Write a LinkedIn post with the following constraints:
      
      Topic: ${config.topic}
      Target Audience: ${config.targetAudience}
      Tone: ${config.tone}
      Format: ${config.format}
      Key Points to Include: ${config.keyPoints || "None specified, use your best judgment based on the topic."}
      
      ${authorContext}

      Remember to focus on the Hook!
    `;

    const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: SYSTEM_INSTRUCTION },
                { role: "user", content: userPrompt }
            ],
            model: "Qwen/Qwen2.5-7B-Instruct",
            max_tokens: 1024,
            temperature: 0.7,
            seed: 42
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
    }

    const data = await response.json();
    return data.content || "Failed to generate content.";

  } catch (error) {
    console.error("Error generating post:", error);
    throw error;
  }
};

export const refinePost = async (currentContent: string, instruction: string): Promise<string> => {
  try {
    const userPrompt = `
      Here is an existing LinkedIn post:
      ---
      ${currentContent}
      ---
      
      Please rewrite or modify it with this specific instruction: "${instruction}"
      Keep the same core message but apply the change.
    `;

    const response = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
             messages: [
                { role: "system", content: SYSTEM_INSTRUCTION },
                { role: "user", content: userPrompt }
            ],
            model: "Qwen/Qwen2.5-7B-Instruct",
            max_tokens: 1024,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        throw new Error("Failed to refine content");
    }

    const data = await response.json();
    return data.content || currentContent;

  } catch (error) {
    console.error("Error refining post:", error);
    throw error;
  }
};
