import { describe, expect, it } from "vitest";

import { parseFilters } from "./tagless-filters";

describe("parseFilters", () => {
  it("returns all undefined for empty search params", () => {
    const result = parseFilters(new URLSearchParams());

    expect(result.viewCounterGte).toBeUndefined();
    expect(result.viewCounterLte).toBeUndefined();
    expect(result.commentCounterGte).toBeUndefined();
    expect(result.commentCounterLte).toBeUndefined();
    expect(result.mylistCounterGte).toBeUndefined();
    expect(result.mylistCounterLte).toBeUndefined();
    expect(result.likeCounterGte).toBeUndefined();
    expect(result.likeCounterLte).toBeUndefined();
    expect(result.lengthSecondsGte).toBeUndefined();
    expect(result.lengthSecondsLte).toBeUndefined();
    expect(result.startTimeGte).toBeUndefined();
    expect(result.startTimeLte).toBeUndefined();
    expect(result.genre).toBeUndefined();
  });

  it("parses viewCounter params", () => {
    const params = new URLSearchParams({ vcGte: "100", vcLte: "5000" });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBe(100);
    expect(result.viewCounterLte).toBe(5000);
  });

  it("parses commentCounter params", () => {
    const params = new URLSearchParams({ ccGte: "10", ccLte: "200" });
    const result = parseFilters(params);

    expect(result.commentCounterGte).toBe(10);
    expect(result.commentCounterLte).toBe(200);
  });

  it("parses mylistCounter params", () => {
    const params = new URLSearchParams({ mlGte: "5", mlLte: "50" });
    const result = parseFilters(params);

    expect(result.mylistCounterGte).toBe(5);
    expect(result.mylistCounterLte).toBe(50);
  });

  it("parses likeCounter params", () => {
    const params = new URLSearchParams({ lkGte: "1", lkLte: "999" });
    const result = parseFilters(params);

    expect(result.likeCounterGte).toBe(1);
    expect(result.likeCounterLte).toBe(999);
  });

  it("parses lengthSeconds params", () => {
    const params = new URLSearchParams({ lsGte: "60", lsLte: "3600" });
    const result = parseFilters(params);

    expect(result.lengthSecondsGte).toBe(60);
    expect(result.lengthSecondsLte).toBe(3600);
  });

  it("returns undefined for non-finite numeric values", () => {
    const params = new URLSearchParams({
      vcGte: "abc",
      ccGte: "NaN",
      mlGte: "Infinity",
    });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBeUndefined();
    expect(result.commentCounterGte).toBeUndefined();
    expect(result.mylistCounterGte).toBeUndefined();
    expect(result.lengthSecondsGte).toBeUndefined();
  });

  it("treats empty string as 0 since Number('') is finite", () => {
    const params = new URLSearchParams({ vcGte: "" });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBe(0);
  });

  it("parses startTime string params as-is", () => {
    const params = new URLSearchParams({
      stGte: "2024-01-01T00:00:00+09:00",
      stLte: "2024-12-31T23:59:59+09:00",
    });
    const result = parseFilters(params);

    expect(result.startTimeGte).toBe("2024-01-01T00:00:00+09:00");
    expect(result.startTimeLte).toBe("2024-12-31T23:59:59+09:00");
  });

  it("parses genre param as-is", () => {
    const params = new URLSearchParams({ genre: "ゲーム" });
    const result = parseFilters(params);

    expect(result.genre).toBe("ゲーム");
  });

  it("handles a mix of present and absent params", () => {
    const params = new URLSearchParams({ vcGte: "100", genre: "音楽・サウンド" });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBe(100);
    expect(result.viewCounterLte).toBeUndefined();
    expect(result.genre).toBe("音楽・サウンド");
    expect(result.startTimeGte).toBeUndefined();
  });

  it("parses zero as a valid numeric value", () => {
    const params = new URLSearchParams({ vcGte: "0" });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBe(0);
  });

  it("parses negative numbers as valid numeric values", () => {
    const params = new URLSearchParams({ vcGte: "-1" });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBe(-1);
  });

  it("parses decimal numbers as valid numeric values", () => {
    const params = new URLSearchParams({ vcGte: "3.14" });
    const result = parseFilters(params);

    expect(result.viewCounterGte).toBe(3.14);
  });
});
