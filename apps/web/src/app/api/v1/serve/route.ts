import { NextRequest, NextResponse } from 'next/server';
import type { ServeResponse, GeoInfo } from '@affilimate/types';
import { validateApiKey } from '@/lib/auth';
import { selectCreative } from '@/lib/selection';

// Detect country from request headers
function detectCountry(request: NextRequest, searchParams: URLSearchParams): GeoInfo {
  // 1. Explicit override (highest priority)
  const paramCountry = searchParams.get('country')?.toUpperCase();
  if (paramCountry && /^[A-Z]{2}$/.test(paramCountry)) {
    return { country: paramCountry, source: 'param' };
  }

  // 2. Vercel geo header
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  if (vercelCountry && vercelCountry !== 'XX') {
    return { country: vercelCountry, source: 'vercel-header' };
  }

  // 3. Cloudflare geo header
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return { country: cfCountry, source: 'cloudflare-header' };
  }

  // 4. Unknown
  return { country: null, source: 'unknown' };
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_api_key: 'API key is required. Pass via X-API-Key header.',
  invalid_api_key: 'API key is invalid.',
  api_key_expired: 'API key has expired.',
  api_key_inactive: 'API key is inactive.',
  insufficient_scope: 'API key does not have the required scope.',
  placement_not_found: 'Placement not found.',
  placement_inactive: 'Placement is inactive.',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get placement (required)
  const placement = searchParams.get('placement');
  if (!placement) {
    return NextResponse.json(
      { error: 'missing_parameter', message: 'placement parameter is required' },
      { status: 400 }
    );
  }

  // Get API key from header
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '') || null;

  // Validate API key
  const validation = await validateApiKey(apiKey);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error, message: ERROR_MESSAGES[validation.error] },
      { status: 401 }
    );
  }

  // Detect geo
  const geo = detectCountry(request, searchParams);

  // Get optional filters
  const category = searchParams.get('category');
  const size = searchParams.get('size');
  const format = searchParams.get('format');
  const debug = searchParams.get('debug') === 'true';

  // Run selection algorithm
  const result = await selectCreative({
    projectId: validation.projectId,
    placementSlug: placement,
    country: geo.country,
    category,
    size,
    format,
  });

  // Handle placement errors
  if (result.error === 'placement_not_found') {
    return NextResponse.json(
      { error: 'placement_not_found', message: ERROR_MESSAGES.placement_not_found },
      { status: 404 }
    );
  }

  // Build response
  const response: ServeResponse = {
    creative: result.creative,
    fallback: result.fallback,
    fallback_type: result.fallbackType === 'creative' ? 'placement_default' : 'none',
    geo,
  };

  if (debug) {
    response.debug = {
      rules_matched: result.rulesMatched,
      selection_reason: result.selectionReason,
    };
  }

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'X-API-Key, Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
