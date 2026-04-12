import { getDb, taglessVideos } from "@nicolens/datastore";
import { type SQL, and, asc, count, desc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import {
  JST_OFFSET_HOURS,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  getSecondsUntilNextSnapshot,
  isCacheStillValid,
} from "@/shared/lib";
import type { SortField, SortOrder, VideoContent } from "@/shared/types";

import { ensureCrawled } from "./crawl";
import { buildWhereConditions, parseFilters } from "./tagless-filters";

const SWR_MULTIPLIER = 2;
const MAX_CACHE_SIZE = 500;

interface TaglessCacheEntry {
  response: { data: VideoContent[]; totalCount: number; month: string };
  timestamp: number;
}

const taglessCache = new Map<string, TaglessCacheEntry>();

const buildTaglessCacheHeaders = () => {
  const maxAge = getSecondsUntilNextSnapshot();
  const swr = maxAge * SWR_MULTIPLIER;
  return {
    "Cache-Control": `public, max-age=${String(maxAge)}, s-maxage=${String(maxAge)}, stale-while-revalidate=${String(swr)}`,
  };
};

const cleanExpiredTaglessCache = () => {
  for (const [key, entry] of taglessCache) {
    if (!isCacheStillValid(entry.timestamp)) {
      taglessCache.delete(key);
    }
  }
};

const HTTP_BAD_REQUEST = 400;
const HTTP_OK = 200;
const HTTP_INTERNAL_ERROR = 500;
const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE = 1;
const PAGE_OFFSET_BASE = 1;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;
const SORT_FALLBACK = 0;
const ZERO_COUNT = 0;

const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

// Parse month param with default to current month in JST
const parseMonthParam = (param: string | null): string => {
  if (param !== null && /^\d{4}-\d{2}$/.test(param)) {
    return param;
  }
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}`;
};

const VALID_SORT_FIELDS = new Set<SortField>([
  "viewCounter",
  "mylistCounter",
  "likeCounter",
  "lengthSeconds",
  "startTime",
  "commentCounter",
  "lastCommentTime",
]);

const isSortField = (value: string): value is SortField =>
  VALID_SORT_FIELDS.has(value as SortField); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- narrowing guard

const parseSortField = (param: string | null): SortField => {
  if (param !== null && isSortField(param)) {
    return param;
  }
  return "viewCounter";
};

const parseSortOrder = (param: string | null): SortOrder => (param === "+" ? "+" : "-");

const parseIntParam = (param: string | null, fallback: number): number => {
  if (param === null) {
    return fallback;
  }
  const num = Number(param);
  return Number.isFinite(num) && num > SORT_FALLBACK ? Math.floor(num) : fallback;
};

const SORT_FIELD_TO_COLUMN = {
  viewCounter: taglessVideos.viewCounter,
  mylistCounter: taglessVideos.mylistCounter,
  likeCounter: taglessVideos.likeCounter,
  lengthSeconds: taglessVideos.lengthSeconds,
  startTime: taglessVideos.startTime,
  commentCounter: taglessVideos.commentCounter,
  lastCommentTime: taglessVideos.lastCommentTime,
} as const;

const dbRowToVideoContent = (row: typeof taglessVideos.$inferSelect): VideoContent => ({
  contentId: row.contentId,
  title: row.title,
  description: row.description ?? undefined,
  userId: row.userId ?? undefined,
  channelId: row.channelId ?? undefined,
  viewCounter: row.viewCounter,
  mylistCounter: row.mylistCounter,
  likeCounter: row.likeCounter,
  lengthSeconds: row.lengthSeconds,
  thumbnailUrl: row.thumbnailUrl,
  startTime: row.startTime,
  lastResBody: row.lastResBody ?? undefined,
  commentCounter: row.commentCounter,
  lastCommentTime: row.lastCommentTime ?? undefined,
  categoryTags: row.categoryTags ?? undefined,
  tags: row.tags ?? undefined,
  genre: row.genre ?? undefined,
});

const parseRequestParams = (searchParams: URLSearchParams) => ({
  query: (searchParams.get("q") ?? "").trim(),
  month: parseMonthParam(searchParams.get("month")),
  sortField: parseSortField(searchParams.get("sort")),
  sortOrder: parseSortOrder(searchParams.get("order")),
  page: parseIntParam(searchParams.get("page"), DEFAULT_PAGE),
  limit: parseIntParam(searchParams.get("limit"), DEFAULT_LIMIT),
  filters: parseFilters(searchParams),
});

const buildSuccessResponse = (data: VideoContent[], totalCount: number, month: string) =>
  NextResponse.json(
    {
      meta: {
        status: HTTP_OK,
        totalCount,
        id: `tagless-${month}`,
      },
      data,
    },
    { headers: buildTaglessCacheHeaders() },
  );

interface SearchQueryOptions {
  where: SQL | undefined;
  sortField: SortField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

const executeSearchQueries = (options: SearchQueryOptions) => {
  const db = getDb();
  const sortColumn = SORT_FIELD_TO_COLUMN[options.sortField];
  const orderBy = options.sortOrder === "+" ? asc(sortColumn) : desc(sortColumn);
  const offset = (options.page - PAGE_OFFSET_BASE) * options.limit;

  return Promise.all([
    db.select({ value: count() }).from(taglessVideos).where(options.where),
    db
      .select()
      .from(taglessVideos)
      .where(options.where)
      .orderBy(orderBy)
      .limit(options.limit)
      .offset(offset),
  ]);
};

const processSearch = async (searchParams: URLSearchParams, cacheKey: string) => {
  const { query, month, sortField, sortOrder, page, limit, filters } =
    parseRequestParams(searchParams);

  await ensureCrawled(month);

  const where = and(...buildWhereConditions(month, filters, query));
  const [countResult, rows] = await executeSearchQueries({
    where,
    sortField,
    sortOrder,
    page,
    limit,
  });

  const [countRow] = countResult;
  const totalCount = countRow?.value ?? ZERO_COUNT;
  const data = rows.map((row) => dbRowToVideoContent(row));

  return storeTaglessCache({ cacheKey, data, totalCount, month });
};

const buildErrorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "クロール中にエラーが発生しました";
  const status = message.includes("Invalid month") ? HTTP_BAD_REQUEST : HTTP_INTERNAL_ERROR;
  const errorCode = status === HTTP_BAD_REQUEST ? "BAD_REQUEST" : "CRAWL_ERROR";
  return NextResponse.json({ meta: { status, errorCode, errorMessage: message } }, { status });
};

const getCachedTaglessResponse = (cacheKey: string): NextResponse | undefined => {
  const cached = taglessCache.get(cacheKey);
  if (cached !== undefined && isCacheStillValid(cached.timestamp)) {
    const { data, totalCount, month } = cached.response;
    return buildSuccessResponse(data, totalCount, month);
  }
  return undefined;
};

interface TaglessCacheStoreArgs {
  cacheKey: string;
  data: VideoContent[];
  totalCount: number;
  month: string;
}

const storeTaglessCache = (args: TaglessCacheStoreArgs): NextResponse => {
  taglessCache.set(args.cacheKey, {
    response: { data: args.data, totalCount: args.totalCount, month: args.month },
    timestamp: Date.now(),
  });
  if (taglessCache.size > MAX_CACHE_SIZE) {
    cleanExpiredTaglessCache();
  }
  return buildSuccessResponse(args.data, args.totalCount, args.month);
};

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const cacheKey = searchParams.toString();

  const cachedResponse = getCachedTaglessResponse(cacheKey);
  if (cachedResponse !== undefined) {
    return cachedResponse;
  }

  try {
    return await processSearch(searchParams, cacheKey);
  } catch (error: unknown) {
    return buildErrorResponse(error);
  }
};
