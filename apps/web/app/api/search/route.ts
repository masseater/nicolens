import { type NextRequest, NextResponse } from "next/server";

import { getSecondsUntilNextSnapshot, isCacheStillValid } from "@/shared/lib";
import type { SnapshotErrorResponse, SnapshotSearchResponse } from "@/shared/types";

import {
  WINDOW_SIZE,
  buildWindowedParams,
  computeSearchSignature,
  extractSortInfo,
  getBoundaryChain,
} from "./deep-pagination";

const SNAPSHOT_API = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";

type ApiResponse = SnapshotSearchResponse | SnapshotErrorResponse;

interface CacheEntry {
  data: ApiResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const RATE_LIMIT_MS = 1000;
const MAX_CACHE_SIZE = 500;
const HTTP_INTERNAL_ERROR = 500;
const SWR_MULTIPLIER = 2;

const buildCacheHeaders = () => {
  const maxAge = getSecondsUntilNextSnapshot();
  const swr = maxAge * SWR_MULTIPLIER;
  return {
    "Cache-Control": `public, max-age=${String(maxAge)}, s-maxage=${String(maxAge)}, stale-while-revalidate=${String(swr)}`,
  };
};

let lastRequestTime = 0;

const isApiResponse = (value: unknown): value is ApiResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "meta" in value || "data" in value;
};

const cleanExpiredCache = () => {
  for (const [cacheEntryKey, entry] of cache) {
    if (!isCacheStillValid(entry.timestamp)) {
      cache.delete(cacheEntryKey);
    }
  }
};

// Rate limiting: wait if needed before making upstream request
const waitForRateLimit = async () => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    // eslint-disable-next-line promise/avoid-new
    await new Promise<void>((resolve) => {
      setTimeout(resolve, RATE_LIMIT_MS - elapsed);
    });
  }
};

// Build upstream URL from search params
const buildUpstreamUrl = (searchParams: URLSearchParams): string => {
  const upstreamParams = new URLSearchParams();
  for (const [paramKey, paramValue] of searchParams.entries()) {
    upstreamParams.append(paramKey, paramValue);
  }
  if (!upstreamParams.has("_context")) {
    upstreamParams.set("_context", "nicolens");
  }
  return `${SNAPSHOT_API}?${upstreamParams.toString()}`;
};

// Fetch data from upstream API and parse response
const fetchUpstream = async (
  upstreamUrl: string,
): Promise<{ data: ApiResponse; status: number; ok: boolean }> => {
  lastRequestTime = Date.now();
  const response = await fetch(upstreamUrl, {
    headers: {
      "User-Agent": "nicolens/1.0",
    },
    next: { revalidate: getSecondsUntilNextSnapshot() },
  });

  const rawJson: unknown = await response.json();
  if (!isApiResponse(rawJson)) {
    throw new Error("Invalid API response format");
  }

  return { data: rawJson, status: response.status, ok: response.ok };
};

// Check cache and return cached response if valid
const getCachedResponse = (cacheKey: string): NextResponse | undefined => {
  const cached = cache.get(cacheKey);
  if (cached !== undefined && isCacheStillValid(cached.timestamp)) {
    return NextResponse.json(cached.data, { headers: buildCacheHeaders() });
  }
  return undefined;
};

// Store response in cache and clean up if needed
const storeAndRespond = (cacheKey: string, data: ApiResponse): NextResponse => {
  cache.set(cacheKey, { data, timestamp: Date.now() });
  if (cache.size > MAX_CACHE_SIZE) {
    cleanExpiredCache();
  }
  return NextResponse.json(data, { headers: buildCacheHeaders() });
};

// Create error response for proxy failures
const createProxyErrorResponse = (): NextResponse =>
  NextResponse.json(
    {
      meta: {
        status: HTTP_INTERNAL_ERROR,
        errorCode: "PROXY_ERROR",
        errorMessage: "APIへの接続に失敗しました",
      },
    },
    { status: HTTP_INTERNAL_ERROR },
  );

// Replace totalCount with original (unfiltered) count for windowed responses
const adjustTotalCount = (
  data: SnapshotSearchResponse,
  originalTotalCount: number,
): SnapshotSearchResponse => ({
  ...data,
  meta: { ...data.meta, totalCount: originalTotalCount },
});

// Fetch wrapper for boundary discovery (includes rate limiting)
const boundaryFetchFn = async (params: URLSearchParams) => {
  await waitForRateLimit();
  const result = await fetchUpstream(buildUpstreamUrl(params));
  return { data: result.data, ok: result.ok };
};

const MIN_OFFSET = 0;

// Resolve windowed request params for deep pagination
const resolveWindowedParams = async (searchParams: URLSearchParams) => {
  const sortInfo = extractSortInfo(searchParams);
  if (sortInfo === undefined) {
    return null;
  }

  const offset = Number(searchParams.get("_offset") ?? "0");
  const targetWindow = Math.floor(offset / WINDOW_SIZE);
  const signature = computeSearchSignature(searchParams);

  const { boundaryValue, originalTotalCount } = await getBoundaryChain({
    baseParams: searchParams,
    sortInfo,
    targetWindow,
    signature,
    fetchFn: boundaryFetchFn,
  });

  const windowedParams = buildWindowedParams({
    searchParams,
    sortInfo,
    boundaryValue,
    offset,
  });

  return {
    windowedParams,
    originalTotalCount,
    sortInfo,
    boundaryValue,
    offset,
    baseParams: searchParams,
  };
};

// Retry windowed request with corrected offset when boundary filter drift causes empty results
const retryWithCorrectedOffset = async (
  resolved: NonNullable<Awaited<ReturnType<typeof resolveWindowedParams>>>,
  filteredTotalCount: number,
  cacheKey: string,
): Promise<NextResponse> => {
  const correctedOffset = Math.max(
    MIN_OFFSET,
    resolved.offset - resolved.originalTotalCount + filteredTotalCount,
  );
  const retryParams = buildWindowedParams({
    searchParams: resolved.baseParams,
    sortInfo: resolved.sortInfo,
    boundaryValue: resolved.boundaryValue,
    offset: correctedOffset,
  });

  await waitForRateLimit();
  const retry = await fetchUpstream(buildUpstreamUrl(retryParams));
  if (!retry.ok) {
    return NextResponse.json(retry.data, { status: retry.status });
  }
  if ("data" in retry.data) {
    return storeAndRespond(cacheKey, adjustTotalCount(retry.data, resolved.originalTotalCount));
  }
  return storeAndRespond(cacheKey, retry.data);
};

const EMPTY_DATA_LENGTH = 0;

// Process windowed data and build the final response
const processWindowedData = (
  data: SnapshotSearchResponse,
  resolved: NonNullable<Awaited<ReturnType<typeof resolveWindowedParams>>>,
  cacheKey: string,
): NextResponse | Promise<NextResponse> => {
  const filteredTotalCount = data.meta.totalCount;

  // If data is empty but filtered set has items, the offset exceeds the filtered set.
  // Due to boundary filter drift, retry with a corrected offset.
  if (data.data.length === EMPTY_DATA_LENGTH && filteredTotalCount > MIN_OFFSET) {
    return retryWithCorrectedOffset(resolved, filteredTotalCount, cacheKey);
  }

  return storeAndRespond(cacheKey, adjustTotalCount(data, resolved.originalTotalCount));
};

// Fetch windowed response for deep pagination (offset >= WINDOW_SIZE)
const fetchWindowedResponse = async (
  searchParams: URLSearchParams,
  cacheKey: string,
): Promise<NextResponse> => {
  const resolved = await resolveWindowedParams(searchParams);
  if (resolved === null) {
    return createProxyErrorResponse();
  }

  await waitForRateLimit();
  const { data, status, ok } = await fetchUpstream(buildUpstreamUrl(resolved.windowedParams));

  if (!ok) {
    return NextResponse.json(data, { status });
  }

  if (!("data" in data)) {
    return storeAndRespond(cacheKey, data);
  }

  return processWindowedData(data, resolved, cacheKey);
};

// Fetch from upstream, cache the result, and return a response
const fetchAndCacheResponse = async (
  searchParams: URLSearchParams,
  cacheKey: string,
): Promise<NextResponse> => {
  await waitForRateLimit();
  const { data, status, ok } = await fetchUpstream(buildUpstreamUrl(searchParams));
  if (!ok) {
    return NextResponse.json(data, { status });
  }
  return storeAndRespond(cacheKey, data);
};

// Route search request to normal or windowed handler based on offset
const handleSearchRequest = (
  searchParams: URLSearchParams,
  cacheKey: string,
): Promise<NextResponse> => {
  const offset = Number(searchParams.get("_offset") ?? "0");
  if (offset >= WINDOW_SIZE) {
    return fetchWindowedResponse(searchParams, cacheKey);
  }
  return fetchAndCacheResponse(searchParams, cacheKey);
};

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const cacheKey = searchParams.toString();
  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse !== undefined) {
    return cachedResponse;
  }

  try {
    return await handleSearchRequest(searchParams, cacheKey);
  } catch {
    return createProxyErrorResponse();
  }
};
