import { MS_PER_SECOND, SECONDS_PER_MINUTE, isCacheStillValid } from "@/shared/lib";
import type { SnapshotErrorResponse, SnapshotSearchResponse, VideoContent } from "@/shared/types";

export const WINDOW_SIZE = 100_000;

const BOUNDARY_OFFSET = 99_999;
const BOUNDARY_CACHE_MINUTES = 30;
const BOUNDARY_CACHE_TTL_MS = BOUNDARY_CACHE_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
const MAX_BOUNDARY_CACHE_SIZE = 500;
const FIRST_WINDOW = 0;
const SORT_PREFIX_LENGTH = 1;

const SORTABLE_FIELDS: ReadonlySet<string> = new Set([
  "viewCounter",
  "mylistCounter",
  "likeCounter",
  "lengthSeconds",
  "startTime",
  "commentCounter",
  "lastCommentTime",
]);

interface SortInfo {
  field: string;
  descending: boolean;
}

interface BoundaryEntry {
  value: number | string;
  originalTotalCount: number;
  timestamp: number;
}

interface UpstreamFetchResult {
  data: SnapshotSearchResponse | SnapshotErrorResponse;
  ok: boolean;
}

interface BoundaryDiscoveryContext {
  baseParams: URLSearchParams;
  sortInfo: SortInfo;
  signature: string;
  fetchFn: (params: URLSearchParams) => Promise<UpstreamFetchResult>;
}

interface WindowIterationState {
  prevBoundaryValue: number | string | undefined;
  originalTotalCount: number;
}

interface BoundaryChainOptions {
  baseParams: URLSearchParams;
  sortInfo: SortInfo;
  targetWindow: number;
  signature: string;
  fetchFn: (params: URLSearchParams) => Promise<UpstreamFetchResult>;
}

interface BoundaryChainResult {
  boundaryValue: number | string;
  originalTotalCount: number;
}

interface WindowedParamsOptions {
  searchParams: URLSearchParams;
  sortInfo: SortInfo;
  boundaryValue: number | string;
  offset: number;
}

const boundaryCache = new Map<string, BoundaryEntry>();

// Extract sort info from _sort parameter (e.g., "-viewCounter" → descending viewCounter)
export const extractSortInfo = (params: URLSearchParams): SortInfo | undefined => {
  const sort = params.get("_sort");
  if (sort === null || sort === "") {
    return undefined;
  }
  const descending = !sort.startsWith("+");
  const field =
    sort.startsWith("+") || sort.startsWith("-") ? sort.slice(SORT_PREFIX_LENGTH) : sort;
  if (!SORTABLE_FIELDS.has(field)) {
    return undefined;
  }
  return { field, descending };
};

// Compute cache key excluding offset/limit (same search regardless of page)
export const computeSearchSignature = (params: URLSearchParams): string => {
  const parts: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== "_offset" && key !== "_limit") {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.toSorted().join("&");
};

// Build windowed request params with boundary filter and adjusted offset
export const buildWindowedParams = ({
  searchParams,
  sortInfo,
  boundaryValue,
  offset,
}: WindowedParamsOptions): URLSearchParams => {
  const params = new URLSearchParams(searchParams);
  params.set("_offset", String(offset % WINDOW_SIZE));
  const operator = sortInfo.descending ? "lt" : "gt";
  params.append(`filters[${sortInfo.field}][${operator}]`, String(boundaryValue));
  return params;
};

const cleanExpiredBoundaryCache = () => {
  const now = Date.now();
  for (const [key, entry] of boundaryCache) {
    if (!isCacheStillValid(entry.timestamp) || now - entry.timestamp > BOUNDARY_CACHE_TTL_MS) {
      boundaryCache.delete(key);
    }
  }
};

const getSortFieldValue = (item: VideoContent, field: string): number | string | undefined => {
  const values: Record<string, number | string | undefined> = {
    viewCounter: item.viewCounter,
    mylistCounter: item.mylistCounter,
    likeCounter: item.likeCounter,
    lengthSeconds: item.lengthSeconds,
    startTime: item.startTime,
    commentCounter: item.commentCounter,
    lastCommentTime: item.lastCommentTime,
  };
  return values[field];
};

const buildBoundaryParams = (
  baseParams: URLSearchParams,
  sortInfo: SortInfo,
  prevBoundaryValue: number | string | undefined,
): URLSearchParams => {
  const params = new URLSearchParams(baseParams);
  params.set("_offset", String(BOUNDARY_OFFSET));
  params.set("_limit", "1");
  if (prevBoundaryValue !== undefined) {
    const operator = sortInfo.descending ? "lt" : "gt";
    params.append(`filters[${sortInfo.field}][${operator}]`, String(prevBoundaryValue));
  }
  return params;
};

// Validate upstream response is a successful search response
const validateUpstreamSuccess = (result: UpstreamFetchResult): SnapshotSearchResponse => {
  if (!result.ok) {
    throw new Error("Boundary discovery request failed");
  }
  if (!("data" in result.data)) {
    throw new Error("Boundary response missing data");
  }
  return result.data;
};

// Extract boundary value and totalCount from a validated response
const extractBoundaryFromResponse = (
  result: UpstreamFetchResult,
  sortInfo: SortInfo,
): { value: number | string; totalCount: number } => {
  const response = validateUpstreamSuccess(result);
  const [item] = response.data;
  if (item === undefined) {
    throw new Error("No boundary item found");
  }
  const value = getSortFieldValue(item, sortInfo.field);
  if (value === undefined) {
    throw new Error("Boundary item sort field is null");
  }
  return { value, totalCount: response.meta.totalCount };
};

// Fetch boundary for a single window
const fetchBoundaryForWindow = async (
  context: BoundaryDiscoveryContext,
  prevBoundaryValue: number | string | undefined,
): Promise<{ value: number | string; totalCount: number }> => {
  const params = buildBoundaryParams(context.baseParams, context.sortInfo, prevBoundaryValue);
  const result = await context.fetchFn(params);
  return extractBoundaryFromResponse(result, context.sortInfo);
};

// Check boundary cache for a valid entry
const tryGetCachedBoundary = (cacheKey: string): BoundaryEntry | undefined => {
  const cached = boundaryCache.get(cacheKey);
  if (
    cached === undefined ||
    !isCacheStillValid(cached.timestamp) ||
    Date.now() - cached.timestamp >= BOUNDARY_CACHE_TTL_MS
  ) {
    return undefined;
  }
  return cached;
};

// Save boundary result to cache with cleanup
const saveBoundaryToCache = (
  cacheKey: string,
  value: number | string,
  originalTotalCount: number,
) => {
  boundaryCache.set(cacheKey, { value, originalTotalCount, timestamp: Date.now() });
  if (boundaryCache.size > MAX_BOUNDARY_CACHE_SIZE) {
    cleanExpiredBoundaryCache();
  }
};

// Process one window in the boundary chain
const processOneWindow = async (
  context: BoundaryDiscoveryContext,
  windowIdx: number,
  state: WindowIterationState,
): Promise<WindowIterationState> => {
  const cacheKey = `${context.signature}::window=${String(windowIdx)}`;
  const cached = tryGetCachedBoundary(cacheKey);

  if (cached !== undefined) {
    return {
      prevBoundaryValue: cached.value,
      originalTotalCount:
        windowIdx === FIRST_WINDOW ? cached.originalTotalCount : state.originalTotalCount,
    };
  }

  const boundary = await fetchBoundaryForWindow(context, state.prevBoundaryValue);
  const totalCount = windowIdx === FIRST_WINDOW ? boundary.totalCount : state.originalTotalCount;
  saveBoundaryToCache(cacheKey, boundary.value, totalCount);
  return { prevBoundaryValue: boundary.value, originalTotalCount: totalCount };
};

// Get boundary chain from window 0 to targetWindow-1, using cache where possible
export const getBoundaryChain = async ({
  baseParams,
  sortInfo,
  targetWindow,
  signature,
  fetchFn,
}: BoundaryChainOptions): Promise<BoundaryChainResult> => {
  const context: BoundaryDiscoveryContext = { baseParams, sortInfo, signature, fetchFn };
  let state: WindowIterationState = { prevBoundaryValue: undefined, originalTotalCount: 0 };

  for (let windowIdx = 0; windowIdx < targetWindow; windowIdx++) {
    // Each window boundary depends on the previous one — sequential execution required
    state = await processOneWindow(context, windowIdx, state); // eslint-disable-line no-await-in-loop
  }

  if (state.prevBoundaryValue === undefined) {
    throw new Error("Failed to establish boundary chain");
  }

  return { boundaryValue: state.prevBoundaryValue, originalTotalCount: state.originalTotalCount };
};
