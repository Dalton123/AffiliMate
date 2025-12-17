import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateCreativeRequest, ApiError } from '@affilimate/types';

// GET /api/admin/creatives - List all creatives
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

  // Fetch creatives with offer data
  const { data, error } = await supabase
    .from('creatives')
    .select('*, offer:offers(id, name, advertiser_name)')
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

// POST /api/admin/creatives - Create creative
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

  const body: CreateCreativeRequest = await request.json();

  if (!body.name || !body.click_url || !body.offer_id) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'name, click_url, and offer_id are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('creatives')
    .insert({
      project_id: project.id,
      offer_id: body.offer_id,
      name: body.name,
      click_url: body.click_url,
      image_url: body.image_url,
      alt_text: body.alt_text,
      width: body.width,
      height: body.height,
      // size is a GENERATED column - computed automatically from width/height
      format: body.format || 'banner',
      awin_creative_id: body.awin_creative_id,
      awin_program_id: body.awin_program_id,
      start_date: body.start_date,
      end_date: body.end_date,
    })
    .select('*, offer:offers(id, name, advertiser_name)')
    .single();

  if (error) {
    return NextResponse.json<ApiError>(
      { error: 'database_error', message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
