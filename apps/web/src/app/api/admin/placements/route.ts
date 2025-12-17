import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreatePlacementRequest, ApiError } from '@affilimate/types';

// GET /api/admin/placements - List all placements
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

  // Get user's project
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

  // Fetch placements
  const { data, error } = await supabase
    .from('placements')
    .select('*')
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

// POST /api/admin/placements - Create placement
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

  // Get user's project
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

  const body: CreatePlacementRequest = await request.json();

  // Validate required fields
  if (!body.name || !body.slug) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'name and slug are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('placements')
    .insert({
      project_id: project.id,
      name: body.name,
      slug: body.slug,
      description: body.description,
      default_size: body.default_size,
      fallback_type: body.fallback_type || 'none',
      fallback_creative_id: body.fallback_creative_id,
      fallback_url: body.fallback_url,
    })
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

  return NextResponse.json({ data }, { status: 201 });
}
