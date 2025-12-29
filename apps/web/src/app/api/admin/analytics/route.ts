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

  // Current period
  const currentEnd = new Date();
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - days);

  // Previous period (same duration, immediately before current)
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days);

  // Get current period impressions count
  const { count: currentImpressionCount } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', currentStart.toISOString())
    .lt('created_at', currentEnd.toISOString());

  // Get current period clicks count
  const { count: currentClickCount } = await supabase
    .from('clicks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', currentStart.toISOString())
    .lt('created_at', currentEnd.toISOString());

  // Get previous period impressions count
  const { count: previousImpressionCount } = await supabase
    .from('impressions')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', previousStart.toISOString())
    .lt('created_at', previousEnd.toISOString());

  // Get previous period clicks count
  const { count: previousClickCount } = await supabase
    .from('clicks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .gte('created_at', previousStart.toISOString())
    .lt('created_at', previousEnd.toISOString());

  const impressions = currentImpressionCount || 0;
  const clicks = currentClickCount || 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const prevImpressions = previousImpressionCount || 0;
  const prevClicks = previousClickCount || 0;
  const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;

  // Calculate percentage changes
  const calcChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  };

  const hasPreviousData = prevImpressions > 0 || prevClicks > 0;

  const response: AnalyticsResponse = {
    summary: {
      impressions,
      clicks,
      ctr: Math.round(ctr * 100) / 100,
    },
    previousSummary: hasPreviousData ? {
      impressions: prevImpressions,
      clicks: prevClicks,
      ctr: Math.round(prevCtr * 100) / 100,
    } : null,
    changes: hasPreviousData ? {
      impressions: calcChange(impressions, prevImpressions),
      clicks: calcChange(clicks, prevClicks),
      ctr: calcChange(ctr, prevCtr),
    } : null,
    period: {
      days,
      start: currentStart.toISOString(),
    },
  };

  return NextResponse.json(response);
}
