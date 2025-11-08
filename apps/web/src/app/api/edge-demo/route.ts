import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Extract edge-specific headers
  const edgeRegion = request.headers.get('x-vercel-edge-region') || 'unknown';
  const edgeFunctionsRegion = request.headers.get('x-vercel-functions-region') || 'unknown';
  const deploymentUrl = request.headers.get('x-deployment-url') || 'unknown';
  const forwardedHost = request.headers.get('x-forwarded-host') || 'unknown';

  // Get client information
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   'unknown';

  // Get user agent and other client info
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';

  // Calculate processing time
  const processingTime = Date.now() - startTime;

  // Get geolocation info from IP (simplified)
  const country = request.headers.get('x-vercel-ip-country') || 'unknown';
  const city = request.headers.get('x-vercel-ip-city') || 'unknown';

  // Get request details
  const url = new URL(request.url);
  const method = request.method;
  const protocol = url.protocol;
  const pathname = url.pathname;
  const search = url.search;

  // Performance metrics
  const requestId = request.headers.get('x-vercel-id') || 'unknown';

  const response = {
    message: 'Hello from Vercel Edge Network! 🚀',
    timestamp: new Date().toISOString(),
    edge: {
      region: edgeRegion,
      functionsRegion: edgeFunctionsRegion,
      deploymentUrl,
      forwardedHost,
    },
    client: {
      ip: clientIP,
      country,
      city,
      userAgent: userAgent.substring(0, 100), // Truncate for privacy
      acceptLanguage,
    },
    request: {
      method,
      protocol,
      pathname,
      search,
      fullUrl: url.toString(),
      requestId,
    },
    performance: {
      processingTimeMs: processingTime,
      serverTimestamp: Date.now(),
    },
    explanation: {
      edgeRegion: 'This shows which Vercel Edge Network region served your request',
      lowLatency: 'Your request was processed close to your location for minimal delay',
      globalNetwork: 'Vercel has 100+ edge locations worldwide for fast content delivery',
      useCase: 'Perfect for serving images, APIs, and dynamic content globally'
    }
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}
