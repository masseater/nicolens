import type { SearchFilters, SearchState, SnapshotSearchResponse } from "@/shared/types";

import { getApiBaseUrl } from "./base-url";

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVICE_UNAVAILABLE = 503;
const PAGE_OFFSET_BASE = 1;

interface RangeFilterOptions {
  parts: string[];
  field: string;
  gte?: number | string;
  lte?: number | string;
}

// Add range filter parts for a given field
const addRangeFilter = (options: RangeFilterOptions): void => {
  if (options.gte !== undefined) {
    options.parts.push(`filters[${options.field}][gte]=${encodeURIComponent(String(options.gte))}`);
  }
  if (options.lte !== undefined) {
    options.parts.push(`filters[${options.field}][lte]=${encodeURIComponent(String(options.lte))}`);
  }
};

// Build the API filter query string from SearchFilters
const buildApiFilters = (filters: SearchFilters): string => {
  const parts: string[] = [];

  addRangeFilter({
    parts,
    field: "viewCounter",
    gte: filters.viewCounterGte,
    lte: filters.viewCounterLte,
  });
  addRangeFilter({
    parts,
    field: "startTime",
    gte: filters.startTimeGte,
    lte: filters.startTimeLte,
  });
  addRangeFilter({
    parts,
    field: "lengthSeconds",
    gte: filters.lengthSecondsGte,
    lte: filters.lengthSecondsLte,
  });
  addRangeFilter({
    parts,
    field: "commentCounter",
    gte: filters.commentCounterGte,
    lte: filters.commentCounterLte,
  });
  addRangeFilter({
    parts,
    field: "mylistCounter",
    gte: filters.mylistCounterGte,
    lte: filters.mylistCounterLte,
  });
  addRangeFilter({
    parts,
    field: "likeCounter",
    gte: filters.likeCounterGte,
    lte: filters.likeCounterLte,
  });

  if (filters.genre !== undefined && filters.genre !== "") {
    parts.push(`filters[genre.keyword][0]=${encodeURIComponent(filters.genre)}`);
  }

  return parts.join("&");
};

// Build tagsExact filter query string from tag array
const buildTagFilters = (tags: string[]): string =>
  tags
    .map((tag, index) => `filters[tagsExact][${String(index)}]=${encodeURIComponent(tag)}`)
    .join("&");

const RESPONSE_FIELDS = [
  "contentId",
  "title",
  "description",
  "userId",
  "viewCounter",
  "mylistCounter",
  "likeCounter",
  "lengthSeconds",
  "thumbnailUrl",
  "startTime",
  "lastResBody",
  "commentCounter",
  "lastCommentTime",
  "categoryTags",
  "tags",
  "genre",
].join(",");

// Determine the error message based on response status
const getErrorMessage = (status: number): string => {
  if (status === HTTP_BAD_REQUEST) {
    return "検索条件に誤りがあります。条件を見直してください。";
  }
  if (status === HTTP_SERVICE_UNAVAILABLE) {
    return "サービスはメンテナンス中です。しばらくお待ちください。";
  }
  return "サーバーエラーが発生しました。しばらくしてから再度お試しください。";
};

// Validate and parse the search API response
const parseSearchResponse = async (response: Response): Promise<SnapshotSearchResponse> => {
  const json: unknown = await response.json();
  // Runtime check: ensure json is a non-null object with expected shape
  if (typeof json !== "object" || json === null) {
    throw new Error("Unexpected response format from search API");
  }
  return json as SnapshotSearchResponse; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
};

// Combine base params with filters and tag filters into a full URL
const buildSearchUrl = (params: URLSearchParams, state: SearchState): string => {
  const filterStr = buildApiFilters(state.filters);
  const tagFilterStr = buildTagFilters(state.tags);
  const extraParts = [filterStr, tagFilterStr].filter((part) => part !== "").join("&");
  return `${getApiBaseUrl()}/api/search?${params.toString()}${extraParts === "" ? "" : `&${extraParts}`}`;
};

// Search videos using the Niconico Snapshot API
export const searchVideos = async (state: SearchState): Promise<SnapshotSearchResponse> => {
  const queryParam = "q";
  const params = new URLSearchParams({
    [queryParam]: state.query,
    targets: state.targets,
    fields: RESPONSE_FIELDS,
    _sort: `${state.sortOrder}${state.sortField}`,
    _offset: String((state.page - PAGE_OFFSET_BASE) * state.limit),
    _limit: String(state.limit),
    _context: "nicolens",
  });

  const url = buildSearchUrl(params, state);
  const response = await fetch(url);

  if (!response.ok) {
    const body: { meta?: { errorMessage?: string } } | null = await response
      .json()
      .catch(() => null); // oxlint-disable-line @typescript-eslint/no-unsafe-assignment
    const message = getErrorMessage(response.status);
    throw new Error(body?.meta?.errorMessage ?? message);
  }

  return parseSearchResponse(response);
};
