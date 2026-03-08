import { describe, expect, it } from "vitest";

import {
  buildSearchParams,
  calcPageOnLimitChange,
  formatQueryDisplay,
  parseQueryInput,
  parseSearchParams,
} from "./search-params";

describe("parseQueryInput", () => {
  it("parses plain keyword query", () => {
    const result = parseQueryInput("初音ミク");
    expect(result.query).toBe("初音ミク");
    expect(result.targets).toBe("title,description,tags");
    expect(result.tags).toEqual([]);
  });

  it("extracts #tag tokens as tag filters", () => {
    const result = parseQueryInput("#VOCALOID 初音ミク");
    expect(result.query).toBe("初音ミク");
    expect(result.targets).toBe("title,description,tags");
    expect(result.tags).toEqual(["VOCALOID"]);
  });

  it("handles tag-only search with tagsExact target", () => {
    const result = parseQueryInput("#VOCALOID");
    expect(result.query).toBe("VOCALOID");
    expect(result.targets).toBe("tagsExact");
    expect(result.tags).toEqual([]);
  });

  it("handles multiple tags only", () => {
    const result = parseQueryInput("#VOCALOID #初音ミク");
    expect(result.query).toBe("VOCALOID");
    expect(result.targets).toBe("tagsExact");
    expect(result.tags).toEqual(["初音ミク"]);
  });

  it("handles multiple tags with keyword", () => {
    const result = parseQueryInput("#VOCALOID #初音ミク 歌ってみた");
    expect(result.query).toBe("歌ってみた");
    expect(result.targets).toBe("title,description,tags");
    expect(result.tags).toEqual(["VOCALOID", "初音ミク"]);
  });

  it("trims whitespace", () => {
    const result = parseQueryInput("  keyword  ");
    expect(result.query).toBe("keyword");
  });

  it("normalizes OR syntax in parentheses", () => {
    const result = parseQueryInput("(A OR B) keyword");
    expect(result.query).toBe("A OR B keyword");
    expect(result.error).toBeUndefined();
  });

  it("moves OR group to front when at end", () => {
    const result = parseQueryInput("keyword (A OR B)");
    expect(result.query).toBe("A OR B keyword");
  });

  it("returns error for multiple OR groups", () => {
    const result = parseQueryInput("(A OR B) (C OR D)");
    expect(result.error).toBeDefined();
  });

  it("returns error for parenthesized group without OR", () => {
    const result = parseQueryInput("(A B) keyword");
    expect(result.error).toBeDefined();
  });

  it("leaves bare OR syntax as-is", () => {
    const result = parseQueryInput("A OR B");
    expect(result.query).toBe("A OR B");
    expect(result.error).toBeUndefined();
  });

  it("parses title: prefix", () => {
    const result = parseQueryInput("title:hoge");
    expect(result.query).toBe("hoge");
    expect(result.targets).toBe("title");
    expect(result.tags).toEqual([]);
  });

  it("parses body: prefix", () => {
    const result = parseQueryInput("body:hoge");
    expect(result.query).toBe("hoge");
    expect(result.targets).toBe("description");
    expect(result.tags).toEqual([]);
  });

  it("parses quoted field prefix", () => {
    const result = parseQueryInput('title:"初音ミク ボカロ"');
    expect(result.query).toBe("初音ミク ボカロ");
    expect(result.targets).toBe("title");
  });

  it("combines title: and body: into multi-target", () => {
    const result = parseQueryInput("title:hoge body:fuga");
    expect(result.query).toBe("hoge fuga");
    expect(result.targets).toBe("title,description");
  });

  it("combines field prefix with unprefixed keywords", () => {
    const result = parseQueryInput("title:hoge fuga");
    expect(result.query).toBe("hoge fuga");
    expect(result.targets).toBe("title");
  });

  it("combines field prefix with #tag", () => {
    const result = parseQueryInput("title:hoge #VOCALOID");
    expect(result.query).toBe("hoge");
    expect(result.targets).toBe("title");
    expect(result.tags).toEqual(["VOCALOID"]);
  });
});

describe("formatQueryDisplay", () => {
  it("formats keyword query", () => {
    expect(formatQueryDisplay("keyword", "title,description,tags", [])).toBe("keyword");
  });

  it("formats tagsExact query with # prefix", () => {
    expect(formatQueryDisplay("VOCALOID", "tagsExact", [])).toBe("#VOCALOID");
  });

  it("formats query with tags", () => {
    expect(formatQueryDisplay("keyword", "title,description,tags", ["TAG1", "TAG2"])).toBe(
      "keyword #TAG1 #TAG2",
    );
  });

  it("formats tagsExact with additional tags", () => {
    expect(formatQueryDisplay("VOCALOID", "tagsExact", ["初音ミク"])).toBe("#VOCALOID #初音ミク");
  });

  it("handles empty query", () => {
    expect(formatQueryDisplay("", "title,description,tags", [])).toBe("");
  });

  it("handles empty query with tags", () => {
    expect(formatQueryDisplay("", "title,description,tags", ["TAG"])).toBe("#TAG");
  });

  it("formats title-only query with prefix", () => {
    expect(formatQueryDisplay("hoge", "title", [])).toBe("title:hoge");
  });

  it("formats body-only query with prefix", () => {
    expect(formatQueryDisplay("hoge", "description", [])).toBe("body:hoge");
  });

  it("formats title-only multi-word query with quotes", () => {
    expect(formatQueryDisplay("hoge fuga", "title", [])).toBe('title:"hoge fuga"');
  });

  it("formats field prefix with tags", () => {
    expect(formatQueryDisplay("hoge", "title", ["VOCALOID"])).toBe("title:hoge #VOCALOID");
  });

  it("formats multi-target query without prefix", () => {
    expect(formatQueryDisplay("hoge fuga", "title,description", [])).toBe("hoge fuga");
  });
});

describe("calcPageOnLimitChange", () => {
  it("keeps page 1 when already on page 1", () => {
    expect(calcPageOnLimitChange(1, 10, 20)).toBe(1);
  });

  it("calculates correct page when increasing limit", () => {
    // Page=3, limit=10 → first item index=20 → with limit=20, page=2
    expect(calcPageOnLimitChange(3, 10, 20)).toBe(2);
  });

  it("calculates correct page when decreasing limit", () => {
    // Page=2, limit=20 → first item index=20 → with limit=10, page=3
    expect(calcPageOnLimitChange(2, 20, 10)).toBe(3);
  });

  it("returns page 1 minimum", () => {
    expect(calcPageOnLimitChange(1, 50, 100)).toBe(1);
  });

  it("handles same limit (no change)", () => {
    expect(calcPageOnLimitChange(5, 50, 50)).toBe(5);
  });

  it("calculates correctly for non-divisible cases", () => {
    // Page=3, limit=10 → first item index=20 → with limit=15, floor(20/15)+1=2
    expect(calcPageOnLimitChange(3, 10, 15)).toBe(2);
  });
});

describe("parseSearchParams", () => {
  it("returns defaults for empty params", () => {
    const params = new URLSearchParams();
    const result = parseSearchParams(params);
    expect(result.query).toBe("");
    expect(result.targets).toBe("title,description,tags");
    expect(result.sortField).toBe("viewCounter");
    expect(result.sortOrder).toBe("-");
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.tags).toEqual([]);
    expect(result.filters).toEqual({});
  });

  it("parses query and targets", () => {
    const params = new URLSearchParams({ q: "test", targets: "tagsExact" });
    const result = parseSearchParams(params);
    expect(result.query).toBe("test");
    expect(result.targets).toBe("tagsExact");
  });

  it("parses sort field and order", () => {
    const params = new URLSearchParams({ q: "test", sort: "startTime", order: "+" });
    const result = parseSearchParams(params);
    expect(result.sortField).toBe("startTime");
    expect(result.sortOrder).toBe("+");
  });

  it("uses defaults for invalid sort field", () => {
    const params = new URLSearchParams({ sort: "invalid" });
    const result = parseSearchParams(params);
    expect(result.sortField).toBe("viewCounter");
  });

  it("uses defaults for invalid sort order", () => {
    const params = new URLSearchParams({ order: "x" });
    const result = parseSearchParams(params);
    expect(result.sortOrder).toBe("-");
  });

  it("parses page number with minimum 1", () => {
    const params = new URLSearchParams({ page: "0" });
    const result = parseSearchParams(params);
    expect(result.page).toBe(1);
  });

  it("parses page number", () => {
    const params = new URLSearchParams({ page: "5" });
    const result = parseSearchParams(params);
    expect(result.page).toBe(5);
  });

  it("parses limit with max 100", () => {
    const params = new URLSearchParams({ limit: "200" });
    const result = parseSearchParams(params);
    expect(result.limit).toBe(100);
  });

  it("parses limit with min 1", () => {
    const params = new URLSearchParams({ limit: "0" });
    const result = parseSearchParams(params);
    expect(result.limit).toBe(50);
  });

  it("parses tag array", () => {
    const params = new URLSearchParams();
    params.append("tag", "TAG1");
    params.append("tag", "TAG2");
    const result = parseSearchParams(params);
    expect(result.tags).toEqual(["TAG1", "TAG2"]);
  });

  it("parses counter filters", () => {
    const params = new URLSearchParams({
      vcGte: "100",
      vcLte: "1000",
      ccGte: "10",
      ccLte: "500",
      mlGte: "5",
      mlLte: "50",
      lkGte: "1",
      lkLte: "10",
    });
    const result = parseSearchParams(params);
    expect(result.filters.viewCounterGte).toBe(100);
    expect(result.filters.viewCounterLte).toBe(1000);
    expect(result.filters.commentCounterGte).toBe(10);
    expect(result.filters.commentCounterLte).toBe(500);
    expect(result.filters.mylistCounterGte).toBe(5);
    expect(result.filters.mylistCounterLte).toBe(50);
    expect(result.filters.likeCounterGte).toBe(1);
    expect(result.filters.likeCounterLte).toBe(10);
  });

  it("parses meta filters", () => {
    const params = new URLSearchParams({
      stGte: "2024-01-01",
      stLte: "2024-12-31",
      lsGte: "60",
      lsLte: "600",
      genre: "ゲーム",
    });
    const result = parseSearchParams(params);
    expect(result.filters.startTimeGte).toBe("2024-01-01");
    expect(result.filters.startTimeLte).toBe("2024-12-31");
    expect(result.filters.lengthSecondsGte).toBe(60);
    expect(result.filters.lengthSecondsLte).toBe(600);
    expect(result.filters.genre).toBe("ゲーム");
  });

  it("returns undefined for missing optional filters", () => {
    const params = new URLSearchParams();
    const result = parseSearchParams(params);
    expect(result.filters.viewCounterGte).toBeUndefined();
    expect(result.filters.startTimeGte).toBeUndefined();
    expect(result.filters.genre).toBeUndefined();
  });

  it("parses title: prefix from q when no explicit targets param", () => {
    const params = new URLSearchParams({ q: "title:初音ミク" });
    const result = parseSearchParams(params);
    expect(result.query).toBe("初音ミク");
    expect(result.targets).toBe("title");
  });

  it("parses #tag from q when no explicit tag param", () => {
    const params = new URLSearchParams({ q: "初音ミク #VOCALOID" });
    const result = parseSearchParams(params);
    expect(result.query).toBe("初音ミク");
    expect(result.tags).toEqual(["VOCALOID"]);
  });

  it("parses title: prefix with #tag from q", () => {
    const params = new URLSearchParams({ q: "title:初音ミク #VOCALOID" });
    const result = parseSearchParams(params);
    expect(result.query).toBe("初音ミク");
    expect(result.targets).toBe("title");
    expect(result.tags).toEqual(["VOCALOID"]);
  });

  it("uses explicit targets param over prefix in q", () => {
    const params = new URLSearchParams({ q: "初音ミク", targets: "tagsExact" });
    const result = parseSearchParams(params);
    expect(result.query).toBe("初音ミク");
    expect(result.targets).toBe("tagsExact");
  });
});

describe("buildSearchParams", () => {
  it("builds params with defaults (minimal output)", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {},
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.get("q")).toBe("test");
    expect(params.has("targets")).toBe(false);
    expect(params.has("sort")).toBe(false);
    expect(params.has("page")).toBe(false);
    expect(params.has("limit")).toBe(false);
  });

  it("includes non-default sort and order", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "startTime",
      sortOrder: "+",
      filters: {},
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.get("sort")).toBe("startTime");
    expect(params.get("order")).toBe("+");
  });

  it("includes non-default targets", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "tagsExact",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {},
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.get("targets")).toBe("tagsExact");
  });

  it("includes page when > 1", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {},
      tags: [],
      page: 3,
      limit: 50,
    });
    expect(params.get("page")).toBe("3");
  });

  it("includes limit when non-default", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {},
      tags: [],
      page: 1,
      limit: 25,
    });
    expect(params.get("limit")).toBe("25");
  });

  it("includes tags", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {},
      tags: ["TAG1", "TAG2"],
      page: 1,
      limit: 50,
    });
    expect(params.getAll("tag")).toEqual(["TAG1", "TAG2"]);
  });

  it("includes counter filters", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {
        viewCounterGte: 100,
        viewCounterLte: 1000,
        commentCounterGte: 10,
        mylistCounterGte: 5,
        likeCounterGte: 1,
      },
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.get("vcGte")).toBe("100");
    expect(params.get("vcLte")).toBe("1000");
    expect(params.get("ccGte")).toBe("10");
    expect(params.get("mlGte")).toBe("5");
    expect(params.get("lkGte")).toBe("1");
  });

  it("includes meta filters", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {
        startTimeGte: "2024-01-01",
        startTimeLte: "2024-12-31",
        lengthSecondsGte: 60,
        genre: "ゲーム",
      },
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.get("stGte")).toBe("2024-01-01");
    expect(params.get("stLte")).toBe("2024-12-31");
    expect(params.get("lsGte")).toBe("60");
    expect(params.get("genre")).toBe("ゲーム");
  });

  it("omits empty query", () => {
    const params = buildSearchParams({
      query: "",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: {},
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.has("q")).toBe(false);
  });

  it("omits undefined and empty string filters", () => {
    const params = buildSearchParams({
      query: "test",
      targets: "title,description,tags",
      sortField: "viewCounter",
      sortOrder: "-",
      filters: { genre: "" },
      tags: [],
      page: 1,
      limit: 50,
    });
    expect(params.has("genre")).toBe(false);
  });
});
