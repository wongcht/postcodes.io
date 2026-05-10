import { isEmpty, qToString } from "../lib/string";
import { isValid } from "postcode";
import { chunk } from "../lib/chunk";
import { getConfig } from "../../config/config";
import {
  InvalidPostcodeError,
  PostcodeNotFoundError,
  InvalidJsonQueryError,
  JsonArrayRequiredError,
  ExceedMaxGeolocationsError,
  ExceedMaxPostcodesError,
  PostcodeQueryRequiredError,
} from "../lib/errors";
import { Handler } from "../types/express";
import {
  PostcodeRow,
  NearestPostcodesOptions,
  find,
  search,
  random as randomPostcode,
  nearestPostcodes,
  toJson,
} from "../queries/postcodes";
import { find as findTerminated } from "../queries/terminated_postcodes";

const { defaults } = getConfig();

export const show: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    if (!isValid(postcode.trim())) throw new InvalidPostcodeError();

    const result = await find(postcode);
    if (!result) {
      const terminated = await findTerminated(postcode);
      throw new PostcodeNotFoundError(terminated);
    }
    response.jsonApiResponse = { status: 200, result: toJson(result) };
    next();
  } catch (error) {
    next(error);
  }
};

export const valid: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    const result = await find(postcode);
    response.jsonApiResponse = { status: 200, result: !!result };
    next();
  } catch (error) {
    next(error);
  }
};

export const random: Handler = async (request, response, next) => {
  try {
    const { outcode } = request.query;
    const result = await randomPostcode(qToString(outcode));
    response.jsonApiResponse = {
      status: 200,
      result: result ? toJson(result) : null,
    };
    return next();
  } catch (error) {
    next(error);
  }
};

export const bulk: Handler = (request, response, next) => {
  if (request.body.postcodes)
    return bulkLookupPostcodes(request, response, next);
  try {
    if (request.body.geolocations) return bulkGeocode(request, response, next);
  } catch (err) {
    return next(err);
  }
  return next(new InvalidJsonQueryError());
};

const MAX_GEOLOCATIONS = defaults.bulkGeocode.geolocations.MAX;
const GEO_ASYNC_LIMIT =
  defaults.bulkGeocode.geolocations.ASYNC_LIMIT || MAX_GEOLOCATIONS;

interface LookupGeolocationResult {
  query: { [index: string]: unknown };
  result: null | ReturnType<typeof toJson>[];
}

const bulkGeocode: Handler = async (request, response, next) => {
  try {
    const { geolocations } = request.body;

    let globalLimit: string | undefined;
    if (request.query.limit) globalLimit = qToString(request.query.limit);

    let globalRadius: string | undefined;
    if (request.query.radius) globalRadius = qToString(request.query.radius);

    let globalWidesearch: boolean | undefined;
    if (request.query.widesearch) globalWidesearch = true;

    if (!Array.isArray(geolocations)) return next(new JsonArrayRequiredError());
    if (geolocations.length > MAX_GEOLOCATIONS)
      return next(new ExceedMaxGeolocationsError());

    const data: LookupGeolocationResult[] = new Array(geolocations.length);

    const whitelist = ["limit", "longitude", "latitude", "radius", "widesearch"];
    const sanitizeQuery = (q: NearestPostcodesOptions) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(q)) {
        if (whitelist.indexOf(key.toLowerCase()) !== -1) result[key] = value;
      }
      return result;
    };

    const lookupGeolocation = async (
      location: NearestPostcodesOptions,
      i: number
    ): Promise<void> => {
      const postcodes = await nearestPostcodes(location);
      data[i] = {
        query: sanitizeQuery(location),
        result: postcodes && postcodes.length > 0 ? postcodes.map(toJson) : null,
      };
    };

    const queue = chunk(
      geolocations.map((geolocation, i) =>
        lookupGeolocation(
          {
            ...(globalLimit && { limit: globalLimit }),
            ...(globalRadius && { radius: globalRadius }),
            ...(globalWidesearch && { widesearch: true }),
            ...geolocation,
          },
          i
        )
      ),
      GEO_ASYNC_LIMIT
    );

    for (const q of queue) await Promise.all(q);

    response.jsonApiResponse = { status: 200, result: data };
    next();
  } catch (error) {
    next(error);
  }
};

const MAX_POSTCODES = defaults.bulkLookups.postcodes.MAX;
const BULK_ASYNC_LIMIT =
  defaults.bulkLookups.postcodes.ASYNC_LIMIT || MAX_POSTCODES;

interface BulkLookupPostcodesResult {
  query: string;
  result: null | ReturnType<typeof toJson>;
}

const bulkLookupPostcodes: Handler = async (request, response, next) => {
  try {
    const { postcodes } = request.body;
    if (!Array.isArray(postcodes)) return next(new JsonArrayRequiredError());
    if (postcodes.length > MAX_POSTCODES)
      return next(new ExceedMaxPostcodesError());

    const p = postcodes.filter((pc) => typeof pc === "string");
    const result: BulkLookupPostcodesResult[] = new Array(p.length);

    const lookupPostcode = async (postcode: string, i: number): Promise<void> => {
      const info = await find(postcode);
      result[i] = { query: postcode, result: info ? toJson(info) : null };
    };

    const queue: Promise<void>[][] = chunk(
      p.map(lookupPostcode),
      BULK_ASYNC_LIMIT
    );

    for (const queries of queue) await Promise.all(queries);

    response.jsonApiResponse = { status: 200, result };
    next();
  } catch (error) {
    next(error);
  }
};

export const query: Handler = async (request, response, next) => {
  request.params.limit = qToString(request.query.limit);
  request.params.radius = qToString(request.query.radius);

  if (request.query.latitude && request.query.longitude) {
    request.params.latitude = qToString(request.query.latitude);
    request.params.longitude = qToString(request.query.longitude);
    nearest_byLatLon(request, response, next);
    return;
  }

  if (request.query.lat && request.query.lon) {
    request.params.latitude = qToString(request.query.lat);
    request.params.longitude = qToString(request.query.lon);
    nearest_byLatLon(request, response, next);
    return;
  }

  const postcode: string = qToString(request.query.q || request.query.query);
  if (isEmpty(postcode)) return next(new PostcodeQueryRequiredError());

  try {
    const results = await search({
      limit: qToString(request.query.limit),
      postcode,
    });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map(toJson) : null,
    };
    return next();
  } catch (error) {
    next(error);
  }
};

export const autocomplete: Handler = async (request, response, next) => {
  try {
    const results = await search({
      postcode: request.params.postcode,
      limit: qToString(request.query.limit),
    });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map((p: PostcodeRow) => p.postcode) : null,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const nearest_byLatLon: Handler = async (request, response, next) => {
  try {
    const { longitude, latitude, limit, radius } = request.params;
    const results = await nearestPostcodes({
      longitude,
      latitude,
      limit,
      radius,
      wideSearch: !!request.query.wideSearch || !!request.query.widesearch,
    });
    response.jsonApiResponse = {
      status: 200,
      result: results ? results.map(toJson) : null,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const lonlat: Handler = async (request, response, next) => {
  try {
    const { limit, radius } = request.query;
    request.params.limit = qToString(limit);
    request.params.radius = qToString(radius);
    return nearest_byLatLon(request, response, next);
  } catch (error) {
    next(error);
  }
};

export const nearest: Handler = async (request, response, next) => {
  try {
    const { postcode } = request.params;
    const { limit, radius } = request.query;
    const result = await find(postcode);
    if (!result) return next(new PostcodeNotFoundError());
    request.params.longitude = qToString(result.longitude);
    request.params.latitude = qToString(result.latitude);
    request.params.limit = qToString(limit);
    request.params.radius = qToString(radius);
    return nearest_byLatLon(request, response, next);
  } catch (error) {
    next(error);
  }
};
