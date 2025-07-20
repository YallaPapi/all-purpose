import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Store assistant ID for a company slug
export async function POST(request: NextRequest) {
  try {
    const { companySlug, assistantId } = await request.json();
    
    if (!companySlug || !assistantId) {
      return NextResponse.json(
        { error: 'Company slug and assistant ID are required' },
        { status: 400 }
      );
    }

    // Store in Upstash Redis database
    await redis.set(`company:${companySlug}`, assistantId);
    
    console.log(`Stored assistant ${assistantId} for company ${companySlug} in Redis`);
    
    return NextResponse.json({
      success: true,
      message: `Assistant ${assistantId} stored for company ${companySlug}`
    });
  } catch (error) {
    console.error('Error storing company assistant in Redis:', error);
    return NextResponse.json(
      { error: 'Failed to store assistant mapping' },
      { status: 500 }
    );
  }
}

// Get assistant ID for a company slug
export async function GET(request: NextRequest) {
  try {
    const companySlug = request.nextUrl.searchParams.get('company');
    
    if (!companySlug) {
      return NextResponse.json(
        { error: 'Company slug is required' },
        { status: 400 }
      );
    }

    // Retrieve from Upstash Redis database
    const assistantId = await redis.get(`company:${companySlug}`);
    
    if (!assistantId) {
      console.log(`No assistant found for company: ${companySlug}`);
      return NextResponse.json(
        { error: 'No assistant found for this company' },
        { status: 404 }
      );
    }

    console.log(`Found assistant ${assistantId} for company ${companySlug} in Redis`);

    return NextResponse.json({
      success: true,
      assistantId,
      companySlug
    });
  } catch (error) {
    console.error('Error retrieving company assistant from Redis:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve assistant mapping' },
      { status: 500 }
    );
  }
}