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
