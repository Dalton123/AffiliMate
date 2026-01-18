import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';
import type { ApiError } from '@affilimate/types';

interface AwinConnectionRequest {
  publisher_id: string;
  api_token: string;
}

// GET /api/admin/awin/connection - Get current Awin connection status
export async function GET() {
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

  const { data: connection, error } = await supabase
    .from('awin_connections')
    .select('id, publisher_id, is_active, last_sync_at, sync_status, sync_error, created_at, updated_at')
    .eq('project_id', project.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    connected: !!connection,
    connection: connection || null,
  });
}

// POST /api/admin/awin/connection - Create or update Awin connection
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

  const body: AwinConnectionRequest = await request.json();

  if (!body.publisher_id || !body.api_token) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'publisher_id and api_token are required' },
      { status: 400 }
    );
  }

  // Encrypt the API token
  const encryptedToken = encrypt(body.api_token);

  // Upsert connection (one per project)
  const { data, error } = await supabase
    .from('awin_connections')
    .upsert(
      {
        project_id: project.id,
        publisher_id: body.publisher_id,
        api_token_encrypted: encryptedToken,
        is_active: true,
        sync_status: 'pending',
        sync_error: null,
      },
      {
        onConflict: 'project_id',
      }
    )
    .select('id, publisher_id, is_active, sync_status, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/admin/awin/connection - Remove Awin connection
export async function DELETE() {
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
    .from('awin_connections')
    .delete()
    .eq('project_id', project.id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
