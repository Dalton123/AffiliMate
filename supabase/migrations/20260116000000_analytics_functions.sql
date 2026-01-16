-- ===========================================
-- Analytics Aggregation Functions
-- Replaces N+1 JS aggregation with SQL GROUP BY
-- ===========================================

-- Stats by placement
CREATE OR REPLACE FUNCTION get_stats_by_placement(
  p_project_id UUID,
  p_start_date TIMESTAMPTZ
)
RETURNS TABLE (
  placement_id UUID,
  placement_name TEXT,
  impressions BIGINT,
  clicks BIGINT,
  ctr NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH impression_counts AS (
    SELECT
      i.placement_id,
      COUNT(*) as impressions
    FROM impressions i
    WHERE i.project_id = p_project_id
      AND i.created_at >= p_start_date
    GROUP BY i.placement_id
  ),
  click_counts AS (
    SELECT
      i.placement_id,
      COUNT(*) as clicks
    FROM clicks c
    JOIN impressions i ON c.impression_id = i.id
    WHERE c.project_id = p_project_id
      AND c.created_at >= p_start_date
      AND c.impression_id IS NOT NULL
    GROUP BY i.placement_id
  )
  SELECT
    p.id as placement_id,
    p.name as placement_name,
    COALESCE(ic.impressions, 0) as impressions,
    COALESCE(cc.clicks, 0) as clicks,
    CASE
      WHEN COALESCE(ic.impressions, 0) > 0
      THEN ROUND((COALESCE(cc.clicks, 0)::NUMERIC / ic.impressions) * 100, 2)
      ELSE 0
    END as ctr
  FROM placements p
  LEFT JOIN impression_counts ic ON ic.placement_id = p.id
  LEFT JOIN click_counts cc ON cc.placement_id = p.id
  WHERE p.project_id = p_project_id
    AND (ic.impressions > 0 OR cc.clicks > 0)
  ORDER BY impressions DESC
  LIMIT 10;
$$;

-- Stats by creative
CREATE OR REPLACE FUNCTION get_stats_by_creative(
  p_project_id UUID,
  p_start_date TIMESTAMPTZ
)
RETURNS TABLE (
  creative_id UUID,
  creative_name TEXT,
  impressions BIGINT,
  clicks BIGINT,
  ctr NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH impression_counts AS (
    SELECT
      creative_id,
      COUNT(*) as impressions
    FROM impressions
    WHERE project_id = p_project_id
      AND created_at >= p_start_date
      AND creative_id IS NOT NULL
    GROUP BY creative_id
  ),
  click_counts AS (
    SELECT
      creative_id,
      COUNT(*) as clicks
    FROM clicks
    WHERE project_id = p_project_id
      AND created_at >= p_start_date
      AND creative_id IS NOT NULL
    GROUP BY creative_id
  )
  SELECT
    c.id as creative_id,
    c.name as creative_name,
    COALESCE(ic.impressions, 0) as impressions,
    COALESCE(cc.clicks, 0) as clicks,
    CASE
      WHEN COALESCE(ic.impressions, 0) > 0
      THEN ROUND((COALESCE(cc.clicks, 0)::NUMERIC / ic.impressions) * 100, 2)
      ELSE 0
    END as ctr
  FROM creatives c
  LEFT JOIN impression_counts ic ON ic.creative_id = c.id
  LEFT JOIN click_counts cc ON cc.creative_id = c.id
  WHERE c.project_id = p_project_id
    AND (ic.impressions > 0 OR cc.clicks > 0)
  ORDER BY impressions DESC
  LIMIT 10;
$$;

-- Stats by country
CREATE OR REPLACE FUNCTION get_stats_by_country(
  p_project_id UUID,
  p_start_date TIMESTAMPTZ
)
RETURNS TABLE (
  country VARCHAR(2),
  impressions BIGINT,
  clicks BIGINT,
  ctr NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH impression_counts AS (
    SELECT
      country,
      COUNT(*) as impressions
    FROM impressions
    WHERE project_id = p_project_id
      AND created_at >= p_start_date
      AND country IS NOT NULL
    GROUP BY country
  ),
  click_counts AS (
    SELECT
      country,
      COUNT(*) as clicks
    FROM clicks
    WHERE project_id = p_project_id
      AND created_at >= p_start_date
      AND country IS NOT NULL
    GROUP BY country
  )
  SELECT
    COALESCE(ic.country, cc.country) as country,
    COALESCE(ic.impressions, 0) as impressions,
    COALESCE(cc.clicks, 0) as clicks,
    CASE
      WHEN COALESCE(ic.impressions, 0) > 0
      THEN ROUND((COALESCE(cc.clicks, 0)::NUMERIC / ic.impressions) * 100, 2)
      ELSE 0
    END as ctr
  FROM impression_counts ic
  FULL OUTER JOIN click_counts cc ON ic.country = cc.country
  ORDER BY impressions DESC
  LIMIT 10;
$$;
