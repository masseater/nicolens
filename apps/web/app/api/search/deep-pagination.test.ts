import { describe, expect, it, vi } from "vitest";

import type { SnapshotSearchResponse } from "@/shared/types";

import {
  buildWindowedParams,
  computeSearchSignature,
  extractSortInfo,
  getBoundaryChain,
} from "./deep-pagination";

describe("extractSortInfo", () => {
  it("extracts descending sort info from -field", () => {
    const params = new URLSearchParams({ _sort: "-viewCounter" });
    const result = extractSortInfo(params);
    expect(result).toEqual({ field: "viewCounter", descending: true });
  });

  it("extracts ascending sort info from +field", () => {
    const params = new URLSearchParams({ _sort: "+startTime" });
    const result = extractSortInfo(params);
    expect(result).toEqual({ field: "startTime", descending: false });
  });

  it("treats field without prefix as descending", () => {
    const params = new URLSearchParams({ _sort: "viewCounter" });
    const result = extractSortInfo(params);
    expect(result).toEqual({ field: "viewCounter", descending: true });
  });

  it("returns undefined for missing _sort param", () => {
    const params = new URLSearchParams();
    expect(extractSortInfo(params)).toBeUndefined();
  });

  it("returns undefined for empty _sort param", () => {
    const params = new URLSearchParams({ _sort: "" });
    expect(extractSortInfo(params)).toBeUndefined();
  });

  it("returns undefined for unsupported sort field", () => {
    const params = new URLSearchParams({ _sort: "-unknownField" });
    expect(extractSortInfo(params)).toBeUndefined();
  });
});

describe("computeSearchSignature", () => {
  it("excludes _offset and _limit from signature", () => {
    const params = new URLSearchParams({
      q: "test",
      _sort: "-viewCounter",
      _offset: "100",
      _limit: "50",
    });
    const sig = computeSearchSignature(params);
    expect(sig).not.toContain("_offset");
    expect(sig).not.toContain("_limit");
    expect(sig).toContain("q=test");
    expect(sig).toContain("_sort=-viewCounter");
  });

  it("produces sorted signature", () => {
    const params1 = new URLSearchParams();
    params1.set("b", "2");
    params1.set("a", "1");
    const params2 = new URLSearchParams();
    params2.set("a", "1");
    params2.set("b", "2");
    expect(computeSearchSignature(params1)).toBe(computeSearchSignature(params2));
  });
});

describe("buildWindowedParams", () => {
  it("uses corrected offset directly and adds lt filter for descending sort", () => {
    const searchParams = new URLSearchParams({
      q: "test",
      _sort: "-viewCounter",
      _offset: "100050",
      _limit: "50",
    });
    const result = buildWindowedParams({
      searchParams,
      sortInfo: { field: "viewCounter", descending: true },
      boundaryValue: 5000,
      offset: 50,
    });
    expect(result.get("_offset")).toBe("50");
    expect(result.get("filters[viewCounter][lt]")).toBe("5000");
  });

  it("adds gt filter for ascending sort", () => {
    const searchParams = new URLSearchParams({
      q: "test",
      _sort: "+startTime",
      _offset: "100000",
    });
    const result = buildWindowedParams({
      searchParams,
      sortInfo: { field: "startTime", descending: false },
      boundaryValue: "2024-01-01T00:00:00",
      offset: 0,
    });
    expect(result.get("_offset")).toBe("0");
    expect(result.get("filters[startTime][gt]")).toBe("2024-01-01T00:00:00");
  });
});

describe("getBoundaryChain", () => {
  const makeResponse = (viewCounter: number, totalCount: number): SnapshotSearchResponse => ({
    meta: { status: 200, totalCount, id: "test-id" },
    data: [
      {
        contentId: "sm1",
        title: "test",
        viewCounter,
        mylistCounter: 0,
        likeCounter: 0,
        lengthSeconds: 60,
        thumbnailUrl: "https://example.com/thumb.jpg",
        startTime: "2024-01-01",
        commentCounter: 0,
      },
    ],
  });

  it("returns boundary for targetWindow 1", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: makeResponse(5000, 200000),
      ok: true,
    });

    const result = await getBoundaryChain({
      baseParams: new URLSearchParams({ q: "test", _sort: "-viewCounter" }),
      sortInfo: { field: "viewCounter", descending: true },
      targetWindow: 1,
      signature: "test-sig",
      fetchFn,
    });

    expect(result.boundaryValue).toBe(5000);
    expect(result.originalTotalCount).toBe(200000);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("chains boundaries for targetWindow 2", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        data: makeResponse(5000, 200000),
        ok: true,
      })
      .mockResolvedValueOnce({
        data: makeResponse(1000, 200000),
        ok: true,
      });

    const result = await getBoundaryChain({
      baseParams: new URLSearchParams({ q: "test", _sort: "-viewCounter" }),
      sortInfo: { field: "viewCounter", descending: true },
      targetWindow: 2,
      signature: "test-sig-chain",
      fetchFn,
    });

    expect(result.boundaryValue).toBe(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws when targetWindow is 0", async () => {
    const fetchFn = vi.fn();

    await expect(
      getBoundaryChain({
        baseParams: new URLSearchParams(),
        sortInfo: { field: "viewCounter", descending: true },
        targetWindow: 0,
        signature: "test-sig-zero",
        fetchFn,
      }),
    ).rejects.toThrow("Failed to establish boundary chain");
  });

  it("throws when upstream fetch fails", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: { meta: { status: 500, errorCode: "ERR", errorMessage: "fail" } },
      ok: false,
    });

    await expect(
      getBoundaryChain({
        baseParams: new URLSearchParams(),
        sortInfo: { field: "viewCounter", descending: true },
        targetWindow: 1,
        signature: "test-sig-fail",
        fetchFn,
      }),
    ).rejects.toThrow("Boundary discovery request failed");
  });

  it("throws when response data is empty", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: { meta: { status: 200, totalCount: 0, id: "test" }, data: [] },
      ok: true,
    });

    await expect(
      getBoundaryChain({
        baseParams: new URLSearchParams(),
        sortInfo: { field: "viewCounter", descending: true },
        targetWindow: 1,
        signature: "test-sig-empty",
        fetchFn,
      }),
    ).rejects.toThrow("No boundary item found");
  });

  it("throws when response has no data property", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      data: { meta: { status: 200, errorCode: "ERR", errorMessage: "err" } },
      ok: true,
    });

    await expect(
      getBoundaryChain({
        baseParams: new URLSearchParams(),
        sortInfo: { field: "viewCounter", descending: true },
        targetWindow: 1,
        signature: "test-sig-nodata",
        fetchFn,
      }),
    ).rejects.toThrow("Boundary response missing data");
  });
});
