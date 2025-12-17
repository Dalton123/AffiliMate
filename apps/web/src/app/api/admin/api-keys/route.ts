import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/api-key-utils';
import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiError,
} from '@affilimate/types';

// GET /api/admin/api-keys - List all API keys
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

  // Note: Never return key_hash
  const { data, error } = await supabase
    .from('api_keys')
    .select(
      'id, project_id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at'
    )
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// POST /api/admin/api-keys - Create new API key
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

  const body: CreateApiKeyRequest = await request.json();

  if (!body.name) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'name is required' },
      { status: 400 }
    );
  }

  // Generate the key
  const { key, hash, prefix } = generateApiKey();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      project_id: project.id,
      name: body.name,
      key_hash: hash,
      key_prefix: prefix,
      scopes: body.scopes || ['serve'],
      expires_at: body.expires_at,
    })
    .select('id, name, key_prefix, scopes, expires_at, created_at')
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  // Return full key ONCE
  const response: CreateApiKeyResponse = {
    id: data.id,
    name: data.name,
    key, // Full key - shown only once!
    key_prefix: data.key_prefix,
    scopes: data.scopes,
    expires_at: data.expires_at,
    created_at: data.created_at,
  };

  return NextResponse.json(response, { status: 201 });
}
