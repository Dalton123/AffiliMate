import { NextRequest, NextResponse } from 'next/server';
import type { DealsResponse, ServeDeal, GeoInfo } from '@affilimate/types';
import { validateApiKey } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

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
  missing_country: 'Country parameter is required for deal filtering.',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get API key from header
  const apiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null;

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

  // Country is required for deal filtering
  if (!geo.country) {
    return NextResponse.json(
      { error: 'missing_country', message: ERROR_MESSAGES.missing_country },
      { status: 400 }
    );
  }

  // Get optional filters
  const category = searchParams.get('category');
  const featuredOnly = searchParams.get('featured_only') === 'true';
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 50);

  // Query deals from database
  const supabaseAdmin = await createAdminClient();

  let query = supabaseAdmin
    .from('deals')
    .select('*')
    .eq('project_id', validation.projectId)
    .eq('is_active', true)
    // Match deals for this country OR deals with "ALL" regions
    .or(`regions.cs.{${geo.country}},regions.cs.{ALL}`)
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(limit);

  // Optional category filter (GIN index: && overlap)
  if (category) {
    query = query.contains('categories', [category]);
  }

  // Featured only filter
  if (featuredOnly) {
    query = query.eq('is_featured', true);
  }

  const { data: deals, error, count } = await query;

  if (error) {
    console.error('[Deals] Query failed:', error);
    return NextResponse.json(
      { error: 'database_error', message: 'Failed to fetch deals' },
      { status: 500 }
    );
  }

  // Transform to public response format
  const serveDeals: ServeDeal[] = (deals || []).map((deal) => ({
    id: deal.id,
    merchant_name: deal.awin_advertiser_name || 'Unknown',
    title: deal.title,
    description: deal.description,
    terms: deal.terms,
    voucher_code: deal.voucher_code,
    tracking_url: deal.tracking_url,
    start_date: deal.start_date,
    end_date: deal.end_date,
    categories: deal.categories || [],
    is_featured: deal.is_featured,
  }));

  const response: DealsResponse = {
    deals: serveDeals,
    geo,
    total: serveDeals.length,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5 min cache
      'Access-Control-Allow-Origin': '*',
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
