import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateOfferRequest, ApiError } from '@affilimate/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/offers/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>(
      { error: 'not_found', message: 'Offer not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PUT /api/admin/offers/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  const body: UpdateOfferRequest = await request.json();

  const { data, error } = await supabase
    .from('offers')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/admin/offers/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  const { error } = await supabase.from('offers').delete().eq('id', id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
