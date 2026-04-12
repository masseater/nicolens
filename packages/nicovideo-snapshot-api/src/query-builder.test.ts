import { describe, expect, it } from "vitest";

import { buildSearchUrl } from "./query-builder";

describe("buildSearchUrl", () => {
  it("builds URL with required params", () => {
    const url = buildSearchUrl({
      query: "VOCALOID",
      targets: "tagsExact",
      userAgent: "test/1.0",
    });
    expect(url).toContain("q=VOCALOID");
    expect(url).toContain("targets=tagsExact");
  });

  it("includes sort and limit when provided", () => {
    const url = buildSearchUrl({
      query: "test",
      targets: "title",
      sort: "-startTime",
      limit: 50,
      userAgent: "test/1.0",
    });
    expect(url).toContain("_sort=-startTime");
    expect(url).toContain("_limit=50");
  });

  it("encodes filters as filters[field][op]=value", () => {
    const url = buildSearchUrl({
      query: "test",
      targets: "title",
      filters: {
        startTime: { gte: "2026-04-11T00:00:00+09:00" },
        viewCounter: { gte: "1000" },
      },
      userAgent: "test/1.0",
    });
    expect(decodeURIComponent(url)).toContain("filters[startTime][gte]=2026-04-11T00:00:00+09:00");
    expect(decodeURIComponent(url)).toContain("filters[viewCounter][gte]=1000");
  });

  it("uses default context when not provided", () => {
    const url = buildSearchUrl({
      query: "test",
      targets: "title",
      userAgent: "test/1.0",
    });
    expect(url).toContain("_context=");
  });
});
