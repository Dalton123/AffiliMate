import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError } from '@affilimate/types';

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/admin/api-keys/[id] - Revoke API key
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

  const { error } = await supabase.from('api_keys').delete().eq('id', id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
