import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateCreativeRequest, ApiError } from '@affilimate/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/creatives/[id]
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
    .from('creatives')
    .select('*, offer:offers(id, name, advertiser_name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>(
      { error: 'not_found', message: 'Creative not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PUT /api/admin/creatives/[id]
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

  const body: UpdateCreativeRequest = await request.json();

  // Calculate size string if width and height provided
  let updateData: Record<string, unknown> = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  if (body.width !== undefined && body.height !== undefined) {
    updateData.size = body.width && body.height ? `${body.width}x${body.height}` : null;
  }

  const { data, error } = await supabase
    .from('creatives')
    .update(updateData)
    .eq('id', id)
    .select('*, offer:offers(id, name, advertiser_name)')
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/admin/creatives/[id]
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

  const { error } = await supabase.from('creatives').delete().eq('id', id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
