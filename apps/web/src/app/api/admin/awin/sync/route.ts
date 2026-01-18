import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { fetchAwinPromotions, clearPromotionsCache, type AwinPromotion } from '@/lib/awin-client';
import type { ApiError } from '@affilimate/types';

interface SyncRequest {
  promotion_ids?: string[]; // Optional: specific promotions to sync (sync all if empty)
  clear_existing?: boolean; // Whether to remove deals not in the sync
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

// POST /api/admin/awin/sync - Sync promotions from Awin to deals table
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json<ApiError>(
      { error: 'no_project', message: 'No project found' },
      { status: 404 }
    );
  }

  // Get Awin connection
  const { data: connection, error: connError } = await supabase
    .from('awin_connections')
    .select('id, publisher_id, api_token_encrypted, is_active')
    .eq('project_id', project.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json<ApiError>(
      { error: 'not_connected', message: 'Awin is not connected.' },
      { status: 400 }
    );
  }

  const body: SyncRequest = await request.json().catch(() => ({}));

  try {
    // Clear cache to get fresh data
    clearPromotionsCache();

    // Decrypt token and fetch promotions
    const token = decrypt(connection.api_token_encrypted);
    let promotions = await fetchAwinPromotions(connection.publisher_id, token);

    // Filter to specific IDs if provided
    if (body.promotion_ids?.length) {
      const idSet = new Set(body.promotion_ids);
      promotions = promotions.filter((p) => idSet.has(p.id));
    }

    const result: SyncResult = {
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Get existing Awin deals for this project
    const { data: existingDeals } = await supabase
      .from('deals')
      .select('id, awin_promotion_id')
      .eq('project_id', project.id)
      .eq('synced_from_awin', true);

    const existingMap = new Map(
      (existingDeals || []).map((d) => [d.awin_promotion_id, d.id])
    );

    // Process each promotion
    for (const promo of promotions) {
      try {
        const dealData = promotionToDeal(promo, project.id);
        const existingId = existingMap.get(promo.id);

        if (existingId) {
          // Update existing deal
          const { error } = await supabase
            .from('deals')
            .update({
              ...dealData,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', existingId);

          if (error) throw error;
          result.updated++;
        } else {
          // Create new deal
          const { error } = await supabase.from('deals').insert(dealData);

          if (error) throw error;
          result.created++;
        }

        result.synced++;
      } catch (err) {
        result.errors.push({
          id: promo.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update sync status on connection
    await supabase
      .from('awin_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: result.errors.length === 0 ? 'success' : 'failed',
        sync_error:
          result.errors.length > 0
            ? `${result.errors.length} promotion(s) failed to sync`
            : null,
      })
      .eq('id', connection.id);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[Awin Sync] Failed:', error);

    // Update sync status on connection
    await supabase
      .from('awin_connections')
      .update({
        sync_status: 'failed',
        sync_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', connection.id);

    return NextResponse.json<ApiError>(
      {
        error: 'sync_failed',
        message: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}

// Transform Awin promotion to deal record
function promotionToDeal(promo: AwinPromotion, projectId: string) {
  return {
    project_id: projectId,
    awin_promotion_id: promo.id,
    awin_advertiser_id: promo.advertiserId || null,
    awin_advertiser_name: promo.advertiserName || null,
    title: promo.title,
    description: promo.description || null,
    terms: promo.terms || null,
    voucher_code: promo.voucherCode || null,
    tracking_url: promo.url,
    start_date: promo.startDate || null,
    end_date: promo.endDate || null,
    regions: promo.regions || [],
    categories: promo.promotionCategories || [],
    is_active: true,
    is_featured: false,
    sort_order: 0,
    synced_from_awin: true,
    last_synced_at: new Date().toISOString(),
  };
}
