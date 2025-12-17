import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateRuleRequest, ApiError } from '@affilimate/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/rules/[id]
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
    .from('targeting_rules')
    .select(`
      *,
      placement:placements(id, name, slug),
      creative:creatives(id, name, size, offer:offers(id, name))
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>(
      { error: 'not_found', message: 'Rule not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PUT /api/admin/rules/[id]
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

  const body: UpdateRuleRequest = await request.json();

  const { data, error } = await supabase
    .from('targeting_rules')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      placement:placements(id, name, slug),
      creative:creatives(id, name, size, offer:offers(id, name))
    `)
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE /api/admin/rules/[id]
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

  const { error } = await supabase.from('targeting_rules').delete().eq('id', id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
