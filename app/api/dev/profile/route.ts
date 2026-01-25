import { NextResponse } from 'next/server';
import axios from 'axios';

/**
 * GET /api/dev/profile - Get LinkedIn profile using access token
 */
export async function GET() {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'LINKEDIN_ACCESS_TOKEN not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('LinkedIn profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LinkedIn profile' },
      { status: 500 }
    );
  }
}
