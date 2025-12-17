import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateOfferRequest, ApiError } from '@affilimate/types';

// GET /api/admin/offers - List all offers
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

  const { data, error } = await supabase
    .from('offers')
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

// POST /api/admin/offers - Create offer
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

  const body: CreateOfferRequest = await request.json();

  if (!body.name) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'name is required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('offers')
    .insert({
      project_id: project.id,
      name: body.name,
      advertiser_name: body.advertiser_name,
      advertiser_id: body.advertiser_id,
      network: body.network || 'direct',
      category: body.category,
      base_url: body.base_url,
      notes: body.notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
