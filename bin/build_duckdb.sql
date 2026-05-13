-- Build postcodes.duckdb from the dev Postgres DB on localhost:5433.
-- Geography columns become native DuckDB GEOMETRY (via WKB round-trip).
-- tsvector columns are dropped.

INSTALL postgres;
LOAD postgres;
INSTALL spatial;
LOAD spatial;

ATTACH 'host=localhost port=5433 dbname=postcodesiodb user=postcodesio password=password'
  AS pg (TYPE POSTGRES, READ_ONLY);

-- onspd: 2.7M rows, one geography column
CREATE OR REPLACE TABLE onspd AS
SELECT * EXCLUDE (location_wkb),
       ST_GeomFromWKB(location_wkb) AS location
FROM postgres_query('pg', $q$
  SELECT
    postcode, incode, outcode, date_of_introduction, date_of_termination,
    eastings, northings, latitude, longitude, quality,
    country, region, nhs_ha, primary_care_trust, european_electoral_region,
    admin_county_id, admin_county, admin_district_id, admin_district,
    admin_ward_id, admin_ward, parish_id, parish,
    constituency_id, parliamentary_constituency,
    ced_id, ced, ccg_id, ccg, ccg_code,
    nuts_id, nuts, nuts_code,
    lsoa_id, lsoa, msoa_id, msoa,
    lsoa11_id, lsoa11, msoa11_id, msoa11,
    pfa_id, pfa, nhs_region_id, nhs_region,
    ttwa_id, ttwa, national_park_id, national_park,
    bua_id, bua, icb_id, icb,
    cancer_alliance_id, cancer_alliance,
    lsoa21_id, lsoa21, msoa21_id, msoa21, oa21_id,
    ruc11_id, ruc11, ruc21_id, ruc21,
    lep1_id, lep1, lep2_id, lep2,
    index_of_multiple_deprivation,
    ST_AsBinary(location::geometry) AS location_wkb
  FROM pcio.onspd
$q$);

-- opennames: ~43k rows, two geography columns, two tsvector columns dropped
CREATE OR REPLACE TABLE opennames AS
SELECT * EXCLUDE (location_wkb, bounding_polygon_wkb),
       ST_GeomFromWKB(location_wkb) AS location,
       ST_GeomFromWKB(bounding_polygon_wkb) AS bounding_polygon
FROM postgres_query('pg', $q$
  SELECT
    code, longitude, latitude,
    eastings, northings,
    min_eastings, min_northings, max_eastings, max_northings,
    local_type, outcode,
    name_1, name_1_lang, name_1_search,
    name_2, name_2_lang, name_2_search,
    county_unitary, county_unitary_type,
    district_borough, district_borough_type,
    region, country,
    ST_AsBinary(location::geometry) AS location_wkb,
    ST_AsBinary(bounding_polygon::geometry) AS bounding_polygon_wkb
  FROM pcio.opennames
$q$);

-- spd: ~162k rows, one geography column
CREATE OR REPLACE TABLE spd AS
SELECT * EXCLUDE (location_wkb),
       ST_GeomFromWKB(location_wkb) AS location
FROM postgres_query('pg', $q$
  SELECT *, ST_AsBinary(location::geometry) AS location_wkb
  FROM (SELECT pcio.spd.* FROM pcio.spd) s
$q$);

-- Btree indexes on the lookup columns the API hits hardest.
CREATE INDEX onspd_postcode_idx ON onspd(postcode);
CREATE INDEX onspd_outcode_idx  ON onspd(outcode);
CREATE INDEX opennames_code_idx ON opennames(code);
CREATE INDEX spd_postcode_idx   ON spd(postcode);

-- Row counts sanity check
SELECT 'onspd' AS t, count(*) FROM onspd
UNION ALL SELECT 'opennames', count(*) FROM opennames
UNION ALL SELECT 'spd', count(*) FROM spd;
