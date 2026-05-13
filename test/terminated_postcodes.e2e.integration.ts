import request from "supertest";
import { assert } from "chai";
import * as helper from "./helper/index";
const app = helper.postcodesioApplication();

describe("Terminated postcodes E2E", () => {
  describe("GET /terminated_postcodes/:postcode", () => {
    it("returns exact expected response for AB10 1AA", (done) => {
      const expectedResponse = {
        postcode: "AB10 1AA",
        year_terminated: 2016,
        month_terminated: 10,
        longitude: -2.096655,
        latitude: 57.148216,
      };

      request(app)
        .get("/terminated_postcodes/AB10%201AA")
        .expect("Content-Type", /json/)
        .expect(200)
        .end((error, response) => {
          if (error) return done(error);
          assert.equal(response.body.status, 200);
          assert.deepEqual(response.body.result, expectedResponse);
          done();
        });
    });
  });
});
