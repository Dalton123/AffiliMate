import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError } from '@affilimate/types';

interface CreateDealRequest {
  title: string;
  description?: string;
  terms?: string;
  voucher_code?: string;
  tracking_url: string;
  start_date?: string;
  end_date?: string;
  regions?: string[];
  categories?: string[];
  is_featured?: boolean;
  sort_order?: number;
  offer_id?: string;
  // For manual deals, allow setting merchant name
  merchant_name?: string;
}

// GET /api/admin/deals - List all deals
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json<ApiError>(
      { error: 'no_project', message: 'No project found' },
      { status: 404 }
    );
  }

  // Get optional filters from query params
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get('active') === 'true';
  const awinOnly = searchParams.get('awin_only') === 'true';
  const manualOnly = searchParams.get('manual_only') === 'true';

  let query = supabase
    .from('deals')
    .select('*, offer:offers(id, name)')
    .eq('project_id', project.id)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (awinOnly) {
    query = query.eq('synced_from_awin', true);
  }

  if (manualOnly) {
    query = query.eq('synced_from_awin', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// POST /api/admin/deals - Create manual deal
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json<ApiError>(
      { error: 'no_project', message: 'No project found' },
      { status: 404 }
    );
  }

  const body: CreateDealRequest = await request.json();

  if (!body.title || !body.tracking_url) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'title and tracking_url are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('deals')
    .insert({
      project_id: project.id,
      title: body.title,
      description: body.description || null,
      terms: body.terms || null,
      voucher_code: body.voucher_code || null,
      tracking_url: body.tracking_url,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      regions: body.regions || [],
      categories: body.categories || [],
      is_featured: body.is_featured || false,
      sort_order: body.sort_order || 0,
      offer_id: body.offer_id || null,
      // For manual deals, store merchant name in awin_advertiser_name field
      awin_advertiser_name: body.merchant_name || null,
      synced_from_awin: false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
