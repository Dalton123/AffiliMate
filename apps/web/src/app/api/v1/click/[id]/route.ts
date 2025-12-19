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
    const decodedUrl = decodeURIComponent(url);
    const supabase = await createAdminClient();

    // Get impression to find project_id and creative_id
    const { data: impression } = await supabase
      .from('impressions')
      .select('project_id, creative_id, country')
      .eq('id', impressionId)
      .single();

    if (impression) {
      // Log click (fire and forget)
      supabase
        .from('clicks')
        .insert({
          impression_id: impressionId,
          project_id: impression.project_id,
          creative_id: impression.creative_id,
          country: impression.country,
        })
        .then(() => {});
    }

    // Redirect to affiliate URL
    return NextResponse.redirect(decodedUrl, { status: 302 });
  } catch (error) {
    // On any error, still redirect (don't break the user experience)
    try {
      return NextResponse.redirect(decodeURIComponent(url), { status: 302 });
    } catch {
      // If URL decode fails, return error
      return NextResponse.json(
        { error: 'invalid_url', message: 'Invalid URL provided' },
        { status: 400 }
      );
    }
  }
}
