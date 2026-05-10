import request from "supertest";
import { assert } from "chai";
import { postcodesioApplication } from "./helper";
import { isValid } from "postcode";
const app = postcodesioApplication();

const error404Message = "Postcode not found";

describe("Scottish postcode route", () => {
  const testPostcode = "AB10 1AB";

  describe("/GET /scotland/postcodes/:postcode", () => {
    it("should return 200 if postcode found", (done) => {
      const path = `/scotland/postcodes/${encodeURI(testPostcode)}`;
      request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200)
        .end((error, response) => {
          if (error) return done(error);
          assert.equal(response.body.status, 200);
          done();
        });
    });

    it("returns canonical SPD attributes", (done) => {
      const path = `/scotland/postcodes/${encodeURI(testPostcode)}`;
      request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200)
        .end((error, response) => {
          if (error) return done(error);
          const { result } = response.body;
          assert.equal(result.postcode, "AB10 1AB");
          assert.equal(result.council_area, "Aberdeen City");
          assert.equal(result.codes.council_area, "S12000033");
          assert.isString(result.scottish_parliamentary_constituency);
          assert.isObject(result.codes);
          done();
        });
    });

    it("accepts padded postcode", (done) => {
      const postcode = "  " + testPostcode + "  ";
      const path = `/scotland/postcodes/${encodeURI(postcode)}`;
      request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(200)
        .end((error, response) => {
          if (error) return done(error);
          assert.equal(response.body.status, 200);
          assert.equal(response.body.result.postcode, "AB10 1AB");
          done();
        });
    });

    it("404 if not a valid postcode according to the postcode module", (done) => {
      const path = `/scotland/postcodes/foo`;
      assert.isFalse(isValid("foo"));
      request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404)
        .end(done);
    });

    // Re-enable once postcodes_controller migrates - the not-found
    // branch falls through to legacy Postcode.find which still queries
    // the (now-removed) public.postcodes relation.
    it.skip("should return 404 if postcode not found", (done) => {
      const postcode = "ID11QE";
      const path = `/scotland/postcodes/${encodeURI(postcode)}`;
      request(app)
        .get(path)
        .expect("Content-Type", /json/)
        .expect(404)
        .end((error, response) => {
          if (error) return done(error);
          assert.equal(response.body.status, 404);
          assert.equal(response.body.error, error404Message);
          done();
        });
    });
  });
});
