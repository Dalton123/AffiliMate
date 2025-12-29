'use client';

import { useState } from 'react';
import { BarChart3, MousePointerClick, Eye, Percent, TrendingUp, TrendingDown, Minus, LayoutGrid, Palette, Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAnalytics, useAnalyticsByPlacement, useAnalyticsByCreative, useAnalyticsByCountry } from '@/hooks/use-analytics';
import { cn } from '@/lib/utils';

function ChangeIndicator({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>--</span>
      </span>
    );
  }

  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive && 'text-green-600',
        isNegative && 'text-red-600',
        !isPositive && !isNegative && 'text-muted-foreground'
      )}
    >
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
      <span>{isPositive ? '+' : ''}{change}%</span>
    </span>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useAnalytics(days);
  const { data: placementData, isLoading: placementLoading } = useAnalyticsByPlacement(days);
  const { data: creativeData, isLoading: creativeLoading } = useAnalyticsByCreative(days);
  const { data: countryData, isLoading: countryLoading } = useAnalyticsByCountry(days);

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
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold">
                {formatNumber(data?.summary?.impressions || 0)}
              </p>
              <ChangeIndicator change={data?.changes?.impressions} />
            </div>
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
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold">
                {formatNumber(data?.summary?.clicks || 0)}
              </p>
              <ChangeIndicator change={data?.changes?.clicks} />
            </div>
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
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold">{data?.summary?.ctr || 0}%</p>
              <ChangeIndicator change={data?.changes?.ctr} />
            </div>
          )}
        </div>
      </div>

      {!isLoading && data?.summary?.impressions === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No data yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Analytics will appear here once your placements start receiving
            traffic.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="placement" className="space-y-4">
          <TabsList>
            <TabsTrigger value="placement" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              By Placement
            </TabsTrigger>
            <TabsTrigger value="creative" className="gap-2">
              <Palette className="h-4 w-4" />
              By Creative
            </TabsTrigger>
            <TabsTrigger value="country" className="gap-2">
              <Globe className="h-4 w-4" />
              By Country
            </TabsTrigger>
          </TabsList>

          <TabsContent value="placement" className="border rounded-lg">
            {placementLoading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 mx-auto bg-muted animate-pulse rounded" />
              </div>
            ) : !placementData?.data?.length ? (
              <div className="p-8 text-center text-muted-foreground">
                No placement data for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placement</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placementData.data.map((row) => (
                    <TableRow key={row.placement_id}>
                      <TableCell className="font-medium">{row.placement_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                      <TableCell className="text-right">{row.ctr}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="creative" className="border rounded-lg">
            {creativeLoading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 mx-auto bg-muted animate-pulse rounded" />
              </div>
            ) : !creativeData?.data?.length ? (
              <div className="p-8 text-center text-muted-foreground">
                No creative data for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creative</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creativeData.data.map((row) => (
                    <TableRow key={row.creative_id}>
                      <TableCell className="font-medium">{row.creative_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                      <TableCell className="text-right">{row.ctr}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="country" className="border rounded-lg">
            {countryLoading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 mx-auto bg-muted animate-pulse rounded" />
              </div>
            ) : !countryData?.data?.length ? (
              <div className="p-8 text-center text-muted-foreground">
                No country data for this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryData.data.map((row) => (
                    <TableRow key={row.country}>
                      <TableCell className="font-medium">{row.country}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                      <TableCell className="text-right">{row.ctr}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
