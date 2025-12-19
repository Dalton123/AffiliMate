'use client';

import { useState } from 'react';
import { BarChart3, MousePointerClick, Eye, Percent } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnalytics } from '@/hooks/use-analytics';

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useAnalytics(days);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your ad performance and engagement
          </p>
        </div>
        <Select
          value={days.toString()}
          onValueChange={(value) => setDays(Number(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Today</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Impressions</p>
          </div>
          {isLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold">
              {formatNumber(data?.summary?.impressions || 0)}
            </p>
          )}
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Clicks</p>
          </div>
          {isLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold">
              {formatNumber(data?.summary?.clicks || 0)}
            </p>
          )}
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">CTR</p>
          </div>
          {isLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold">{data?.summary?.ctr || 0}%</p>
          )}
        </div>
      </div>

      {!isLoading && data?.summary?.impressions === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No data yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Analytics will appear here once your placements start receiving
            traffic.
          </p>
        </div>
      )}
    </div>
  );
}
