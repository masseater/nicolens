import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules BEFORE importing the route
vi.mock("@/shared/db", () => {
  const col = (name: string) => ({ name });
  return {
    getDb: vi.fn(),
    taglessVideos: {
      contentId: col("content_id"),
      month: col("month"),
      title: col("title"),
      description: col("description"),
      userId: col("user_id"),
      channelId: col("channel_id"),
      viewCounter: col("view_counter"),
      mylistCounter: col("mylist_counter"),
      likeCounter: col("like_counter"),
      lengthSeconds: col("length_seconds"),
      thumbnailUrl: col("thumbnail_url"),
      startTime: col("start_time"),
      lastResBody: col("last_res_body"),
      commentCounter: col("comment_counter"),
      lastCommentTime: col("last_comment_time"),
      categoryTags: col("category_tags"),
      tags: col("tags"),
      genre: col("genre"),
    },
    taglessCrawlStatus: { month: col("month") },
  };
});

const mockEnsureCrawled = vi.fn().mockResolvedValue(undefined);
vi.mock("./crawl", () => ({
  ensureCrawled: (...args: unknown[]): Promise<void> => mockEnsureCrawled(...args) as Promise<void>, // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock
}));

vi.mock("@/shared/lib", () => ({
  JST_OFFSET_HOURS: 9,
  MINUTES_PER_HOUR: 60,
  MS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  getSecondsUntilNextSnapshot: () => 3600,
  isCacheStillValid: () => true,
}));

vi.mock("./tagless-filters", () => ({
  parseFilters: vi.fn().mockReturnValue({}),
  buildWhereConditions: vi.fn().mockReturnValue([]),
}));

import { getDb } from "@/shared/db";

import { GET } from "./route";

interface TaglessApiResponse {
  meta: {
    status: number;
    totalCount?: number;
    id?: string;
    errorCode?: string;
    errorMessage?: string;
  };
  data?: Record<string, unknown>[];
}

const makeRequest = (params: Record<string, string> = {}): NextRequest => {
  const searchParams = new URLSearchParams(params);
  return new NextRequest(`http://localhost/api/tagless?${searchParams.toString()}`);
};

const createMockDbChain = (countValue: number, rows: Record<string, unknown>[]) => {
  const countChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ value: countValue }]),
  };

  const dataChain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  };

  return {
    select: vi.fn((...args: unknown[]) => {
      // First call is count query (has args), second is data query (no args)
      if (args.length > 0) {
        return countChain.select(); // oxlint-disable-line @typescript-eslint/no-unsafe-return -- mock chain
      }
      return dataChain.select(); // oxlint-disable-line @typescript-eslint/no-unsafe-return -- mock chain
    }),
    _countChain: countChain,
    _dataChain: dataChain,
  };
};

const mockVideoRow = {
  contentId: "sm123",
  title: "Test Video",
  description: "desc",
  userId: 1,
  channelId: null,
  viewCounter: 1000,
  mylistCounter: 50,
  likeCounter: 30,
  lengthSeconds: 120,
  thumbnailUrl: "https://example.com/thumb.jpg",
  startTime: "2025-01-15T00:00:00+09:00",
  lastResBody: null,
  commentCounter: 200,
  lastCommentTime: null,
  categoryTags: null,
  tags: null,
  genre: null,
  month: "2025-01",
};

describe("GET /api/tagless", () => {
  beforeEach(() => {
    mockEnsureCrawled.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockEnsureCrawled.mockReset().mockResolvedValue(undefined);
  });

  it("returns error response when ensureCrawled throws Invalid month format", async () => {
    mockEnsureCrawled.mockRejectedValue(new Error("Invalid month format: bad"));
    const response = await GET(makeRequest({ month: "bad" }));
    const data = (await response.json()) as TaglessApiResponse;
    expect(response.status).toBe(400);
    expect(data.meta.errorCode).toBe("BAD_REQUEST");
    expect(data.meta.errorMessage).toContain("Invalid month");
  });

  it("returns 500 error on generic crawl error", async () => {
    mockEnsureCrawled.mockRejectedValue(new Error("DB connection failed"));
    const response = await GET(makeRequest({ month: "2025-01" }));
    const data = (await response.json()) as TaglessApiResponse;
    expect(response.status).toBe(500);
    expect(data.meta.errorCode).toBe("CRAWL_ERROR");
    expect(data.meta.errorMessage).toBe("DB connection failed");
  });

  it("returns 500 error with default message when non-Error is thrown", async () => {
    mockEnsureCrawled.mockRejectedValue("some string error");
    const response = await GET(makeRequest({ month: "2025-01" }));
    const data = (await response.json()) as TaglessApiResponse;
    expect(response.status).toBe(500);
    expect(data.meta.errorCode).toBe("CRAWL_ERROR");
    expect(data.meta.errorMessage).toBe("クロール中にエラーが発生しました");
  });

  it("returns successful response with data from DB", async () => {
    const mockDb = createMockDbChain(1, [mockVideoRow]);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const response = await GET(makeRequest({ month: "2025-01", sort: "viewCounter", order: "-" }));
    const data = (await response.json()) as TaglessApiResponse;
    expect(response.status).toBe(200);
    expect(data.meta.status).toBe(200);
    expect(data.meta.totalCount).toBe(1);
    expect(data.data).toHaveLength(1);
    expect(data.data?.[0]?.contentId).toBe("sm123");
  });

  it("returns cached response on second request with same params", async () => {
    const mockDb = createMockDbChain(1, [mockVideoRow]);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const params = { month: "2025-02", sort: "viewCounter", order: "-" };
    const response1 = await GET(makeRequest(params));
    const response2 = await GET(makeRequest(params));

    const data1 = (await response1.json()) as TaglessApiResponse;
    const data2 = (await response2.json()) as TaglessApiResponse;

    expect(data1.meta.totalCount).toBe(1);
    expect(data2.meta.totalCount).toBe(1);
    // EnsureCrawled should only be called once due to cache
    expect(mockEnsureCrawled).toHaveBeenCalledOnce();
  });

  it("uses default month when not provided", async () => {
    const mockDb = createMockDbChain(0, []);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const response = await GET(makeRequest({}));
    const data = (await response.json()) as TaglessApiResponse;
    expect(response.status).toBe(200);
    expect(data.meta.id).toMatch(/^tagless-\d{4}-\d{2}$/);
  });

  it("uses default sort and order when not provided", async () => {
    const mockDb = createMockDbChain(0, []);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const response = await GET(makeRequest({ month: "2025-03" }));
    const data = (await response.json()) as TaglessApiResponse;
    expect(response.status).toBe(200);
    expect(data.meta.totalCount).toBe(0);
  });

  it("returns zero count when no rows match", async () => {
    const mockDb = createMockDbChain(0, []);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const response = await GET(makeRequest({ month: "2025-04" }));
    const data = (await response.json()) as TaglessApiResponse;
    expect(data.meta.totalCount).toBe(0);
    expect(data.data).toEqual([]);
  });

  it("converts null fields to undefined in response", async () => {
    const mockDb = createMockDbChain(1, [mockVideoRow]);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const response = await GET(makeRequest({ month: "2025-05" }));
    const data = (await response.json()) as TaglessApiResponse;
    const video = data.data?.[0];
    // Null DB fields should not appear as null in response (converted to undefined, which is omitted in JSON)
    expect(video).not.toHaveProperty("channelId");
    expect(video).not.toHaveProperty("lastResBody");
  });

  it("sets cache-control headers on success response", async () => {
    const mockDb = createMockDbChain(0, []);
    // @ts-expect-error -- mock object intentionally doesn't implement full DB interface
    vi.mocked(getDb).mockReturnValue(mockDb); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- test mock

    const response = await GET(makeRequest({ month: "2025-06" }));
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age=");
    expect(cacheControl).toContain("stale-while-revalidate=");
  });
});
