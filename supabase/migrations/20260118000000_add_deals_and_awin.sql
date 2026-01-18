-- Add deals table and Awin connection tracking
-- For serving curated affiliate deals via /api/v1/deals

-- Awin connections: Store credentials per project
CREATE TABLE awin_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  publisher_id TEXT NOT NULL,
  api_token_encrypted TEXT NOT NULL, -- encrypted with ENCRYPTION_KEY
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id) -- One Awin connection per project
);

-- Deals: Synced from Awin or manually created
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,

  -- Awin data (null if manually created)
  awin_promotion_id TEXT,
  awin_advertiser_id TEXT,
  awin_advertiser_name TEXT,

  -- Deal content
  title TEXT NOT NULL,
  description TEXT,
  terms TEXT,
  voucher_code TEXT, -- null = no code / auto-applied

  -- Tracking
  tracking_url TEXT NOT NULL,

  -- Validity
  start_date DATE,
  end_date DATE,

  -- Targeting (GIN indexed)
  regions TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',

  -- Display
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Sync tracking
  synced_from_awin BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for deals
CREATE INDEX deals_project_idx ON deals(project_id);
CREATE INDEX deals_offer_idx ON deals(offer_id);
CREATE INDEX deals_awin_promo_idx ON deals(awin_promotion_id);
CREATE INDEX deals_regions_idx ON deals USING GIN(regions);
CREATE INDEX deals_categories_idx ON deals USING GIN(categories);
CREATE INDEX deals_active_featured_idx ON deals(project_id, is_active, is_featured DESC, sort_order);

-- RLS for awin_connections
ALTER TABLE awin_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project's Awin connection"
  ON awin_connections FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage their project's Awin connection"
  ON awin_connections FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  ));

-- RLS for deals (admin access)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their project's deals"
  ON deals FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage their project's deals"
  ON deals FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  ));

-- Public read for deals (via API key auth, not RLS)
-- The /api/v1/deals endpoint validates API keys server-side

-- Updated_at trigger for awin_connections
CREATE TRIGGER awin_connections_updated_at
  BEFORE UPDATE ON awin_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for deals
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE awin_connections IS 'Stores Awin API credentials per project for syncing promotions';
COMMENT ON TABLE deals IS 'Curated affiliate deals served via /api/v1/deals endpoint';
COMMENT ON COLUMN awin_connections.api_token_encrypted IS 'AES-256-GCM encrypted Awin OAuth token';
COMMENT ON COLUMN deals.regions IS 'ISO 3166-1 alpha-2 country codes for geo-targeting';
