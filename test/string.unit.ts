import { assert } from "chai";
import * as helper from "./helper/index";
const { isEmpty } = helper.string;

describe("isEmpty", () => {
  it("returns true if null", () => {
    //@ts-expect-error
    assert.isTrue(isEmpty(null));
  });
  it("returns true if undefined", () => {
    //@ts-expect-error
    assert.isTrue(isEmpty(undefined));
  });
  it("returns true if spaces", () => {
    assert.isTrue(isEmpty("   "));
  });
  it("returns true if empty string", () => {
    assert.isTrue(isEmpty(""));
  });
  it("returns true if space", () => {
    assert.isTrue(isEmpty(" "));
  });
  it("returns false if not empty string", () => {
    assert.isFalse(isEmpty("foo"));
  });
});
