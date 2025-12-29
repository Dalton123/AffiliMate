// ===========================================
// API Request/Response Types for AffiliMate
// ===========================================

import type { CreativeFormat } from './database';

// =====================
// Serve Endpoint
// =====================

export interface ServeRequest {
  placement: string; // Required: placement slug
  country?: string; // 2-letter ISO code override
  coords?: string; // "lat,lng" for future geo lookup
  category?: string; // Category filter
  size?: string; // Size filter "WxH"
  format?: CreativeFormat; // Format filter
  debug?: boolean; // Include debug info
  limit?: number; // Number of creatives to return (default: 1, max: 10)
}

export interface ServeCreative {
  click_url: string;
  image_url: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  format: CreativeFormat;
}

export interface GeoInfo {
  country: string | null;
  source: 'param' | 'vercel-header' | 'cloudflare-header' | 'unknown';
}

export interface ServeCreativeItem {
  creative: ServeCreative;
  impression_id: string;
  tracking_url: string;
}

export interface ServeResponse {
  creative: ServeCreative | null;
  fallback: boolean;
  fallback_type?: 'placement_default' | 'none';
  geo?: GeoInfo;
  debug?: {
    rules_matched: number;
    selection_reason: string;
  };
  impression_id?: string;
  tracking_url?: string;
  creatives?: ServeCreativeItem[]; // Array of creatives when limit > 1
}

// =====================
// Admin API
// =====================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Placement CRUD
export interface CreatePlacementRequest {
  name: string;
  slug: string;
  description?: string;
  default_size?: string;
  fallback_type?: 'creative' | 'url' | 'none';
  fallback_creative_id?: string;
  fallback_url?: string;
}

export interface UpdatePlacementRequest extends Partial<CreatePlacementRequest> {
  is_active?: boolean;
}

// Offer CRUD
export interface CreateOfferRequest {
  name: string;
  advertiser_name?: string;
  advertiser_id?: string;
  network?: 'awin' | 'shareasale' | 'cj' | 'direct';
  category?: string;
  base_url?: string;
  notes?: string;
}

export interface UpdateOfferRequest extends Partial<CreateOfferRequest> {
  is_active?: boolean;
}

// Creative CRUD
export interface CreateCreativeRequest {
  offer_id: string;
  name: string;
  click_url: string;
  image_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  format?: CreativeFormat;
  awin_creative_id?: string;
  awin_program_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdateCreativeRequest extends Partial<CreateCreativeRequest> {
  is_active?: boolean;
}

// Targeting Rule CRUD
export interface CreateRuleRequest {
  placement_id: string;
  creative_id: string;
  countries?: string[];
  categories?: string[];
  priority?: number;
  weight?: number;
}

export interface UpdateRuleRequest extends Partial<CreateRuleRequest> {
  is_active?: boolean;
}

// API Key Management
export interface CreateApiKeyRequest {
  name: string;
  scopes?: ('serve' | 'admin:read' | 'admin:write')[];
  expires_at?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Full key - shown ONCE
  key_prefix: string;
  scopes: string[];
  expires_at: string | null;
  created_at: string;
}

// Bulk Import
export interface ImportCreativesRequest {
  offer_id: string;
  snippets: string[];
  source?: 'awin' | 'shareasale' | 'manual';
  default_countries?: string[];
  auto_create_rules?: boolean;
  target_placement_id?: string;
  /** Client-detected dimensions for each snippet (from image naturalWidth/naturalHeight) */
  dimensions?: Array<{ width: number; height: number } | null>;
}

export interface ImportResult {
  index: number;
  status: 'success' | 'failed';
  creative_id?: string;
  parsed?: {
    click_url: string;
    image_url?: string;
    width?: number;
    height?: number;
  };
  error?: string;
}

export interface ImportCreativesResponse {
  imported: number;
  failed: number;
  results: ImportResult[];
}

// =====================
// Analytics API
// =====================

export interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  ctr: number;
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

export interface AnalyticsResponse {
  summary: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
  previousSummary: {
    impressions: number;
    clicks: number;
    ctr: number;
  } | null;
  changes: {
    impressions: number | null;
    clicks: number | null;
    ctr: number | null;
  } | null;
  period: {
    days: number;
    start: string;
  };
}
