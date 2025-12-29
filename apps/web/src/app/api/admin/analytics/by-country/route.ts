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

  // Get impressions grouped by country
  const { data: impressionData } = await supabase
    .from('impressions')
    .select('country')
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString())
    .not('country', 'is', null);

  // Get clicks grouped by country
  const { data: clickData } = await supabase
    .from('clicks')
    .select('country')
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString())
    .not('country', 'is', null);

  // Aggregate impressions by country
  const impressionCounts = new Map<string, number>();
  impressionData?.forEach((row) => {
    if (row.country) {
      impressionCounts.set(
        row.country,
        (impressionCounts.get(row.country) || 0) + 1
      );
    }
  });

  // Aggregate clicks by country
  const clickCounts = new Map<string, number>();
  clickData?.forEach((row) => {
    if (row.country) {
      clickCounts.set(
        row.country,
        (clickCounts.get(row.country) || 0) + 1
      );
    }
  });

  // Build stats from all countries with impressions or clicks
  const allCountries = new Set([
    ...impressionCounts.keys(),
    ...clickCounts.keys(),
  ]);

  const stats: CountryStats[] = Array.from(allCountries)
    .map((country) => {
      const impressions = impressionCounts.get(country) || 0;
      const clicks = clickCounts.get(country) || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      return {
        country,
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
      };
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  return NextResponse.json({ data: stats });
}
