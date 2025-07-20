import { NextRequest } from 'next/server';

/**
 * Detect the current domain from request headers and environment variables
 * For production, always use solarbookers.com to ensure n8n gets production URLs
 */
export function detectDomain(request: NextRequest, fallbackDomain?: string): string {
  // For production API calls (like from n8n), always use the production domain
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return 'solarbookers.com';
  }
  
  // For development/preview environments, use Vercel detection
  const domain = request.headers.get('x-vercel-deployment-url') ||
                request.headers.get('x-vercel-forwarded-host') ||
                request.headers.get('x-forwarded-host') ||
                request.headers.get('host') ||
                process.env.VERCEL_URL ||
                process.env.VERCEL_BRANCH_URL ||
                fallbackDomain ||
                'solarbookers.com';
  
  return domain;
}

/**
 * Generate a full URL with the correct protocol and domain
 */
export function generateFullUrl(request: NextRequest, path: string, fallbackDomain?: string): string {
  const domain = detectDomain(request, fallbackDomain);
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${protocol}://${domain}${cleanPath}`;
}

/**
 * Get the current domain with protocol
 */
export function getCurrentDomain(request: NextRequest, fallbackDomain?: string): string {
  const domain = detectDomain(request, fallbackDomain);
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  
  return `${protocol}://${domain}`;
}

/**
 * Check if the current deployment is a Vercel preview
 */
export function isVercelPreview(request: NextRequest): boolean {
  return !!(request.headers.get('x-vercel-deployment-url') || 
           process.env.VERCEL_URL?.includes('vercel.app'));
}

/**
 * Log domain detection information for debugging
 */
export function logDomainDetection(request: NextRequest, context: string): void {
  console.log(`[${context}] Domain Detection:`, {
    detectedDomain: detectDomain(request),
    isPreview: isVercelPreview(request),
    headers: {
      host: request.headers.get('host'),
      'x-vercel-deployment-url': request.headers.get('x-vercel-deployment-url'),
      'x-vercel-forwarded-host': request.headers.get('x-vercel-forwarded-host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    },
    env: {
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV,
    }
  });
} 