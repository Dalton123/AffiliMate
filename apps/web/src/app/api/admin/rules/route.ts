import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateRuleRequest, ApiError } from '@affilimate/types';

// GET /api/admin/rules - List all targeting rules
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

  // Fetch rules with placement and creative data
  const { data, error } = await supabase
    .from('targeting_rules')
    .select(`
      *,
      placement:placements(id, name, slug),
      creative:creatives(id, name, size, offer:offers(id, name))
    `)
    .eq('project_id', project.id)
    .order('priority', { ascending: false });

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// POST /api/admin/rules - Create targeting rule
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

  const body: CreateRuleRequest = await request.json();

  if (!body.placement_id || !body.creative_id) {
    return NextResponse.json<ApiError>(
      {
        error: 'validation_error',
        message: 'placement_id and creative_id are required',
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('targeting_rules')
    .insert({
      project_id: project.id,
      placement_id: body.placement_id,
      creative_id: body.creative_id,
      countries: body.countries || [],
      categories: body.categories || [],
      priority: body.priority ?? 50,
      weight: body.weight ?? 100,
    })
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

  return NextResponse.json({ data }, { status: 201 });
}
