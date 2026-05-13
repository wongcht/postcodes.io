// Contract tests for api/app/queries/terminated_postcodes.ts.
// Re-capture with `pnpm vitest run test/queries.terminated_postcodes.integration.ts -u`.

import { describe, expect, it } from "vitest";
import { find } from "../api/app/queries/terminated_postcodes";

const KNOWN_TERMINATED = "AB10 1AA";
const KNOWN_LIVE = "AB10 1AB";

describe("queries/terminated_postcodes (contract)", () => {
  describe("find()", () => {
    it("returns the row for a known terminated postcode", async () => {
      expect(await find(KNOWN_TERMINATED)).toMatchInlineSnapshot(`
        {
          "latitude": 57.148216,
          "longitude": -2.096655,
          "month_terminated": 10,
          "postcode": "AB10 1AA",
          "year_terminated": 2016,
        }
      `);
    });
    it("returns null for a live postcode", async () => {
      expect(await find(KNOWN_LIVE)).toMatchInlineSnapshot(`null`);
    });
    it("normalises whitespace and case", async () => {
      expect(await find("  ab10 1aa  ")).toMatchInlineSnapshot(`
        {
          "latitude": 57.148216,
          "longitude": -2.096655,
          "month_terminated": 10,
          "postcode": "AB10 1AA",
          "year_terminated": 2016,
        }
      `);
    });
    it("returns null for an invalid postcode", async () => {
      expect(await find("NOT A POSTCODE")).toMatchInlineSnapshot(`null`);
    });
    it("returns null for nullish input", async () => {
      expect(await find(null)).toMatchInlineSnapshot(`null`);
      expect(await find(undefined)).toMatchInlineSnapshot(`null`);
      expect(await find("")).toMatchInlineSnapshot(`null`);
    });
  });
});
