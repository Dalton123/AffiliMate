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

  // Phase 1: Parse all snippets (CPU only, no DB)
  interface ParsedSnippet {
    index: number;
    rawHtml: string;
    parsed: ReturnType<typeof parseAwinSnippet>;
    width: number | null;
    height: number | null;
    name: string;
  }

  const validSnippets: ParsedSnippet[] = [];
  const failedSnippets: { index: number; error: string }[] = [];

  for (let i = 0; i < body.snippets.length; i++) {
    const snippet = body.snippets[i];
    if (!snippet) continue;
    const rawHtml = snippet.trim();

    if (!rawHtml) continue;

    const parsed = parseAwinSnippet(rawHtml);

    if (!parsed || !parsed.click_url) {
      failedSnippets.push({
        index: i,
        error: 'Could not parse snippet - missing click URL',
      });
      continue;
    }

    const clientDims = body.dimensions?.[i];
    const width = parsed.width || clientDims?.width || null;
    const height = parsed.height || clientDims?.height || null;
    const name = width && height ? `${width}x${height} Banner` : generateCreativeName(parsed);

    validSnippets.push({ index: i, rawHtml, parsed, width, height, name });
  }

  // Add failed parse results
  for (const failed of failedSnippets) {
    results.push({
      index: failed.index,
      status: 'failed',
      error: failed.error,
    });
  }

  // If no valid snippets, return early
  if (validSnippets.length === 0) {
    const response: ImportCreativesResponse = {
      imported: 0,
      failed: failedSnippets.length,
      results,
    };
    return NextResponse.json(response, { status: 201 });
  }

  // Phase 2: Batch insert import records
  const importRecords = validSnippets.map((s) => ({
    project_id: project.id,
    source,
    imported_by: user.id,
    raw_html: s.rawHtml,
    parsed_data: s.parsed,
    status: 'pending' as const,
  }));

  const { data: insertedImports, error: importError } = await supabase
    .from('creative_imports')
    .insert(importRecords)
    .select('id');

  if (importError || !insertedImports) {
    // Fallback: mark all as failed
    for (const s of validSnippets) {
      results.push({
        index: s.index,
        status: 'failed',
        error: `Database error creating import records: ${importError?.message}`,
      });
    }
    const response: ImportCreativesResponse = {
      imported: 0,
      failed: results.length,
      results,
    };
    return NextResponse.json(response, { status: 201 });
  }

  // Phase 3: Batch insert creatives
  const creativeRecords = validSnippets.map((s, idx) => ({
    project_id: project.id,
    offer_id: body.offer_id,
    name: s.name,
    click_url: s.parsed!.click_url,
    image_url: s.parsed!.image_url,
    width: s.width,
    height: s.height,
    format: 'banner' as const,
    import_id: insertedImports[idx]?.id,
  }));

  const { data: insertedCreatives, error: creativeError } = await supabase
    .from('creatives')
    .insert(creativeRecords)
    .select('id');

  if (creativeError || !insertedCreatives) {
    // Update import records to failed
    const importIds = insertedImports.map((r) => r.id);
    await supabase
      .from('creative_imports')
      .update({ status: 'failed', error_message: creativeError?.message })
      .in('id', importIds);

    for (const s of validSnippets) {
      results.push({
        index: s.index,
        status: 'failed',
        error: `Failed to create creative: ${creativeError?.message}`,
      });
    }
    const response: ImportCreativesResponse = {
      imported: 0,
      failed: results.length,
      results,
    };
    return NextResponse.json(response, { status: 201 });
  }

  // Phase 4: Batch update import records with creative IDs
  const updatePromises = insertedImports.map((importRec, idx) =>
    supabase
      .from('creative_imports')
      .update({
        creative_id: insertedCreatives[idx]?.id,
        status: 'processed',
      })
      .eq('id', importRec.id)
  );
  await Promise.all(updatePromises);

  // Phase 5: Batch insert targeting rules if needed
  if (body.auto_create_rules && body.target_placement_id) {
    const ruleRecords = insertedCreatives.map((creative) => ({
      project_id: project.id,
      placement_id: body.target_placement_id,
      creative_id: creative.id,
      countries: body.default_countries || [],
      priority: 50,
      weight: 100,
    }));

    await supabase.from('targeting_rules').insert(ruleRecords);
  }

  // Build success results
  for (let i = 0; i < validSnippets.length; i++) {
    const s = validSnippets[i]!;
    const creative = insertedCreatives[i];

    results.push({
      index: s.index,
      status: 'success',
      creative_id: creative?.id,
      parsed: {
        click_url: s.parsed!.click_url!,
        image_url: s.parsed!.image_url,
        width: s.parsed!.width,
        height: s.parsed!.height,
      },
    });
  }

  // Sort results by original index
  results.sort((a, b) => a.index - b.index);

  const response: ImportCreativesResponse = {
    imported: validSnippets.length,
    failed: failedSnippets.length,
    results,
  };

  return NextResponse.json(response, { status: 201 });
}
