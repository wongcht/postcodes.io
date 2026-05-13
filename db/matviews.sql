-- Materialised views consumed by the API.
--
-- This file is the canonical definition. Upstream (the pg_dump pipeline) is
-- expected to create these alongside the base tables so they ship inside the
-- published dump. For local dev and the test seed, bin/load_test_seed applies
-- this file after the seed loads — IF NOT EXISTS keeps it a no-op if the dump
-- already provides the view.
--
-- After a base-table refresh, REFRESH MATERIALIZED VIEW pcio.outcodes;

-- One row per active outcode in pcio.onspd, with averaged centroid and the
-- distinct set of admin / parliamentary names that appear under that outcode.
CREATE MATERIALIZED VIEW IF NOT EXISTS pcio.outcodes AS
SELECT
  outcode,
  AVG(longitude) AS longitude,
  AVG(latitude) AS latitude,
  ROUND(AVG(eastings))::int AS eastings,
  ROUND(AVG(northings))::int AS northings,
  ST_MakePoint(AVG(longitude), AVG(latitude))::geography AS location,
  array_agg(DISTINCT admin_district)
    FILTER (WHERE admin_district IS NOT NULL AND admin_district <> '') AS admin_district,
  array_agg(DISTINCT parish)
    FILTER (WHERE parish IS NOT NULL AND parish <> '') AS parish,
  array_agg(DISTINCT admin_county)
    FILTER (WHERE admin_county IS NOT NULL AND admin_county <> '') AS admin_county,
  array_agg(DISTINCT admin_ward)
    FILTER (WHERE admin_ward IS NOT NULL AND admin_ward <> '') AS admin_ward,
  array_agg(DISTINCT country)
    FILTER (WHERE country IS NOT NULL AND country <> '') AS country,
  array_agg(DISTINCT parliamentary_constituency)
    FILTER (WHERE parliamentary_constituency IS NOT NULL AND parliamentary_constituency <> '') AS parliamentary_constituency
FROM pcio.onspd
WHERE date_of_termination IS NULL
  AND location IS NOT NULL
GROUP BY outcode;

CREATE UNIQUE INDEX IF NOT EXISTS outcodes_outcode_idx ON pcio.outcodes (outcode);
CREATE INDEX IF NOT EXISTS outcodes_location_idx ON pcio.outcodes USING gist (location);
