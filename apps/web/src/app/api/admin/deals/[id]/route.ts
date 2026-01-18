import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError } from '@affilimate/types';

interface UpdateDealRequest {
  title?: string;
  description?: string;
  terms?: string;
  voucher_code?: string;
  tracking_url?: string;
  start_date?: string;
  end_date?: string;
  regions?: string[];
  categories?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  offer_id?: string;
  merchant_name?: string;
}

// GET /api/admin/deals/[id] - Get single deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { data, error } = await supabase
    .from('deals')
    .select('*, offer:offers(id, name)')
    .eq('id', id)
    .eq('project_id', project.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json<ApiError>(
        { error: 'not_found', message: 'Deal not found' },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// PUT /api/admin/deals/[id] - Update deal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const body: UpdateDealRequest = await request.json();

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.terms !== undefined) updates.terms = body.terms;
  if (body.voucher_code !== undefined) updates.voucher_code = body.voucher_code;
  if (body.tracking_url !== undefined) updates.tracking_url = body.tracking_url;
  if (body.start_date !== undefined) updates.start_date = body.start_date;
  if (body.end_date !== undefined) updates.end_date = body.end_date;
  if (body.regions !== undefined) updates.regions = body.regions;
  if (body.categories !== undefined) updates.categories = body.categories;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.is_featured !== undefined) updates.is_featured = body.is_featured;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
  if (body.offer_id !== undefined) updates.offer_id = body.offer_id;
  if (body.merchant_name !== undefined) updates.awin_advertiser_name = body.merchant_name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .eq('project_id', project.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json<ApiError>(
        { error: 'not_found', message: 'Deal not found' },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/admin/deals/[id] - Delete deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', id)
    .eq('project_id', project.id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
