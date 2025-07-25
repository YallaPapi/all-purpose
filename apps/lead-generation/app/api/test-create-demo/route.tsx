import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return POST(request); // Reuse the POST logic for GET testing
}

export async function POST(request: NextRequest) {
  try {
    // Use the new domain detection utility
    const { getCurrentDomain, detectDomain } = await import('../../../lib/domain-utils');
    
    const currentDomain = getCurrentDomain(request);
    const host = detectDomain(request);
    
    console.log('Test demo creation with domain:', currentDomain);
    
    // Call the create-prototype endpoint with the correct domain
    const response = await fetch(`${currentDomain}/api/create-prototype`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Test Solar Company',
        contactName: 'John Doe',
        contactEmail: 'john@testcompany.com',
        location: 'Austin, TX',
        domain: host, // Pass the current domain explicitly
      }),
    });

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test demo created successfully',
      currentDomain,
      detectedHost: host,
      result: data
    });

  } catch (error) {
    console.error('Test demo creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create test demo', details: error },
      { status: 500 }
    );
  }
} 