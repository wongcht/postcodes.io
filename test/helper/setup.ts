import { join, resolve } from "path";
import {
  Postcode,
  ScottishPostcode,
  Outcode,
  Place,
  TerminatedPostcode,
} from "../../api/app/models/index";
import { QueryResult } from "pg";

const NO_RELOAD_DB = !!process.env.NO_RELOAD_DB;
const seedPostcodePath = resolve(__dirname, "../seed/postcode.csv");
const seedPlacesPath = join(__dirname, "../seed/places/");
const seedScotlandPostcodePath = resolve(__dirname, "../seed/");

const clearTestDb = async (): Promise<any[] | null> => {
  if (process.env.PRESERVE_DB !== undefined) return null;
  return Promise.all([
    Postcode.destroyRelation(),
    TerminatedPostcode.destroyRelation(),
    Place.destroyRelation(),
    ScottishPostcode.destroyRelation(),
    Outcode.destroyRelation(),
  ]);
};

const seedTerminatedPostcodeDb = async (): Promise<void | null> => {
  if (NO_RELOAD_DB) return null;
  return TerminatedPostcode.setupTable(seedPostcodePath);
};

const seedPostcodeDb = async (): Promise<any[] | null> => {
  if (NO_RELOAD_DB) return null;
  return Promise.all([
    Postcode.setupTable(seedPostcodePath),
    TerminatedPostcode.setupTable(seedPostcodePath),
    Place.setupTable(seedPlacesPath),
    ScottishPostcode.setupTable(seedScotlandPostcodePath),
    Outcode.setupTable(),
  ]);
};

const clearTerminatedPostcodesDb = async (): Promise<QueryResult<
  any
> | null> => {
  if (NO_RELOAD_DB) return null;
  return TerminatedPostcode.destroyRelation();
};

const clearPostcodeDb = async (): Promise<QueryResult<any> | null> => {
  if (NO_RELOAD_DB) return null;
  await Postcode.destroyRelation();
};

const clearScottishPostcodeDb = async (): Promise<QueryResult<any> | null> => {
  if (NO_RELOAD_DB) return null;
  return ScottishPostcode.destroyRelation();
};

const seedScottishPostcodeDb = async (): Promise<any[] | null> => {
  if (NO_RELOAD_DB) return null;
  return [await ScottishPostcode.setupTable(seedScotlandPostcodePath)];
};

export {
  clearTestDb,
  seedPostcodePath,
  seedTerminatedPostcodeDb,
  seedPostcodeDb,
  seedScottishPostcodeDb,
  seedScotlandPostcodePath,
  clearTerminatedPostcodesDb,
  clearPostcodeDb,
  clearScottishPostcodeDb,
};
