import { createAdminClient } from './supabase/server';
import type { ServeCreative, CreativeFormat } from '@affilimate/types';

export interface SelectionParams {
  projectId: string;
  placementSlug: string;
  country: string | null;
  category?: string | null;
  size?: string | null;
  format?: string | null;
}

export interface SelectionResult {
  creative: ServeCreative | null;
  fallback: boolean;
  fallbackType?: 'creative' | 'url' | 'none';
  fallbackUrl?: string;
  rulesMatched: number;
  selectionReason: string;
  error?: 'placement_not_found' | 'placement_inactive';
  // IDs for analytics tracking
  placementId?: string;
  creativeId?: string;
  ruleId?: string;
}

interface RuleWithCreative {
  id: string;
  countries: string[];
  categories: string[];
  priority: number;
  weight: number;
  is_active: boolean;
  creative: {
    id: string;
    name: string;
    click_url: string;
    image_url: string | null;
    alt_text: string | null;
    width: number | null;
    height: number | null;
    size: string | null;
    format: CreativeFormat;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    offer: {
      id: string;
      category: string | null;
    };
  };
}

export async function selectCreative(params: SelectionParams): Promise<SelectionResult> {
  const { projectId, placementSlug, country, category, size, format } = params;
  const supabase = await createAdminClient();

  // 1. Fetch placement by project_id + slug
  const { data: placement, error: placementError } = await supabase
    .from('placements')
    .select('id, is_active, fallback_type, fallback_creative_id, fallback_url')
    .eq('project_id', projectId)
    .eq('slug', placementSlug)
    .single();

  if (placementError || !placement) {
    return {
      creative: null,
      fallback: true,
      fallbackType: 'none',
      rulesMatched: 0,
      selectionReason: 'Placement not found',
      error: 'placement_not_found',
    };
  }

  if (!placement.is_active) {
    return {
      creative: null,
      fallback: true,
      fallbackType: 'none',
      rulesMatched: 0,
      selectionReason: 'Placement is inactive',
      error: 'placement_inactive',
    };
  }

  // 2. Query targeting_rules with joins
  const { data: rules, error: rulesError } = await supabase
    .from('targeting_rules')
    .select(`
      id,
      countries,
      categories,
      priority,
      weight,
      is_active,
      creative:creatives (
        id,
        name,
        click_url,
        image_url,
        alt_text,
        width,
        height,
        size,
        format,
        is_active,
        start_date,
        end_date,
        offer:offers (
          id,
          category
        )
      )
    `)
    .eq('placement_id', placement.id)
    .eq('is_active', true);

  if (rulesError) {
    console.error('Error fetching rules:', rulesError);
    return applyFallback(supabase, placement, 0, 'Database error fetching rules');
  }

  // Type the rules properly
  const typedRules = (rules || []) as unknown as RuleWithCreative[];

  // 3. Filter rules
  const today = new Date().toISOString().split('T')[0]!;
  const filteredRules = typedRules.filter((rule) => {
    const creative = rule.creative;

    // Skip if creative is inactive
    if (!creative || !creative.is_active) return false;

    // Country filter: empty array = match all, otherwise must include country
    if (rule.countries.length > 0 && country) {
      if (!rule.countries.includes(country)) return false;
    }

    // Category filter: if request has category, check rule.categories or offer.category
    if (category) {
      const ruleMatchesCategory =
        rule.categories.length === 0 || rule.categories.includes(category);
      const offerMatchesCategory = creative.offer?.category === category;
      if (!ruleMatchesCategory && !offerMatchesCategory) return false;
    }

    // Size filter
    if (size && creative.size !== size) return false;

    // Format filter
    if (format && creative.format !== format) return false;

    // Date range filter
    if (creative.start_date && creative.start_date > today) return false;
    if (creative.end_date && creative.end_date < today) return false;

    return true;
  });

  // 4. If no matches, apply fallback
  if (filteredRules.length === 0) {
    return applyFallback(supabase, placement, typedRules.length, 'No rules matched filters');
  }

  // 5. Sort by priority DESC
  filteredRules.sort((a, b) => b.priority - a.priority);

  // 6. Get top priority rules
  const topRule = filteredRules[0]!;
  const topPriority = topRule.priority;
  const topRules = filteredRules.filter((r) => r.priority === topPriority);

  // 7. Weighted random selection
  const selectedRule = weightedRandomSelect(topRules);

  const serveCreative: ServeCreative = {
    click_url: selectedRule.creative.click_url,
    image_url: selectedRule.creative.image_url,
    alt_text: selectedRule.creative.alt_text,
    width: selectedRule.creative.width,
    height: selectedRule.creative.height,
    format: selectedRule.creative.format,
  };

  return {
    creative: serveCreative,
    fallback: false,
    rulesMatched: filteredRules.length,
    selectionReason: `Selected "${selectedRule.creative.name}" (priority: ${selectedRule.priority}, weight: ${selectedRule.weight}/${topRules.reduce((sum, r) => sum + r.weight, 0)})`,
    placementId: placement.id,
    creativeId: selectedRule.creative.id,
    ruleId: selectedRule.id,
  };
}

function weightedRandomSelect(rules: RuleWithCreative[]): RuleWithCreative {
  if (rules.length === 1) return rules[0]!;

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const rule of rules) {
    random -= rule.weight;
    if (random <= 0) return rule;
  }

  // Fallback to last rule (should never reach here, but TypeScript needs it)
  return rules[rules.length - 1]!;
}

// Multi-creative selection types and function
export interface MultiSelectionParams extends SelectionParams {
  limit: number;
}

export interface MultiSelectionItem {
  creative: ServeCreative;
  creativeId: string;
  ruleId: string;
}

export interface MultiSelectionResult {
  creatives: MultiSelectionItem[];
  fallback: boolean;
  rulesMatched: number;
  selectionReason: string;
  error?: 'placement_not_found' | 'placement_inactive';
  placementId?: string;
}

export async function selectMultipleCreatives(
  params: MultiSelectionParams
): Promise<MultiSelectionResult> {
  const { projectId, placementSlug, country, category, size, format, limit } = params;
  const supabase = await createAdminClient();

  // 1. Fetch placement by project_id + slug
  const { data: placement, error: placementError } = await supabase
    .from('placements')
    .select('id, is_active, fallback_type, fallback_creative_id, fallback_url')
    .eq('project_id', projectId)
    .eq('slug', placementSlug)
    .single();

  if (placementError || !placement) {
    return {
      creatives: [],
      fallback: true,
      rulesMatched: 0,
      selectionReason: 'Placement not found',
      error: 'placement_not_found',
    };
  }

  if (!placement.is_active) {
    return {
      creatives: [],
      fallback: true,
      rulesMatched: 0,
      selectionReason: 'Placement is inactive',
      error: 'placement_inactive',
    };
  }

  // 2. Query targeting_rules with joins
  const { data: rules, error: rulesError } = await supabase
    .from('targeting_rules')
    .select(`
      id,
      countries,
      categories,
      priority,
      weight,
      is_active,
      creative:creatives (
        id,
        name,
        click_url,
        image_url,
        alt_text,
        width,
        height,
        size,
        format,
        is_active,
        start_date,
        end_date,
        offer:offers (
          id,
          category
        )
      )
    `)
    .eq('placement_id', placement.id)
    .eq('is_active', true);

  if (rulesError) {
    console.error('Error fetching rules:', rulesError);
    return {
      creatives: [],
      fallback: true,
      rulesMatched: 0,
      selectionReason: 'Database error fetching rules',
      placementId: placement.id,
    };
  }

  // Type the rules properly
  const typedRules = (rules || []) as unknown as RuleWithCreative[];

  // 3. Filter rules (same logic as single selection)
  const today = new Date().toISOString().split('T')[0]!;
  const filteredRules = typedRules.filter((rule) => {
    const creative = rule.creative;

    if (!creative || !creative.is_active) return false;

    if (rule.countries.length > 0 && country) {
      if (!rule.countries.includes(country)) return false;
    }

    if (category) {
      const ruleMatchesCategory =
        rule.categories.length === 0 || rule.categories.includes(category);
      const offerMatchesCategory = creative.offer?.category === category;
      if (!ruleMatchesCategory && !offerMatchesCategory) return false;
    }

    if (size && creative.size !== size) return false;
    if (format && creative.format !== format) return false;
    if (creative.start_date && creative.start_date > today) return false;
    if (creative.end_date && creative.end_date < today) return false;

    return true;
  });

  if (filteredRules.length === 0) {
    return {
      creatives: [],
      fallback: true,
      rulesMatched: 0,
      selectionReason: 'No rules matched filters',
      placementId: placement.id,
    };
  }

  // 4. Sort by priority DESC
  filteredRules.sort((a, b) => b.priority - a.priority);

  // 5. Select unique creatives up to limit, respecting priority order
  const selectedItems: MultiSelectionItem[] = [];
  const seenCreativeIds = new Set<string>();

  for (const rule of filteredRules) {
    if (selectedItems.length >= limit) break;

    const creativeId = rule.creative.id;
    if (seenCreativeIds.has(creativeId)) continue;

    seenCreativeIds.add(creativeId);
    selectedItems.push({
      creative: {
        click_url: rule.creative.click_url,
        image_url: rule.creative.image_url,
        alt_text: rule.creative.alt_text,
        width: rule.creative.width,
        height: rule.creative.height,
        format: rule.creative.format,
      },
      creativeId: rule.creative.id,
      ruleId: rule.id,
    });
  }

  return {
    creatives: selectedItems,
    fallback: false,
    rulesMatched: filteredRules.length,
    selectionReason: `Selected ${selectedItems.length} unique creative(s) from ${filteredRules.length} matching rules`,
    placementId: placement.id,
  };
}

async function applyFallback(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  placement: {
    id: string;
    fallback_type: string;
    fallback_creative_id: string | null;
    fallback_url: string | null;
  },
  rulesMatched: number,
  reason: string
): Promise<SelectionResult> {
  const fallbackType = placement.fallback_type as 'creative' | 'url' | 'none';

  if (fallbackType === 'creative' && placement.fallback_creative_id) {
    // Fetch fallback creative
    const { data: creative } = await supabase
      .from('creatives')
      .select('click_url, image_url, alt_text, width, height, format')
      .eq('id', placement.fallback_creative_id)
      .single();

    if (creative) {
      return {
        creative: {
          click_url: creative.click_url,
          image_url: creative.image_url,
          alt_text: creative.alt_text,
          width: creative.width,
          height: creative.height,
          format: creative.format as CreativeFormat,
        },
        fallback: true,
        fallbackType: 'creative',
        rulesMatched,
        selectionReason: `${reason}. Using fallback creative.`,
        placementId: placement.id,
        creativeId: placement.fallback_creative_id,
      };
    }
  }

  if (fallbackType === 'url' && placement.fallback_url) {
    return {
      creative: null,
      fallback: true,
      fallbackType: 'url',
      fallbackUrl: placement.fallback_url,
      rulesMatched,
      selectionReason: `${reason}. Fallback URL provided.`,
      placementId: placement.id,
    };
  }

  return {
    creative: null,
    fallback: true,
    fallbackType: 'none',
    rulesMatched,
    selectionReason: `${reason}. No fallback configured.`,
    placementId: placement.id,
  };
}
