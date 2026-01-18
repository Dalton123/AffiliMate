// ===========================================
// Database Types for AffiliMate
// ===========================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ApiKeyScope = 'serve' | 'admin:read' | 'admin:write';

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string; // Only exposed field - never expose full key
  scopes: ApiKeyScope[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Placement {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string | null;
  default_size: string | null;
  fallback_creative_id: string | null;
  fallback_url: string | null;
  fallback_type: 'creative' | 'url' | 'none';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AffiliateNetwork = 'awin' | 'shareasale' | 'cj' | 'direct';

export interface Offer {
  id: string;
  project_id: string;
  name: string;
  advertiser_name: string | null;
  advertiser_id: string | null;
  network: AffiliateNetwork;
  category: string | null;
  base_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreativeFormat = 'banner' | 'text' | 'native';

export interface Creative {
  id: string;
  project_id: string;
  offer_id: string;
  name: string;
  click_url: string;
  image_url: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  size: string | null; // Generated: "300x250"
  format: CreativeFormat;
  awin_creative_id: string | null;
  awin_program_id: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  import_id: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (optional)
  offer?: Offer;
}

export interface TargetingRule {
  id: string;
  project_id: string;
  placement_id: string;
  creative_id: string;
  countries: string[]; // Empty = all countries
  categories: string[]; // Empty = all categories
  priority: number; // 0-100, higher = preferred
  weight: number; // 1-100, for random selection
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joined data (optional)
  creative?: Creative;
  placement?: Placement;
}

export type ImportStatus = 'pending' | 'processed' | 'failed' | 'skipped';

export interface CreativeImport {
  id: string;
  project_id: string;
  source: 'awin' | 'shareasale' | 'manual';
  imported_by: string | null;
  imported_at: string;
  raw_html: string;
  parsed_data: {
    click_url?: string;
    image_url?: string;
    width?: number;
    height?: number;
    alt_text?: string;
  } | null;
  status: ImportStatus;
  error_message: string | null;
  creative_id: string | null;
}

// ===========================================
// Analytics Types
// ===========================================

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

export interface DailyStat {
  id: string;
  project_id: string;
  date: string;
  placement_id: string | null;
  creative_id: string | null;
  country: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
}

// ===========================================
// Awin Integration Types
// ===========================================

export type AwinSyncStatus = 'pending' | 'success' | 'failed';

export interface AwinConnection {
  id: string;
  project_id: string;
  publisher_id: string;
  api_token_encrypted: string; // AES-256-GCM encrypted
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: AwinSyncStatus;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  project_id: string;
  offer_id: string | null;

  // Awin data (null if manually created)
  awin_promotion_id: string | null;
  awin_advertiser_id: string | null;
  awin_advertiser_name: string | null;

  // Deal content
  title: string;
  description: string | null;
  terms: string | null;
  voucher_code: string | null; // null = no code / auto-applied

  // Tracking
  tracking_url: string;

  // Validity
  start_date: string | null;
  end_date: string | null;

  // Targeting (GIN indexed arrays)
  regions: string[]; // ISO 3166-1 alpha-2 codes
  categories: string[];

  // Display
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;

  // Sync tracking
  synced_from_awin: boolean;
  last_synced_at: string | null;

  created_at: string;
  updated_at: string;

  // Joined data (optional)
  offer?: Offer;
}
