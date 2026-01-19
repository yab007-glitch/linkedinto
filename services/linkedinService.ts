import { LinkedInProfile } from '../types';

const STORAGE_KEY = 'linkedin_user_profile';
const TOKEN_KEY = 'linkedin_access_token';
const API_BASE = '/api';

export const getStoredProfile = (): LinkedInProfile | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Failed to load profile", e);
    return null;
  }
};

export const saveProfile = (profile: LinkedInProfile): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const clearProfile = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const saveAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getLinkedInShareUrl = (text: string): string => {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
};

export const fetchLinkedInProfile = async (accessToken: string): Promise<LinkedInProfile> => {
  try {
    const cleanToken = accessToken.trim();
    
    // Call our local backend proxy instead of CORS proxy
    const response = await fetch(`${API_BASE}/linkedin/me`, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401) {
        throw new Error("Invalid access token. Please check your token and try again.");
      }
      throw new Error(`LinkedIn API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    
    const name = data.name || (data.given_name ? `${data.given_name} ${data.family_name}` : "LinkedIn Member");
    const avatarUrl = data.picture || "";
    const id = data.sub;

    if (!id) {
        throw new Error("Could not retrieve user ID from LinkedIn response");
    }

    return {
      id,
      name,
      headline: "LinkedIn Professional",
      avatarUrl
    };
  } catch (error) {
    console.error("Error fetching LinkedIn profile:", error);
    throw error;
  }
};

export const postToLinkedIn = async (content: string, authorId: string): Promise<string> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token found. Please connect your profile again.");
  }

  const body = {
    "author": `urn:li:person:${authorId}`,
    "lifecycleState": "PUBLISHED",
    "specificContent": {
        "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {
                "text": content
            },
            "shareMediaCategory": "NONE"
        }
    },
    "visibility": {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  try {
    // Call our local backend proxy
    const response = await fetch(`${API_BASE}/linkedin/post`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        // Handle Duplicate Post (422 Unprocessable Entity)
        const isDuplicate = response.status === 422 && (
            data?.errorDetails?.inputErrors?.some((e: any) => e.code === 'DUPLICATE_POST') ||
            (data?.message && data.message.toLowerCase().includes('duplicate'))
        );

        if (isDuplicate) {
            console.warn("LinkedIn API reported duplicate content. Treating as success (idempotent).");
            const match = data?.message?.match(/urn:li:(share|ugcPost):[0-9]+/);
            if (match) return match[0];
            return "urn:li:share:duplicate_placeholder";
        }

        console.error("LinkedIn Post Error Response:", JSON.stringify(data));
        if (response.status === 403) {
            throw new Error("Permission denied. Ensure your token has 'w_member_social' scope.");
        }
        throw new Error(`Failed to post: ${response.status} ${data.message || 'Unknown error'}`);
    }

    return data.id; 
  } catch (error) {
    console.error("Error posting to LinkedIn:", error);
    throw error;
  }
};
