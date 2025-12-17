-- ===========================================
-- AffiliMate Initial Schema
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Profiles (linked to auth.users)
-- ===========================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ===========================================
-- Projects (Workspaces)
-- ===========================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_slug ON projects(slug);

-- RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage projects"
  ON projects FOR ALL
  USING (auth.uid() = owner_id);

-- ===========================================
-- API Keys
-- ===========================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['serve'],
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_project ON api_keys(project_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- RLS for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage keys"
  ON api_keys FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ===========================================
-- Placements
-- ===========================================
CREATE TABLE placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  default_size TEXT,
  fallback_creative_id UUID, -- Will add FK after creatives table
  fallback_url TEXT,
  fallback_type TEXT DEFAULT 'none' CHECK (fallback_type IN ('creative', 'url', 'none')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

CREATE INDEX idx_placements_project ON placements(project_id);
CREATE INDEX idx_placements_slug ON placements(project_id, slug);

-- RLS for placements
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage placements"
  ON placements FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ===========================================
-- Offers (Affiliate Advertisers)
-- ===========================================
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  advertiser_name TEXT,
  advertiser_id TEXT,
  network TEXT DEFAULT 'awin' CHECK (network IN ('awin', 'shareasale', 'cj', 'direct')),
  category TEXT,
  base_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_project ON offers(project_id);
CREATE INDEX idx_offers_category ON offers(project_id, category);

-- RLS for offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage offers"
  ON offers FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ===========================================
-- Creative Imports (Raw HTML Records)
-- ===========================================
CREATE TABLE creative_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'awin' CHECK (source IN ('awin', 'shareasale', 'manual')),
  imported_by UUID REFERENCES profiles(id),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  raw_html TEXT NOT NULL,
  parsed_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'skipped')),
  error_message TEXT,
  creative_id UUID -- Will add FK after creatives table
);

CREATE INDEX idx_imports_project ON creative_imports(project_id);
CREATE INDEX idx_imports_status ON creative_imports(project_id, status);

-- RLS for creative_imports
ALTER TABLE creative_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage imports"
  ON creative_imports FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ===========================================
-- Creatives (Images/Links)
-- ===========================================
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  click_url TEXT NOT NULL,
  image_url TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  size TEXT GENERATED ALWAYS AS (
    CASE WHEN width IS NOT NULL AND height IS NOT NULL
    THEN width::TEXT || 'x' || height::TEXT
    ELSE NULL END
  ) STORED,
  format TEXT DEFAULT 'banner' CHECK (format IN ('banner', 'text', 'native')),
  awin_creative_id TEXT,
  awin_program_id TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  import_id UUID REFERENCES creative_imports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creatives_project ON creatives(project_id);
CREATE INDEX idx_creatives_offer ON creatives(offer_id);
CREATE INDEX idx_creatives_size ON creatives(project_id, size);
CREATE INDEX idx_creatives_active ON creatives(project_id, is_active) WHERE is_active = true;

-- RLS for creatives
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage creatives"
  ON creatives FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Add FK from creative_imports to creatives
ALTER TABLE creative_imports
  ADD CONSTRAINT fk_creative_imports_creative
  FOREIGN KEY (creative_id) REFERENCES creatives(id) ON DELETE SET NULL;

-- Add FK from placements to creatives (fallback)
ALTER TABLE placements
  ADD CONSTRAINT fk_placements_fallback_creative
  FOREIGN KEY (fallback_creative_id) REFERENCES creatives(id) ON DELETE SET NULL;

-- ===========================================
-- Targeting Rules
-- ===========================================
CREATE TABLE targeting_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  placement_id UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  creative_id UUID NOT NULL REFERENCES creatives(id) ON DELETE CASCADE,
  countries TEXT[] DEFAULT ARRAY[]::TEXT[],
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 100),
  weight INTEGER DEFAULT 100 CHECK (weight >= 1 AND weight <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(placement_id, creative_id)
);

CREATE INDEX idx_rules_project ON targeting_rules(project_id);
CREATE INDEX idx_rules_placement ON targeting_rules(placement_id);
CREATE INDEX idx_rules_active ON targeting_rules(placement_id, is_active) WHERE is_active = true;

-- RLS for targeting_rules
ALTER TABLE targeting_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage rules"
  ON targeting_rules FOR ALL
  USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ===========================================
-- Updated At Trigger
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creatives_updated_at
  BEFORE UPDATE ON creatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_targeting_rules_updated_at
  BEFORE UPDATE ON targeting_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
