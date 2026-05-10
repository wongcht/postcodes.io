// In v13 the test database is bootstrapped by bin/load_test_seed (a dump
// of pcio.onspd / pcio.opennames / pcio.spd). The legacy
// seed*/clear* helpers below are kept as no-ops so existing
// integration-test before/after hooks remain valid until the tests are
// rewritten to drop them.

const noop = async (): Promise<null> => null;

export const clearTestDb = noop;
export const seedTerminatedPostcodeDb = noop;
export const seedPostcodeDb = noop;
export const clearTerminatedPostcodesDb = noop;
export const clearPostcodeDb = noop;
export const clearScottishPostcodeDb = noop;
export const seedScottishPostcodeDb = noop;

import { resolve, join } from "path";
export const seedPostcodePath = resolve(__dirname, "../seed/postcode.csv");
export const seedScotlandPostcodePath = resolve(__dirname, "../seed/");
