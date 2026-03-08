import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SnapshotSearchResponse } from "@/shared/types";

import { GET } from "./route";

const makeSuccessResponse = (totalCount = 1): SnapshotSearchResponse => ({
  meta: { status: 200, totalCount, id: "test-id" },
  data: [
    {
      contentId: "sm1",
      title: "Test",
      viewCounter: 100,
      mylistCounter: 10,
      likeCounter: 5,
      lengthSeconds: 60,
      thumbnailUrl: "https://example.com/thumb.jpg",
      startTime: "2024-01-01",
      commentCounter: 50,
    },
  ],
});

const makeRequest = (params: Record<string, string> = {}): NextRequest => {
  const searchParams = new URLSearchParams(params);
  const url = `http://localhost/api/search?${searchParams.toString()}`;
  return new NextRequest(url);
};

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeSuccessResponse()),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns proxied response from upstream API", async () => {
    const response = await GET(makeRequest({ q: "test1", _sort: "-viewCounter" }));
    const data: Record<string, unknown> = await response.json();
    expect(data).toHaveProperty("meta");
    expect(data).toHaveProperty("data");
  });

  it("returns cached response on second request with same params", async () => {
    const request = makeRequest({ q: "cache-test1", _sort: "-viewCounter" });
    await GET(request);
    const request2 = makeRequest({ q: "cache-test1", _sort: "-viewCounter" });
    await GET(request2);
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("handles upstream API errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            meta: { status: 400, errorCode: "BAD_REQUEST", errorMessage: "bad" },
          }),
      }),
    );
    const response = await GET(makeRequest({ q: "error-test1", _sort: "-viewCounter" }));
    const data = (await response.json()) as { meta: { status: number } }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(data.meta.status).toBe(400);
  });

  it("returns proxy error on fetch exception", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const response = await GET(makeRequest({ q: "exception-test1", _sort: "-viewCounter" }));
    const data = (await response.json()) as { meta: { errorCode: string } }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(data.meta.errorCode).toBe("PROXY_ERROR");
  });

  it("returns proxy error for invalid response format", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve("not an object"),
      }),
    );
    const response = await GET(makeRequest({ q: "invalid-format1", _sort: "-viewCounter" }));
    const data = (await response.json()) as { meta: { errorCode: string } }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(data.meta.errorCode).toBe("PROXY_ERROR");
  });

  it("adds _context param if missing", async () => {
    await GET(makeRequest({ q: "context-test1" }));
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(url).toContain("_context=nicolens");
  });

  it("preserves existing _context param", async () => {
    await GET(makeRequest({ q: "context-test2", _context: "custom" }));
    const fetchMock = vi.mocked(fetch);
    const url = fetchMock.mock.calls[0]?.[0] as string; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(url).toContain("_context=custom");
  });

  it("handles deep pagination with large offset", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeSuccessResponse(200000)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeSuccessResponse(200000)),
        }),
    );
    const response = await GET(
      makeRequest({
        q: "deep-page-test1",
        _sort: "-viewCounter",
        _offset: "100050",
        _limit: "50",
      }),
    );
    const data: Record<string, unknown> = await response.json();
    expect(data).toHaveProperty("meta");
  });

  it("returns proxy error when deep pagination has no sort info", async () => {
    const response = await GET(
      makeRequest({
        q: "no-sort-test1",
        _offset: "100050",
        _limit: "50",
      }),
    );
    const data = (await response.json()) as { meta: { errorCode: string } }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(data.meta.errorCode).toBe("PROXY_ERROR");
  });

  it("handles non-ok response during deep pagination windowed fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeSuccessResponse(200000)),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () =>
            Promise.resolve({
              meta: { status: 500, errorCode: "ERR", errorMessage: "fail" },
            }),
        }),
    );
    const response = await GET(
      makeRequest({
        q: "deep-page-error1",
        _sort: "-viewCounter",
        _offset: "100050",
        _limit: "50",
      }),
    );
    const data = (await response.json()) as { meta: { status: number } }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
    expect(data.meta.status).toBe(500);
  });
});
