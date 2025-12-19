import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiError, PlacementStats } from '@affilimate/types';

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

  // Get impressions grouped by placement
  const { data: impressionData } = await supabase
    .from('impressions')
    .select('placement_id')
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString());

  // Get placement names
  const { data: placements } = await supabase
    .from('placements')
    .select('id, name')
    .eq('project_id', project.id);

  const placementMap = new Map(placements?.map((p) => [p.id, p.name]) || []);

  // Aggregate impressions
  const impressionCounts = new Map<string, number>();
  impressionData?.forEach((row) => {
    if (row.placement_id) {
      impressionCounts.set(
        row.placement_id,
        (impressionCounts.get(row.placement_id) || 0) + 1
      );
    }
  });

  // Get clicks - need to join through impressions to get placement
  const { data: clickData } = await supabase
    .from('clicks')
    .select('impression_id')
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString())
    .not('impression_id', 'is', null);

  // Get impression -> placement mapping for clicks
  const impressionIds = clickData?.map((c) => c.impression_id).filter(Boolean) || [];
  const clickCountByPlacement = new Map<string, number>();

  if (impressionIds.length > 0) {
    const { data: impressionsForClicks } = await supabase
      .from('impressions')
      .select('id, placement_id')
      .in('id', impressionIds);

    impressionsForClicks?.forEach((imp) => {
      if (imp.placement_id) {
        clickCountByPlacement.set(
          imp.placement_id,
          (clickCountByPlacement.get(imp.placement_id) || 0) + 1
        );
      }
    });
  }

  // Build stats
  const stats: PlacementStats[] = Array.from(impressionCounts.keys())
    .map((placementId) => {
      const impressions = impressionCounts.get(placementId) || 0;
      const clicks = clickCountByPlacement.get(placementId) || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      return {
        placement_id: placementId,
        placement_name: placementMap.get(placementId) || 'Unknown',
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return NextResponse.json({ data: stats });
}
