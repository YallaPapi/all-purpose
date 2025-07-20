import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const headers = {
    host: request.headers.get('host'),
    'x-forwarded-host': request.headers.get('x-forwarded-host'),
    'x-vercel-forwarded-host': request.headers.get('x-vercel-forwarded-host'),
    'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    'x-vercel-deployment-url': request.headers.get('x-vercel-deployment-url'),
    'x-vercel-url': request.headers.get('x-vercel-url'),
  };

  const envVars = {
    VERCEL: process.env.VERCEL,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    VERCEL_DEPLOYMENT_URL: process.env.VERCEL_DEPLOYMENT_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Smart domain detection logic
  const detectedDomain = request.headers.get('x-vercel-deployment-url') ||
                        request.headers.get('x-vercel-forwarded-host') ||
                        request.headers.get('x-forwarded-host') ||
                        request.headers.get('host') ||
                        process.env.VERCEL_URL ||
                        'localhost:3000';

  const protocol = detectedDomain.includes('localhost') ? 'http' : 'https';
  const fullUrl = `${protocol}://${detectedDomain}`;

  return NextResponse.json({
    detectedDomain,
    fullUrl,
    protocol,
    headers,
    envVars,
    timestamp: new Date().toISOString()
  });
} 