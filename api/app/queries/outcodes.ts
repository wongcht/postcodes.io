import { query } from "./db";
import {
  InvalidGeolocationError,
  InvalidLimitError,
  InvalidRadiusError,
} from "../lib/errors";
import { getConfig } from "../../config/config";

const { defaults } = getConfig();
const radiusDefaults = defaults.nearestOutcodes.radius;
const limitDefaults = defaults.nearestOutcodes.limit;

export interface OutcodeRow {
  outcode: string;
  longitude: number | null;
  latitude: number | null;
  northings: number;
  eastings: number;
  admin_district: string[];
  parish: string[];
  admin_county: string[];
  admin_ward: string[];
  country: string[];
  parliamentary_constituency: string[];
}

export interface OutcodeNearbyRow extends OutcodeRow {
  distance: number;
}

const AGGREGATE_COLUMNS = `
  outcode,
  AVG(longitude) AS longitude,
  AVG(latitude) AS latitude,
  ROUND(AVG(eastings))::int AS eastings,
  ROUND(AVG(northings))::int AS northings,
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
`;

const normaliseOutcode = (outcode: string): string =>
  outcode.toUpperCase().replace(/\s/g, "");

export const find = async (outcode?: string): Promise<OutcodeRow | null> => {
  if (!outcode) return null;
  const result = await query<OutcodeRow>({
    name: "outcodes_find",
    text: `
      SELECT ${AGGREGATE_COLUMNS}
      FROM pcio.onspd
      WHERE outcode = $1
        AND date_of_termination IS NULL
        AND location IS NOT NULL
      GROUP BY outcode
    `,
    values: [normaliseOutcode(outcode)],
  });
  return result.rows[0] ?? null;
};

interface NearestOptions {
  longitude: string;
  latitude: string;
  limit?: string;
  radius?: string;
}

export const nearest = async (
  params: NearestOptions
): Promise<OutcodeNearbyRow[] | null> => {
  const longitude = parseFloat(params.longitude);
  if (isNaN(longitude)) throw new InvalidGeolocationError();

  const latitude = parseFloat(params.latitude);
  if (isNaN(latitude)) throw new InvalidGeolocationError();

  let limit = limitDefaults.DEFAULT;
  if (params.limit) {
    limit = parseInt(params.limit, 10);
    if (isNaN(limit)) throw new InvalidLimitError();
  }
  if (limit > limitDefaults.MAX) limit = limitDefaults.MAX;

  let radius = radiusDefaults.DEFAULT;
  if (params.radius) {
    radius = parseFloat(params.radius);
    if (isNaN(radius)) throw new InvalidRadiusError();
  }
  if (radius > radiusDefaults.MAX) radius = radiusDefaults.MAX;

  const result = await query<OutcodeNearbyRow>({
    name: "outcodes_nearest",
    text: `
      SELECT
        ${AGGREGATE_COLUMNS},
        ST_Distance(
          ST_MakePoint(AVG(longitude), AVG(latitude))::geography,
          ST_MakePoint($1::float8, $2::float8)::geography
        ) AS distance
      FROM pcio.onspd
      WHERE date_of_termination IS NULL
        AND location IS NOT NULL
        AND outcode IN (
          SELECT DISTINCT outcode
          FROM pcio.onspd
          WHERE ST_DWithin(
            location,
            ST_MakePoint($1::float8, $2::float8)::geography,
            $3::float8
          )
        )
      GROUP BY outcode
      ORDER BY distance
      LIMIT $4::int
    `,
    values: [longitude, latitude, radius, limit],
  });
  if (result.rows.length === 0) return null;
  return result.rows;
};

export const toJson = (o: OutcodeRow): OutcodeRow => ({
  outcode: o.outcode,
  longitude: o.longitude,
  latitude: o.latitude,
  northings: o.northings,
  eastings: o.eastings,
  admin_district: o.admin_district,
  parish: o.parish,
  admin_county: o.admin_county,
  admin_ward: o.admin_ward,
  country: o.country,
  parliamentary_constituency: o.parliamentary_constituency,
});
