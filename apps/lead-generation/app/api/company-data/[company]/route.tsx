import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { company: string } }
) {
  try {
    const company = params.company;
    
    // Get company data from Redis
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
    
    const companyData = await redis.get(`company:${company}`);
    
    if (!companyData) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
    
    // Parse the JSON data
    let parsedData;
    try {
      parsedData = typeof companyData === 'string' ? JSON.parse(companyData) : companyData;
    } catch (error) {
      // Handle legacy format (just assistant ID)
      parsedData = {
        assistantId: companyData,
        industry: 'business-services'
      };
    }
    
    return NextResponse.json(parsedData);
    
  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    );
  }
}