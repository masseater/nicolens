import { describe, expect, it } from "vitest";

import { isSortField } from "./sort-field-guard";

describe("isSortField", () => {
  it("returns true for valid sort fields", () => {
    expect(isSortField("viewCounter")).toBe(true);
    expect(isSortField("mylistCounter")).toBe(true);
    expect(isSortField("likeCounter")).toBe(true);
    expect(isSortField("lengthSeconds")).toBe(true);
    expect(isSortField("startTime")).toBe(true);
    expect(isSortField("commentCounter")).toBe(true);
    expect(isSortField("lastCommentTime")).toBe(true);
  });

  it("returns false for invalid sort fields", () => {
    expect(isSortField("invalid")).toBe(false);
    expect(isSortField("")).toBe(false);
    expect(isSortField("ViewCounter")).toBe(false);
  });
});
