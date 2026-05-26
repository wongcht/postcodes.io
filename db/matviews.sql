-- Materialised view fallback for environments where the upstream dump does
-- not ship `public.outcodes` as a base table.
--
-- The current pipeline ships `public.outcodes` denormalised inside the
-- pg_dump, so this file is a no-op in production: `IF NOT EXISTS` skips the
-- creation when a relation named `public.outcodes` already exists (the table
-- from the dump).
--
-- bin/load_test_seed applies this file after the seed loads. The test seed
-- only includes `public.postcodes`, `public.places`, `public.scottish_postcodes`
-- (no outcodes data), so this file creates the matview on-the-fly there.
--
-- After a base-table refresh in environments using the matview path:
--   REFRESH MATERIALIZED VIEW public.outcodes;

-- One row per active outcode in public.postcodes, with averaged centroid and
-- the distinct set of admin / parliamentary names that appear under that
-- outcode.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.outcodes AS
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
FROM public.postcodes
WHERE date_of_termination IS NULL
  AND location IS NOT NULL
GROUP BY outcode;

CREATE UNIQUE INDEX IF NOT EXISTS outcodes_outcode_idx ON public.outcodes (outcode);
CREATE INDEX IF NOT EXISTS outcodes_location_idx ON public.outcodes USING gist (location);

-- Partial indexes over active postcodes only. Every nearest / find / search
-- query filters `date_of_termination IS NULL`, so a partial index avoids
-- entries for terminated postcodes and lets the planner skip the predicate
-- recheck. Smaller index, better cache locality.
CREATE INDEX IF NOT EXISTS postcodes_active_location_gix
  ON public.postcodes USING gist (location)
  WHERE date_of_termination IS NULL;

CREATE INDEX IF NOT EXISTS postcodes_active_replace_idx
  ON public.postcodes USING btree (replace((postcode)::text, ' '::text, ''::text))
  WHERE date_of_termination IS NULL;

CREATE INDEX IF NOT EXISTS postcodes_active_postcode_idx
  ON public.postcodes USING btree (postcode)
  WHERE date_of_termination IS NULL;

CREATE INDEX IF NOT EXISTS postcodes_active_outcode_idx
  ON public.postcodes USING btree (outcode)
  WHERE date_of_termination IS NULL;

-- Inverse partial for GET /terminated_postcodes/:postcode. Niche endpoint but
-- the index is small (terminated rows are a minority).
CREATE INDEX IF NOT EXISTS postcodes_terminated_replace_idx
  ON public.postcodes USING btree (replace((postcode)::text, ' '::text, ''::text))
  WHERE date_of_termination IS NOT NULL;
