import axios, { AxiosError } from 'axios';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export interface LinkedInPostData {
  author: string; // URN format: urn:li:person:{id}
  text: string;
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN';
  mediaUrls?: string[];
}

export interface LinkedInPostResponse {
  id: string;
  url: string;
}

interface LinkedInProfile {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  profilePicture?: {
    displayImage: string;
  };
}

interface LinkedInError {
  message?: string;
  status?: number;
}

export class LinkedInClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  /**
   * Create a post on LinkedIn
   */
  async createPost(data: LinkedInPostData): Promise<LinkedInPostResponse> {
    try {
      const payload = {
        author: data.author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: data.text,
            },
            shareMediaCategory: data.mediaUrls && data.mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
            ...(data.mediaUrls && data.mediaUrls.length > 0 && {
              media: data.mediaUrls.map((url) => ({
                status: 'READY',
                media: url,
              })),
            }),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': data.visibility,
        },
      };

      const response = await axios.post(
        `${LINKEDIN_API_BASE}/ugcPosts`,
        payload,
        { headers: this.getHeaders() }
      );

      const postId = response.headers['x-restli-id'] || response.data.id;
      
      return {
        id: postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      const axiosError = error as AxiosError<LinkedInError>;
      console.error('LinkedIn API Error:', axiosError.response?.data || axiosError.message);
      throw new Error(
        axiosError.response?.data?.message || 
        'Failed to create LinkedIn post'
      );
    }
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<LinkedInProfile> {
    try {
      const response = await axios.get<LinkedInProfile>(
        `${LINKEDIN_API_BASE}/me`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<LinkedInError>;
      console.error('LinkedIn API Error:', axiosError.response?.data || axiosError.message);
      throw new Error('Failed to fetch LinkedIn profile');
    }
  }

  /**
   * Upload media to LinkedIn (for images/videos)
   */
  async uploadMedia(file: Buffer): Promise<string> {
    try {
      // Step 1: Register upload
      const registerResponse = await axios.post(
        `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: 'urn:li:person:CURRENT_USER',
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        },
        { headers: this.getHeaders() }
      );

      const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Step 2: Upload binary data
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      return asset;
    } catch (error) {
      const axiosError = error as AxiosError<LinkedInError>;
      console.error('LinkedIn Media Upload Error:', axiosError.response?.data || axiosError.message);
      throw new Error('Failed to upload media to LinkedIn');
    }
  }

  /**
   * Get post analytics/statistics
   */
  async getPostAnalytics(postUrn: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await axios.get(
        `${LINKEDIN_API_BASE}/socialActions/${encodeURIComponent(postUrn)}`,
        { headers: this.getHeaders() }
      );
      return response.data as Record<string, unknown>;
    } catch (error) {
      const axiosError = error as AxiosError<LinkedInError>;
      console.error('LinkedIn API Error:', axiosError.response?.data || axiosError.message);
      return null; // Analytics might not be immediately available
    }
  }
}