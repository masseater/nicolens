import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SnapshotSearchResponse, TaglessSearchState } from "@/shared/types";

import { searchTaglessVideos } from "./tagless";

const mockResponse: SnapshotSearchResponse = {
  meta: { status: 200, totalCount: 1, id: "test-id" },
  data: [
    {
      contentId: "sm1",
      title: "Test Video",
      viewCounter: 100,
      mylistCounter: 10,
      likeCounter: 5,
      lengthSeconds: 120,
      thumbnailUrl: "https://example.com/thumb.jpg",
      startTime: "2024-01-01T00:00:00+09:00",
      commentCounter: 50,
    },
  ],
};

const defaultState: TaglessSearchState = {
  query: "",
  month: "2025-01",
  sortField: "viewCounter",
  sortOrder: "-",
  filters: {},
  page: 1,
  limit: 50,
};

describe("searchTaglessVideos", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches tagless results successfully", async () => {
    const result = await searchTaglessVideos(defaultState);
    expect(result.data).toHaveLength(1);
    expect(result.meta.totalCount).toBe(1);
  });

  it("builds correct URL with base params", async () => {
    await searchTaglessVideos(defaultState);
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("month=2025-01");
    expect(url).toContain("sort=viewCounter");
    expect(url).toContain("order=-");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=50");
  });

  it("includes query param when provided", async () => {
    await searchTaglessVideos({ ...defaultState, query: "test" });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("q=test");
  });

  it("does not include query param when empty", async () => {
    await searchTaglessVideos(defaultState);
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).not.toContain("q=");
  });

  it("includes filter parameters in URL", async () => {
    await searchTaglessVideos({
      ...defaultState,
      filters: {
        viewCounterGte: 100,
        viewCounterLte: 1000,
        genre: "ゲーム",
      },
    });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("vcGte=100");
    expect(url).toContain("vcLte=1000");
    expect(url).toContain("genre=");
  });

  it("includes all range filters", async () => {
    await searchTaglessVideos({
      ...defaultState,
      filters: {
        commentCounterGte: 10,
        commentCounterLte: 100,
        mylistCounterGte: 5,
        mylistCounterLte: 50,
        likeCounterGte: 1,
        likeCounterLte: 10,
        lengthSecondsGte: 60,
        lengthSecondsLte: 600,
        startTimeGte: "2024-01-01",
        startTimeLte: "2024-12-31",
      },
    });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("ccGte=10");
    expect(url).toContain("ccLte=100");
    expect(url).toContain("mlGte=5");
    expect(url).toContain("mlLte=50");
    expect(url).toContain("lkGte=1");
    expect(url).toContain("lkLte=10");
    expect(url).toContain("lsGte=60");
    expect(url).toContain("lsLte=600");
    expect(url).toContain("stGte=2024-01-01");
    expect(url).toContain("stLte=2024-12-31");
  });

  it("throws on 400 error with appropriate message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ meta: {} }),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("パラメータに誤り");
  });

  it("throws on 503 error with maintenance message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ meta: {} }),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("メンテナンス中");
  });

  it("throws on other errors with generic message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ meta: {} }),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("サーバーエラー");
  });

  it("uses error message from response body when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            meta: { errorMessage: "Custom error" },
          }),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("Custom error");
  });

  it("handles json parse failure on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("parse error")),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("サーバーエラー");
  });

  it("throws on unexpected response format (string)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve("not an object"),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("Unexpected response format");
  });

  it("throws on null response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      }),
    );
    await expect(searchTaglessVideos(defaultState)).rejects.toThrow("Unexpected response format");
  });
});
