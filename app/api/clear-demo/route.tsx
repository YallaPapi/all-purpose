import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const { companySlug } = await request.json();
    
    if (!companySlug) {
      return NextResponse.json(
        { error: 'Company slug is required' },
        { status: 400 }
      );
    }

    const key = `company:${companySlug}`;
    
    // Check if key exists first
    const existingValue = await redis.get(key);
    
    if (!existingValue) {
      return NextResponse.json({
        success: false,
        message: `No demo found for ${companySlug}`,
        key
      });
    }

    // Delete the key
    await redis.del(key);
    
    console.log(`Successfully removed demo mapping for ${companySlug}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully removed demo mapping for ${companySlug}`,
      removedKey: key,
      removedValue: existingValue
    });

  } catch (error) {
    console.error('Error removing demo mapping:', error);
    return NextResponse.json(
      { error: 'Failed to remove demo mapping', details: error },
      { status: 500 }
    );
  }
} 