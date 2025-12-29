import { useQuery } from '@tanstack/react-query';
import type { AnalyticsResponse, PlacementStats, CreativeStats, CountryStats } from '@affilimate/types';

async function fetchAnalytics(days: number): Promise<AnalyticsResponse> {
  const res = await fetch(`/api/admin/analytics?days=${days}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch analytics');
  }
  return res.json();
}

async function fetchAnalyticsByPlacement(days: number): Promise<{ data: PlacementStats[] }> {
  const res = await fetch(`/api/admin/analytics/by-placement?days=${days}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch placement analytics');
  }
  return res.json();
}

async function fetchAnalyticsByCreative(days: number): Promise<{ data: CreativeStats[] }> {
  const res = await fetch(`/api/admin/analytics/by-creative?days=${days}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch creative analytics');
  }
  return res.json();
}

async function fetchAnalyticsByCountry(days: number): Promise<{ data: CountryStats[] }> {
  const res = await fetch(`/api/admin/analytics/by-country?days=${days}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch country analytics');
  }
  return res.json();
}

export function useAnalytics(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', days],
    queryFn: () => fetchAnalytics(days),
  });
}

export function useAnalyticsByPlacement(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', 'by-placement', days],
    queryFn: () => fetchAnalyticsByPlacement(days),
  });
}

export function useAnalyticsByCreative(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', 'by-creative', days],
    queryFn: () => fetchAnalyticsByCreative(days),
  });
}

export function useAnalyticsByCountry(days: number = 7) {
  return useQuery({
    queryKey: ['analytics', 'by-country', days],
    queryFn: () => fetchAnalyticsByCountry(days),
  });
}
