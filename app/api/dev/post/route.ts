import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * POST /api/dev/post - Post to LinkedIn using access token (dev mode)
 */
export async function POST(request: NextRequest) {
  if (process.env.DEV_MODE !== 'true') {
    return NextResponse.json({ error: 'Dev mode not enabled' }, { status: 403 });
  }

  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'LINKEDIN_ACCESS_TOKEN not configured' },
      { status: 500 }
    );
  }

  try {
    const { content, visibility = 'PUBLIC' } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // First, get the user's LinkedIn ID
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const linkedInId = profileRes.data.sub;

    // Create the post using UGC Posts API
    const postPayload = {
      author: `urn:li:person:${linkedInId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    const postRes = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      postPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    const postId = postRes.headers['x-restli-id'] || postRes.data.id;

    return NextResponse.json({
      success: true,
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
    });
  } catch (error) {
    console.error('LinkedIn post error:', error);

    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      console.error('LinkedIn API error details:', data);
      return NextResponse.json(
        { error: data?.message || 'Failed to post to LinkedIn', details: data },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to post to LinkedIn' },
      { status: 500 }
    );
  }
}
