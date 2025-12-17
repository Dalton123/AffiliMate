import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdatePlacementRequest, ApiError } from '@affilimate/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/placements/[id] - Get single placement
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
    .from('placements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>(
      { error: 'not_found', message: 'Placement not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PUT /api/admin/placements/[id] - Update placement
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

  const body: UpdatePlacementRequest = await request.json();

  const { data, error } = await supabase
    .from('placements')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json<ApiError>(
        {
          error: 'duplicate_slug',
          message: 'A placement with this slug already exists',
        },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/admin/placements/[id] - Delete placement
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

  const { error } = await supabase.from('placements').delete().eq('id', id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
