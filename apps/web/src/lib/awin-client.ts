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
// Based on actual Awin Promotions POST API response
interface AwinPromotionRaw {
  promotionId: number;
  title: string;
  description: string;
  terms?: string;
  type: string;
  voucher?: {
    code?: string;
  };
  urlTracking: string;
  startsAt: string;
  endsAt?: string;
  regions?: {
    all: boolean;
    list?: Array<{ name: string; countryCode: string }>;
  };
  categories?: Array<{ id: number; name: string }>;
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

  // Build URL - note: singular /publisher/ not /publishers/
  const url = new URL(`${AWIN_API_BASE}/publisher/${publisherId}/promotions`);

  // Build request body with filters
  // Valid filter fields: advertiserIds, exclusiveOnly, membership, regionCodes, status, type, updatedSince
  const requestBody = {
    filters: {
      membership: 'joined', // Only get offers from advertisers we're joined to
      status: 'active',
      ...(options.promotionType && { type: options.promotionType }),
      ...(options.region && { regionCodes: [options.region] }),
      ...(options.advertiserId && { advertiserIds: [options.advertiserId] }), // string array
    },
    pagination: {
      page: 1,
      pageSize: 100,
    },
  };

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    // Debug: log raw response structure
    console.log('[Awin] Raw response keys:', Object.keys(data));
    console.log('[Awin] Raw response sample:', JSON.stringify(data).slice(0, 500));

    const promotions = normalizePromotions(data);
    console.log('[Awin] Normalized promotions count:', promotions.length);

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
function normalizePromotions(data: AwinPromotionRaw[] | AwinApiResponse | { offers?: AwinPromotionRaw[] }): AwinPromotion[] {
  // Handle various response formats
  let raw: AwinPromotionRaw[];
  if (Array.isArray(data)) {
    raw = data;
  } else if ('promotions' in data && Array.isArray(data.promotions)) {
    raw = data.promotions;
  } else if ('offers' in data && Array.isArray(data.offers)) {
    raw = data.offers;
  } else {
    console.warn('[Awin] Unknown response structure, keys:', Object.keys(data));
    raw = [];
  }

  return raw.map((promo) => ({
    id: String(promo.promotionId),
    title: promo.title,
    description: promo.description,
    terms: promo.terms,
    type: promo.type === 'voucher' ? 'voucher' : 'promotion',
    voucherCode: promo.voucher?.code,
    url: promo.urlTracking,
    startDate: promo.startsAt,
    endDate: promo.endsAt,
    regions: promo.regions?.all
      ? ['ALL']
      : (promo.regions?.list?.map((r) => r.countryCode) ?? []),
    promotionCategories: promo.categories?.map((c) => c.name) ?? [],
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
