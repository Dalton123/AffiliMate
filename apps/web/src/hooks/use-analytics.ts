import { useQuery } from '@tanstack/react-query';
import type { AnalyticsResponse } from '@affilimate/types';

async function fetchAnalytics(days: number): Promise<AnalyticsResponse> {
  const res = await fetch(`/api/admin/analytics?days=${days}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch analytics');
  }
  return res.json();
}

export function useAnalytics(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', days],
    queryFn: () => fetchAnalytics(days),
  });
}
