import { getDb, videoEmbeddings } from "@nicolens/datastore";
import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getSecondsUntilNextSnapshot, isCacheStillValid } from "@/shared/lib";
import { generateQueryEmbedding } from "@/shared/lib/embedding";
import { recordUsage } from "@/shared/lib/usage-monitor";
import type { SemanticSearchResponse } from "@/shared/types";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_SERVICE_UNAVAILABLE = 503;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const MIN_LIMIT = 1;
const PAGE_OFFSET_BASE = 1;
const SIMILARITY_THRESHOLD = 0.5;
const FIRST_RESULT_INDEX = 0;
const INITIAL_COUNT = 0;
const MAX_CACHE_SIZE = 200;
const SWR_MULTIPLIER = 2;

interface SemanticCacheEntry {
  response: SemanticSearchResponse;
  timestamp: number;
}

const semanticCache = new Map<string, SemanticCacheEntry>();

const buildCacheHeaders = () => {
  const maxAge = getSecondsUntilNextSnapshot();
  const swr = maxAge * SWR_MULTIPLIER;
  return {
    "Cache-Control": `public, max-age=${String(maxAge)}, s-maxage=${String(maxAge)}, stale-while-revalidate=${String(swr)}`,
  };
};

const cleanExpiredSemanticCache = () => {
  for (const [key, entry] of semanticCache) {
    if (!isCacheStillValid(entry.timestamp)) {
      semanticCache.delete(key);
    }
  }
};

const parseParams = (
  searchParams: URLSearchParams,
): { query: string; page: number; limit: number } | null => {
  const query = searchParams.get("q");
  if (query === null || query.trim() === "") {
    return null;
  }
  const page = Math.max(DEFAULT_PAGE, Number(searchParams.get("page") ?? String(DEFAULT_PAGE)));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(MIN_LIMIT, Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT))),
  );
  return { query: query.trim(), page, limit };
};

const getCachedSemanticResponse = (cacheKey: string): NextResponse | undefined => {
  const cached = semanticCache.get(cacheKey);
  if (cached !== undefined && isCacheStillValid(cached.timestamp)) {
    return NextResponse.json(cached.response, { headers: buildCacheHeaders() });
  }
  return undefined;
};

const storeSemanticCache = (cacheKey: string, response: SemanticSearchResponse): NextResponse => {
  semanticCache.set(cacheKey, { response, timestamp: Date.now() });
  if (semanticCache.size > MAX_CACHE_SIZE) {
    cleanExpiredSemanticCache();
  }
  return NextResponse.json(response, { headers: buildCacheHeaders() });
};

const extractCount = (rows: { count: number }[]): number =>
  Number(rows[FIRST_RESULT_INDEX]?.count ?? INITIAL_COUNT);

const toVectorString = (embedding: number[]): string => `[${embedding.join(",")}]`;

const buildSimilarityQuery = (
  db: ReturnType<typeof getDb>,
  vecStr: string,
  params: { limit: number; page: number },
) => {
  const similarity = sql<number>`(1 - (${videoEmbeddings.embedding} <=> ${vecStr}::vector))`;
  const offset = (params.page - PAGE_OFFSET_BASE) * params.limit;
  return db
    .select({
      contentId: videoEmbeddings.contentId,
      title: videoEmbeddings.title,
      description: videoEmbeddings.description,
      tags: videoEmbeddings.tags,
      genre: videoEmbeddings.genre,
      thumbnailUrl: videoEmbeddings.thumbnailUrl,
      viewCounter: videoEmbeddings.viewCounter,
      mylistCounter: videoEmbeddings.mylistCounter,
      likeCounter: videoEmbeddings.likeCounter,
      commentCounter: videoEmbeddings.commentCounter,
      lengthSeconds: videoEmbeddings.lengthSeconds,
      startTime: videoEmbeddings.startTime,
      similarity,
    })
    .from(videoEmbeddings)
    .where(sql`${similarity} > ${SIMILARITY_THRESHOLD}`)
    .orderBy(sql`${similarity} DESC`)
    .limit(params.limit)
    .offset(offset);
};

const executeSemanticSearch = async (params: {
  query: string;
  page: number;
  limit: number;
}): Promise<SemanticSearchResponse | null> => {
  const usage = recordUsage();
  if (!usage.allowed) {
    return null;
  }
  const queryEmbedding = await generateQueryEmbedding(params.query);
  const vecStr = toVectorString(queryEmbedding);
  const db = getDb();

  const [results, totalCountResult, indexedCountResult] = await Promise.all([
    buildSimilarityQuery(db, vecStr, params),
    db
      .select({ count: sql<number>`count(*)` })
      .from(videoEmbeddings)
      .where(
        sql`(1 - (${videoEmbeddings.embedding} <=> ${vecStr}::vector)) > ${SIMILARITY_THRESHOLD}`,
      ),
    db.select({ count: sql<number>`count(*)` }).from(videoEmbeddings),
  ]);

  return {
    results: results.map((row) => ({
      ...row,
      description: row.description ?? undefined,
      tags: row.tags ?? undefined,
      genre: row.genre ?? undefined,
      similarity: Number(row.similarity),
    })),
    totalCount: extractCount(totalCountResult),
    indexedCount: extractCount(indexedCountResult),
  };
};

const buildSemanticResponse = async (
  params: { query: string; page: number; limit: number },
  cacheKey: string,
): Promise<NextResponse> => {
  const response = await executeSemanticSearch(params);
  if (response === null) {
    return NextResponse.json(
      { error: "API利用制限に達しました。明日再度お試しください。" },
      { status: HTTP_SERVICE_UNAVAILABLE },
    );
  }
  return storeSemanticCache(cacheKey, response);
};

const processSemanticRequest = (
  searchParams: URLSearchParams,
): NextResponse | Promise<NextResponse> => {
  const params = parseParams(searchParams);
  if (params === null) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: HTTP_BAD_REQUEST },
    );
  }

  const cacheKey = searchParams.toString();
  const cachedResponse = getCachedSemanticResponse(cacheKey);
  if (cachedResponse !== undefined) {
    return cachedResponse;
  }

  return buildSemanticResponse(params, cacheKey);
};

export const GET = async (request: NextRequest) => {
  try {
    return await processSemanticRequest(request.nextUrl.searchParams);
  } catch {
    return NextResponse.json(
      { error: "セマンティック検索に失敗しました" },
      { status: HTTP_INTERNAL_ERROR },
    );
  }
};
