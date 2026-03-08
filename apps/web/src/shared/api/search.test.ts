import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchState, SnapshotSearchResponse } from "@/shared/types";

import { searchVideos } from "./search";

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

const defaultState: SearchState = {
  query: "test",
  targets: "title,description,tags",
  sortField: "viewCounter",
  sortOrder: "-",
  filters: {},
  tags: [],
  page: 1,
  limit: 50,
};

describe("searchVideos", () => {
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

  it("fetches search results successfully", async () => {
    const result = await searchVideos(defaultState);
    expect(result.data).toHaveLength(1);
    expect(result.meta.totalCount).toBe(1);
  });

  it("builds correct URL with query params", async () => {
    await searchVideos(defaultState);
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("q=test");
    expect(url).toContain("targets=title%2Cdescription%2Ctags");
    expect(url).toContain("_sort=-viewCounter");
    expect(url).toContain("_offset=0");
    expect(url).toContain("_limit=50");
    expect(url).toContain("_context=nicolens");
  });

  it("calculates correct offset for page 2", async () => {
    await searchVideos({ ...defaultState, page: 2 });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("_offset=50");
  });

  it("includes filter parameters in URL", async () => {
    await searchVideos({
      ...defaultState,
      filters: {
        viewCounterGte: 100,
        viewCounterLte: 1000,
        genre: "ゲーム",
      },
    });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("filters[viewCounter][gte]=100");
    expect(url).toContain("filters[viewCounter][lte]=1000");
    expect(url).toContain("filters[genre.keyword][0]=");
  });

  it("includes tag filters in URL", async () => {
    await searchVideos({ ...defaultState, tags: ["VOCALOID", "初音ミク"] });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("filters[tagsExact][0]=VOCALOID");
    expect(url).toContain("filters[tagsExact][1]=");
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
    await expect(searchVideos(defaultState)).rejects.toThrow(
      "検索条件に誤りがあります。条件を見直してください。",
    );
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
    await expect(searchVideos(defaultState)).rejects.toThrow("メンテナンス中");
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
    await expect(searchVideos(defaultState)).rejects.toThrow("サーバーエラー");
  });

  it("uses error message from response body when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            meta: { errorMessage: "Custom error message" },
          }),
      }),
    );
    await expect(searchVideos(defaultState)).rejects.toThrow("Custom error message");
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
    await expect(searchVideos(defaultState)).rejects.toThrow("サーバーエラー");
  });

  it("throws on unexpected response format", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve("not an object"),
      }),
    );
    await expect(searchVideos(defaultState)).rejects.toThrow("Unexpected response format");
  });

  it("throws on null response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      }),
    );
    await expect(searchVideos(defaultState)).rejects.toThrow("Unexpected response format");
  });

  it("includes all range filters in URL", async () => {
    await searchVideos({
      ...defaultState,
      filters: {
        startTimeGte: "2024-01-01",
        startTimeLte: "2024-12-31",
        lengthSecondsGte: 60,
        lengthSecondsLte: 600,
        commentCounterGte: 10,
        commentCounterLte: 100,
        mylistCounterGte: 5,
        mylistCounterLte: 50,
        likeCounterGte: 1,
        likeCounterLte: 10,
      },
    });
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("filters[startTime][gte]=2024-01-01");
    expect(url).toContain("filters[lengthSeconds][gte]=60");
    expect(url).toContain("filters[commentCounter][gte]=10");
    expect(url).toContain("filters[mylistCounter][gte]=5");
    expect(url).toContain("filters[likeCounter][gte]=1");
  });
});
