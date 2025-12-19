import { NextRequest, NextResponse } from 'next/server';
import type { ServeResponse, ServeCreativeItem, GeoInfo } from '@affilimate/types';
import { validateApiKey } from '@/lib/auth';
import { selectCreative, selectMultipleCreatives } from '@/lib/selection';
import { createAdminClient } from '@/lib/supabase/server';

// Base URL for tracking URLs (must be absolute for third-party integrations)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

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
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '1', 10) || 1, 1), 10);

  // Multi-creative flow when limit > 1
  if (limit > 1) {
    const multiResult = await selectMultipleCreatives({
      projectId: validation.projectId,
      placementSlug: placement,
      country: geo.country,
      category,
      size,
      format,
      limit,
    });

    // Handle placement errors
    if (multiResult.error === 'placement_not_found') {
      return NextResponse.json(
        { error: 'placement_not_found', message: ERROR_MESSAGES.placement_not_found },
        { status: 404 }
      );
    }

    // Generate impression IDs and log impressions for each creative
    const creatives: ServeCreativeItem[] = [];

    if (multiResult.placementId && multiResult.creatives.length > 0) {
      const supabaseAdmin = await createAdminClient();

      for (const item of multiResult.creatives) {
        const impressionId = crypto.randomUUID();

        // Log impression (fire-and-forget)
        supabaseAdmin
          .from('impressions')
          .insert({
            id: impressionId,
            project_id: validation.projectId,
            placement_id: multiResult.placementId,
            creative_id: item.creativeId,
            rule_id: item.ruleId,
            country: geo.country,
            was_fallback: false,
          })
          .then(({ error }) => {
            if (error) console.error('[Impression] Insert failed:', error);
          });

        creatives.push({
          creative: item.creative,
          impression_id: impressionId,
          tracking_url: `${appUrl}/api/v1/click/${impressionId}?url=${encodeURIComponent(item.creative.click_url)}`,
        });
      }
    }

    // Build multi-creative response
    const response: ServeResponse = {
      creative: null,
      creatives,
      fallback: multiResult.fallback,
      fallback_type: 'none',
      geo,
    };

    if (debug) {
      response.debug = {
        rules_matched: multiResult.rulesMatched,
        selection_reason: multiResult.selectionReason,
      };
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  }

  // Single-creative flow (default, backward compatible)
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

  // Generate impression ID and log impression (fire-and-forget)
  const impressionId = crypto.randomUUID();
  if (result.placementId) {
    const supabaseAdmin = await createAdminClient();
    supabaseAdmin
      .from('impressions')
      .insert({
        id: impressionId,
        project_id: validation.projectId,
        placement_id: result.placementId!,
        creative_id: result.creativeId || null,
        rule_id: result.ruleId || null,
        country: geo.country,
        was_fallback: result.fallback,
      })
      .then(({ error }) => {
        if (error) console.error('[Impression] Insert failed:', error);
      });
  }

  // Build response
  const response: ServeResponse = {
    creative: result.creative,
    fallback: result.fallback,
    fallback_type: result.fallbackType === 'creative' ? 'placement_default' : 'none',
    geo,
    impression_id: impressionId,
    tracking_url: result.creative
      ? `${appUrl}/api/v1/click/${impressionId}?url=${encodeURIComponent(result.creative.click_url)}`
      : undefined,
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
