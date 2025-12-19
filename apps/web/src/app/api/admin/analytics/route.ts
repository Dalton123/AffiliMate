import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError, AnalyticsResponse } from '@affilimate/types';

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '7');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get impressions count
  const { count: impressionCount } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString());

  // Get clicks count
  const { count: clickCount } = await supabase
    .from('clicks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString());

  const impressions = impressionCount || 0;
  const clicks = clickCount || 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const response: AnalyticsResponse = {
    summary: {
      impressions,
      clicks,
      ctr: Math.round(ctr * 100) / 100,
    },
    period: {
      days,
      start: startDate.toISOString(),
    },
  };

  return NextResponse.json(response);
}
