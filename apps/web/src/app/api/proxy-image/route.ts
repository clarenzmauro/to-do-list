import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Simple rate limiting for proxy endpoint (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);

  // Periodic cleanup: remove expired entries (run ~1% of the time)
  if (Math.random() < 0.01) {
    for (const [key, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (clientData.count >= RATE_LIMIT) {
    return false;
  }

  clientData.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Basic rate limiting by IP - extract first IP from x-forwarded-for
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIP = (forwardedFor?.split(',')[0]?.trim() ||
                     request.headers.get('x-real-ip') ||
                     '127.0.0.1').split(':')[0]; // Remove port if present

    if (!checkRateLimit(clientIP)) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: { 'retry-after': '60' }
      });
    }
    const urlParam = request.nextUrl.searchParams.get('url');

    if (!urlParam) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // Validate URL to prevent abuse
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlParam);
      if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.convex.cloud')) {
        return new Response('Invalid URL', { status: 400 });
      }
    } catch {
      return new Response('Invalid URL format', { status: 400 });
    }

    const url = parsedUrl.toString();

    // Fetch the image from Convex storage
    const response = await fetch(url);

    if (!response.ok) {
      return new Response('Image not found', { status: 404 });
    }

    // Create response with proper headers for edge caching
    const responseHeaders = new Headers();

    // Copy important headers
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    if (contentType) responseHeaders.set('content-type', contentType);
    if (contentLength) responseHeaders.set('content-length', contentLength);
    if (etag) responseHeaders.set('etag', etag);
    if (lastModified) responseHeaders.set('last-modified', lastModified);

    // Add edge caching headers
    responseHeaders.set('cache-control', 'public, max-age=31536000, immutable'); // 1 year cache
    responseHeaders.set('cdn-cache-control', 'public, max-age=31536000');
    responseHeaders.set('vercel-cache-control', 'public, max-age=31536000');

    // Add CORS headers if needed
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-methods', 'GET');

    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
