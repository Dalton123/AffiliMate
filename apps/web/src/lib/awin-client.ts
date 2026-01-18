/**
 * Awin Publisher API Client
 *
 * Fetches promotions and deals from Awin's API.
 * Documentation: https://developer.awin.com/apidocs/promotions
 *
 * Rate limit: 20 calls/minute - use caching!
 */

import { LRUCache } from './cache';

// Cache promotions for 10 minutes to respect rate limits
const promotionsCache = new LRUCache<AwinPromotion[]>({
  maxSize: 100,
  ttlMs: 10 * 60 * 1000, // 10 minutes
});

// --- Types ---

export interface AwinPromotion {
  id: string;
  title: string;
  description: string;
  terms?: string;
  type: 'voucher' | 'promotion';
  voucherCode?: string;
  url: string;
  startDate: string;
  endDate?: string;
  regions: string[];
  promotionCategories: string[];
  advertiserName?: string;
  advertiserId?: string;
}

export interface AwinApiResponse {
  promotions?: AwinPromotionRaw[];
  error?: string;
}

// Raw API response shape (before normalization)
interface AwinPromotionRaw {
  id: number;
  title: string;
  description: string;
  terms?: string;
  type: string;
  voucherCode?: string;
  url: string;
  startDate: string;
  endDate?: string;
  regions?: Array<{ region: string }>;
  promotionCategories?: Array<{ id: number; name: string }>;
  advertiser?: {
    id: number;
    name: string;
  };
}

export interface FetchPromotionsOptions {
  region?: string;
  category?: string;
  promotionType?: 'voucher' | 'promotion';
  advertiserId?: string;
}

// --- API Functions ---

const AWIN_API_BASE = 'https://api.awin.com';

/**
 * Fetch promotions from Awin Publisher API.
 *
 * @param publisherId - Your Awin publisher ID
 * @param token - OAuth2 access token from Awin
 * @param options - Optional filters
 * @returns Array of normalized promotions
 */
export async function fetchAwinPromotions(
  publisherId: string,
  token: string,
  options: FetchPromotionsOptions = {}
): Promise<AwinPromotion[]> {
  // Build cache key
  const cacheKey = `${publisherId}:${JSON.stringify(options)}`;

  // Check cache first
  const cached = promotionsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Build URL with query params
  const url = new URL(`${AWIN_API_BASE}/publishers/${publisherId}/promotions`);

  if (options.region) {
    url.searchParams.set('region', options.region);
  }
  if (options.category) {
    url.searchParams.set('promotionCategory', options.category);
  }
  if (options.promotionType) {
    url.searchParams.set('promotionType', options.promotionType);
  }
  if (options.advertiserId) {
    url.searchParams.set('advertiserId', options.advertiserId);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      // Next.js fetch caching
      next: { revalidate: 600 }, // 10 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Awin] API error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('Awin API authentication failed - check your token');
      }
      if (response.status === 429) {
        throw new Error('Awin API rate limit exceeded - try again later');
      }

      throw new Error(`Awin API error: ${response.status}`);
    }

    const data = await response.json();
    const promotions = normalizePromotions(data);

    // Cache the results
    promotionsCache.set(cacheKey, promotions);

    return promotions;
  } catch (error) {
    console.error('[Awin] Fetch error:', error);
    throw error;
  }
}

/**
 * Normalize raw Awin API response to our standard format.
 */
function normalizePromotions(data: AwinPromotionRaw[] | AwinApiResponse): AwinPromotion[] {
  // Handle both array and object responses
  const raw = Array.isArray(data) ? data : (data.promotions ?? []);

  return raw.map((promo) => ({
    id: String(promo.id),
    title: promo.title,
    description: promo.description,
    terms: promo.terms,
    type: promo.type === 'voucher' ? 'voucher' : 'promotion',
    voucherCode: promo.voucherCode,
    url: promo.url,
    startDate: promo.startDate,
    endDate: promo.endDate,
    regions: promo.regions?.map((r) => r.region) ?? [],
    promotionCategories: promo.promotionCategories?.map((c) => c.name) ?? [],
    advertiserName: promo.advertiser?.name,
    advertiserId: promo.advertiser ? String(promo.advertiser.id) : undefined,
  }));
}

/**
 * Filter promotions by criteria.
 * Use this for client-side filtering after fetching.
 */
export function filterPromotions(
  promotions: AwinPromotion[],
  filters: {
    region?: string;
    category?: string;
    hasVoucherCode?: boolean;
    activeOnly?: boolean;
  }
): AwinPromotion[] {
  return promotions.filter((promo) => {
    // Region filter
    if (filters.region && promo.regions.length > 0) {
      if (!promo.regions.includes(filters.region)) {
        return false;
      }
    }

    // Category filter
    if (filters.category) {
      const lowerCategory = filters.category.toLowerCase();
      if (!promo.promotionCategories.some((c) => c.toLowerCase().includes(lowerCategory))) {
        return false;
      }
    }

    // Voucher code filter
    if (filters.hasVoucherCode && !promo.voucherCode) {
      return false;
    }

    // Active filter (not expired)
    if (filters.activeOnly && promo.endDate) {
      if (new Date(promo.endDate) < new Date()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Clear the promotions cache.
 * Call this after syncing or when credentials change.
 */
export function clearPromotionsCache(): void {
  promotionsCache.clear();
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): { size: number } {
  return { size: promotionsCache.size };
}
