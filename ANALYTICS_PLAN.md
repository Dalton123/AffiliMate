# AffiliMate Analytics & Tracking Implementation Plan

## Overview

Add impression and click tracking to AffiliMate so users can see which creatives perform best. This is a multi-phase implementation.

---

## Current State

- App serves geo-targeted affiliate creatives via `/api/v1/serve`
- No tracking of impressions or clicks
- No performance analytics
- Users can't see which creatives perform best

---

## Phase 1: Database Schema

### Create Migration File

Create `supabase/migrations/[timestamp]_add_analytics.sql`:

```sql
-- ===========================================
-- Analytics Tables for AffiliMate
-- ===========================================

-- Track every ad serve (impression)
CREATE TABLE impressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  placement_id UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES targeting_rules(id) ON DELETE SET NULL,
  country VARCHAR(2),
  was_fallback BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track clicks (when user clicks the ad)
CREATE TABLE clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impression_id UUID REFERENCES impressions(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
  country VARCHAR(2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregates for fast dashboard queries
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  placement_id UUID REFERENCES placements(id) ON DELETE SET NULL,
  creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
  country VARCHAR(2),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, date, placement_id, creative_id, country)
);

-- Indexes for performance
CREATE INDEX idx_impressions_project_created ON impressions(project_id, created_at DESC);
CREATE INDEX idx_impressions_creative ON impressions(creative_id, created_at DESC);
CREATE INDEX idx_clicks_project_created ON clicks(project_id, created_at DESC);
CREATE INDEX idx_clicks_impression ON clicks(impression_id);
CREATE INDEX idx_daily_stats_lookup ON daily_stats(project_id, date DESC);

-- RLS Policies
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Impressions: Only project owner can view
CREATE POLICY "Users can view own impressions"
  ON impressions FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Allow service role to insert (for API)
CREATE POLICY "Service can insert impressions"
  ON impressions FOR INSERT
  WITH CHECK (true);

-- Clicks: Only project owner can view
CREATE POLICY "Users can view own clicks"
  ON clicks FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Service can insert clicks"
  ON clicks FOR INSERT
  WITH CHECK (true);

-- Daily stats: Only project owner can view/modify
CREATE POLICY "Users can view own daily_stats"
  ON daily_stats FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Service can manage daily_stats"
  ON daily_stats FOR ALL
  WITH CHECK (true);
```

---

## Phase 2: Update Types

### Update `packages/types/src/api.ts`

Add these types:

```typescript
// Analytics Types
export interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate as percentage
  top_country: string | null;
  top_placement: string | null;
  top_creative: string | null;
}

export interface DailyStats {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface PlacementStats {
  placement_id: string;
  placement_name: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface CreativeStats {
  creative_id: string;
  creative_name: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface CountryStats {
  country: string;
  impressions: number;
  clicks: number;
  ctr: number;
}
```

### Update `packages/types/src/database.ts`

Add table types:

```typescript
export interface Impression {
  id: string;
  project_id: string;
  placement_id: string;
  creative_id: string | null;
  rule_id: string | null;
  country: string | null;
  was_fallback: boolean;
  created_at: string;
}

export interface Click {
  id: string;
  impression_id: string | null;
  project_id: string;
  creative_id: string | null;
  country: string | null;
  created_at: string;
}
```

---

## Phase 3: Modify Serve API

### Update `apps/web/src/app/api/v1/serve/route.ts`

After selecting a creative, log the impression and return tracking info:

```typescript
// After: const result = await selectCreative({...});

// Log impression (async, don't block response)
const impressionId = crypto.randomUUID();
const supabaseAdmin = await createAdminClient();

// Fire and forget - don't await to keep response fast
supabaseAdmin.from('impressions').insert({
  id: impressionId,
  project_id: validation.projectId,
  placement_id: result.placementId, // Need to return this from selectCreative
  creative_id: result.creative ? result.creativeId : null,
  rule_id: result.ruleId || null,
  country: geo.country,
  was_fallback: result.fallback,
}).then(() => {}).catch(console.error);

// Add to response
const response: ServeResponse = {
  creative: result.creative,
  fallback: result.fallback,
  // ... existing fields
  impression_id: impressionId, // NEW
  tracking_url: result.creative
    ? `/api/v1/click/${impressionId}?url=${encodeURIComponent(result.creative.click_url)}`
    : undefined, // NEW
};
```

### Update `apps/web/src/lib/selection.ts`

Return additional IDs needed for tracking:

```typescript
export interface SelectionResult {
  // ... existing fields
  placementId: string;  // ADD
  creativeId?: string;  // ADD
  ruleId?: string;      // ADD
}
```

---

## Phase 4: Click Tracking Endpoint

### Create `apps/web/src/app/api/v1/click/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: impressionId } = await params;
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'missing_url', message: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createAdminClient();

    // Get impression to find project_id and creative_id
    const { data: impression } = await supabase
      .from('impressions')
      .select('project_id, creative_id, country')
      .eq('id', impressionId)
      .single();

    if (impression) {
      // Log click (fire and forget)
      supabase.from('clicks').insert({
        impression_id: impressionId,
        project_id: impression.project_id,
        creative_id: impression.creative_id,
        country: impression.country,
      }).then(() => {}).catch(console.error);
    }

    // Redirect to affiliate URL
    return NextResponse.redirect(decodeURIComponent(url), { status: 302 });
  } catch (error) {
    // On any error, still redirect (don't break the user experience)
    return NextResponse.redirect(decodeURIComponent(url), { status: 302 });
  }
}
```

---

## Phase 5: Analytics API Endpoints

### Create `apps/web/src/app/api/admin/analytics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Get user's project
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'no_project' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '7');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get summary stats
  const { data: impressions } = await supabase
    .from('impressions')
    .select('id', { count: 'exact' })
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString());

  const { data: clicks } = await supabase
    .from('clicks')
    .select('id', { count: 'exact' })
    .eq('project_id', project.id)
    .gte('created_at', startDate.toISOString());

  const impressionCount = impressions?.length || 0;
  const clickCount = clicks?.length || 0;
  const ctr = impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0;

  return NextResponse.json({
    summary: {
      impressions: impressionCount,
      clicks: clickCount,
      ctr: Math.round(ctr * 100) / 100,
    },
    period: { days, start: startDate.toISOString() },
  });
}
```

### Create `apps/web/src/app/api/admin/analytics/by-creative/route.ts`

```typescript
// Similar structure - query impressions grouped by creative_id
// Return top 10 creatives by impressions with CTR
```

### Create `apps/web/src/app/api/admin/analytics/by-placement/route.ts`

```typescript
// Similar structure - query impressions grouped by placement_id
```

---

## Phase 6: Analytics Dashboard Page

### Create `apps/web/src/app/(dashboard)/analytics/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Impressions</p>
          <p className="text-3xl font-bold">{data?.summary?.impressions || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">Clicks</p>
          <p className="text-3xl font-bold">{data?.summary?.clicks || 0}</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-sm text-muted-foreground">CTR</p>
          <p className="text-3xl font-bold">{data?.summary?.ctr || 0}%</p>
        </div>
      </div>

      {/* Add charts and tables here */}
    </div>
  );
}
```

### Add to Sidebar Navigation

Update `apps/web/src/components/sidebar.tsx` to add Analytics link:

```typescript
{ name: 'Analytics', href: '/analytics', icon: BarChart3 },
```

---

## Phase 7: Update Serve Response Types

### Update `packages/types/src/api.ts`

```typescript
export interface ServeResponse {
  creative: ServeCreative | null;
  fallback: boolean;
  fallback_type?: 'placement_default' | 'none';
  geo?: GeoInfo;
  debug?: {
    rules_matched: number;
    selection_reason: string;
  };
  // NEW tracking fields
  impression_id?: string;
  tracking_url?: string;  // Use this instead of click_url for click tracking
}
```

---

## Implementation Checklist

- [ ] Create database migration
- [ ] Run migration locally: `supabase db reset` or `supabase migration up`
- [ ] Update types in `packages/types`
- [ ] Update `selection.ts` to return IDs
- [ ] Update `/api/v1/serve` to log impressions
- [ ] Create `/api/v1/click/[id]` endpoint
- [ ] Create `/api/admin/analytics` endpoint
- [ ] Create analytics dashboard page
- [ ] Add Analytics to sidebar
- [ ] Update README with tracking documentation
- [ ] Run migration on production Supabase
- [ ] Deploy to Vercel

---

## Testing

1. Start local dev: `pnpm dev`
2. Create a placement and creative with targeting rule
3. Call serve API: `curl -H "X-API-Key: ..." "http://localhost:3000/api/v1/serve?placement=test"`
4. Check response includes `impression_id` and `tracking_url`
5. Visit the `tracking_url` - should redirect to affiliate URL
6. Check Supabase Studio for impression and click records
7. Visit `/analytics` to see stats

---

## Notes

- Impression logging is fire-and-forget (doesn't block response)
- Click tracking always redirects even on error (never break user flow)
- RLS ensures users only see their own data
- Consider adding aggregation job later for large-scale usage
