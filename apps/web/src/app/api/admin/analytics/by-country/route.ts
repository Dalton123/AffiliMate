import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError, CountryStats } from '@affilimate/types';

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

  // Use database function for aggregation
  const { data, error } = await supabase.rpc('get_stats_by_country', {
    p_project_id: project.id,
    p_start_date: startDate.toISOString(),
  });

  if (error) {
    console.error('Analytics error:', error);
    return NextResponse.json<ApiError>(
      { error: 'query_failed', message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }

  const stats: CountryStats[] = (data || []).map((row: {
    country: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }) => ({
    country: row.country,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    ctr: Number(row.ctr),
  }));

  return NextResponse.json({ data: stats });
}
