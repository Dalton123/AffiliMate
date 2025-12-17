import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  ImportCreativesRequest,
  ImportCreativesResponse,
  ImportResult,
  ApiError,
} from '@affilimate/types';
import { parseAwinSnippet, generateCreativeName } from '@/lib/snippet-parser';

// POST /api/admin/creatives/import - Bulk import creatives from HTML snippets
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

  const body: ImportCreativesRequest = await request.json();

  // Validation
  if (!body.offer_id) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'offer_id is required' },
      { status: 400 }
    );
  }

  if (!body.snippets || body.snippets.length === 0) {
    return NextResponse.json<ApiError>(
      { error: 'validation_error', message: 'At least one snippet is required' },
      { status: 400 }
    );
  }

  // Verify offer exists and belongs to project
  const { data: offer } = await supabase
    .from('offers')
    .select('id')
    .eq('id', body.offer_id)
    .eq('project_id', project.id)
    .single();

  if (!offer) {
    return NextResponse.json<ApiError>(
      { error: 'not_found', message: 'Offer not found' },
      { status: 404 }
    );
  }

  // If auto-creating rules, verify placement exists
  if (body.auto_create_rules && body.target_placement_id) {
    const { data: placement } = await supabase
      .from('placements')
      .select('id')
      .eq('id', body.target_placement_id)
      .eq('project_id', project.id)
      .single();

    if (!placement) {
      return NextResponse.json<ApiError>(
        { error: 'not_found', message: 'Target placement not found' },
        { status: 404 }
      );
    }
  }

  const source = body.source || 'awin';
  const results: ImportResult[] = [];

  // Process each snippet
  for (let i = 0; i < body.snippets.length; i++) {
    const snippet = body.snippets[i];
    if (!snippet) continue;
    const rawHtml = snippet.trim();

    if (!rawHtml) {
      continue; // Skip empty snippets
    }

    // Parse the snippet
    const parsed = parseAwinSnippet(rawHtml);

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('creative_imports')
      .insert({
        project_id: project.id,
        source,
        imported_by: user.id,
        raw_html: rawHtml,
        parsed_data: parsed,
        status: parsed ? 'pending' : 'failed',
        error_message: parsed ? null : 'Failed to parse snippet - missing click URL',
      })
      .select()
      .single();

    if (importError) {
      results.push({
        index: i,
        status: 'failed',
        error: `Database error: ${importError.message}`,
      });
      continue;
    }

    // If parsing failed, record error and continue
    if (!parsed || !parsed.click_url) {
      results.push({
        index: i,
        status: 'failed',
        error: 'Could not parse snippet - missing click URL',
      });
      continue;
    }

    // Use client-detected dimensions if HTML didn't have them
    const clientDims = body.dimensions?.[i];
    const width = parsed.width || clientDims?.width || null;
    const height = parsed.height || clientDims?.height || null;

    // Create the creative
    const creativeName = width && height ? `${width}x${height} Banner` : generateCreativeName(parsed);
    const { data: creative, error: creativeError } = await supabase
      .from('creatives')
      .insert({
        project_id: project.id,
        offer_id: body.offer_id,
        name: creativeName,
        click_url: parsed.click_url,
        image_url: parsed.image_url,
        width,
        height,
        format: 'banner',
        import_id: importRecord.id,
      })
      .select()
      .single();

    if (creativeError) {
      // Update import record to failed
      await supabase
        .from('creative_imports')
        .update({
          status: 'failed',
          error_message: creativeError.message,
        })
        .eq('id', importRecord.id);

      results.push({
        index: i,
        status: 'failed',
        error: `Failed to create creative: ${creativeError.message}`,
      });
      continue;
    }

    // Update import record with creative_id and status
    await supabase
      .from('creative_imports')
      .update({
        creative_id: creative.id,
        status: 'processed',
      })
      .eq('id', importRecord.id);

    // Optionally create targeting rule
    if (body.auto_create_rules && body.target_placement_id) {
      await supabase.from('targeting_rules').insert({
        project_id: project.id,
        placement_id: body.target_placement_id,
        creative_id: creative.id,
        countries: body.default_countries || [],
        priority: 50,
        weight: 100,
      });
    }

    results.push({
      index: i,
      status: 'success',
      creative_id: creative.id,
      parsed: {
        click_url: parsed.click_url,
        image_url: parsed.image_url,
        width: parsed.width,
        height: parsed.height,
      },
    });
  }

  const response: ImportCreativesResponse = {
    imported: results.filter((r) => r.status === 'success').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };

  return NextResponse.json(response, { status: 201 });
}
