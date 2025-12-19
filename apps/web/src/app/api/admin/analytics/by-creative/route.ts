import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError, CreativeStats } from '@affilimate/types';

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

  // Get impressions grouped by creative
  const { data: impressionData } = await supabase
    .from('impressions')
    .select('creative_id')
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString())
    .not('creative_id', 'is', null);

  // Get clicks grouped by creative
  const { data: clickData } = await supabase
    .from('clicks')
    .select('creative_id')
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString())
    .not('creative_id', 'is', null);

  // Get creative names
  const { data: creatives } = await supabase
    .from('creatives')
    .select('id, name')
    .eq('project_id', project.id);

  const creativeMap = new Map(creatives?.map((c) => [c.id, c.name]) || []);

  // Aggregate impressions
  const impressionCounts = new Map<string, number>();
  impressionData?.forEach((row) => {
    if (row.creative_id) {
      impressionCounts.set(
        row.creative_id,
        (impressionCounts.get(row.creative_id) || 0) + 1
      );
    }
  });

  // Aggregate clicks
  const clickCounts = new Map<string, number>();
  clickData?.forEach((row) => {
    if (row.creative_id) {
      clickCounts.set(
        row.creative_id,
        (clickCounts.get(row.creative_id) || 0) + 1
      );
    }
  });

  // Build stats
  const allCreativeIds = new Set([
    ...impressionCounts.keys(),
    ...clickCounts.keys(),
  ]);

  const stats: CreativeStats[] = Array.from(allCreativeIds)
    .map((creativeId) => {
      const impressions = impressionCounts.get(creativeId) || 0;
      const clicks = clickCounts.get(creativeId) || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      return {
        creative_id: creativeId,
        creative_name: creativeMap.get(creativeId) || 'Unknown',
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return NextResponse.json({ data: stats });
}
