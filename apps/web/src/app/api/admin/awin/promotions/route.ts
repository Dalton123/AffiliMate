import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { fetchAwinPromotions } from '@/lib/awin-client';
import type { ApiError } from '@affilimate/types';

// GET /api/admin/awin/promotions - Preview available promotions from Awin
export async function GET(request: NextRequest) {
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
    .select('publisher_id, api_token_encrypted, is_active')
    .eq('project_id', project.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json<ApiError>(
      { error: 'not_connected', message: 'Awin is not connected. Please connect your Awin account first.' },
      { status: 400 }
    );
  }

  if (!connection.is_active) {
    return NextResponse.json<ApiError>(
      { error: 'connection_inactive', message: 'Awin connection is inactive.' },
      { status: 400 }
    );
  }

  // Get optional filters from query params
  const searchParams = request.nextUrl.searchParams;
  const region = searchParams.get('region') || undefined;
  const category = searchParams.get('category') || undefined;
  const promotionType = searchParams.get('type') as 'voucher' | 'promotion' | undefined;

  try {
    // Decrypt token and fetch promotions
    const token = decrypt(connection.api_token_encrypted);
    const promotions = await fetchAwinPromotions(connection.publisher_id, token, {
      region,
      category,
      promotionType,
    });

    return NextResponse.json({
      promotions,
      total: promotions.length,
      filters: { region, category, promotionType },
    });
  } catch (error) {
    console.error('[Awin] Fetch promotions failed:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch promotions from Awin';

    return NextResponse.json<ApiError>(
      { error: 'awin_api_error', message },
      { status: 502 }
    );
  }
}
