import type { SearchFilters, SearchState, SortField, SortOrder } from "@/shared/types";

import { KEYWORD_SEARCH_TARGETS, parseQueryInput } from "./query-parser";

export { formatQueryDisplay } from "./query-parser";
export { parseQueryInput };
export type { ParsedQueryInput } from "./query-parser";

const SORT_FIELDS: SortField[] = [
  "viewCounter",
  "mylistCounter",
  "likeCounter",
  "lengthSeconds",
  "startTime",
  "commentCounter",
  "lastCommentTime",
];

const MIN_PAGE = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

/** Calculate the appropriate page number when limit changes, preserving the user's scroll position */
export const calcPageOnLimitChange = (
  oldPage: number,
  oldLimit: number,
  newLimit: number,
): number =>
  Math.max(MIN_PAGE, Math.floor(((oldPage - MIN_PAGE) * oldLimit) / newLimit) + MIN_PAGE);

const DEFAULT_SEARCH_STATE: SearchState = {
  query: "",
  targets: KEYWORD_SEARCH_TARGETS,
  sortField: "viewCounter",
  sortOrder: "-",
  filters: {},
  tags: [],
  page: MIN_PAGE,
  limit: DEFAULT_LIMIT,
};

const isSortField = (value: string): value is SortField =>
  (SORT_FIELDS as string[]).includes(value);

// Parse a numeric parameter from URLSearchParams
const getNumParam = (params: URLSearchParams, key: string): number | undefined => {
  const value = params.get(key);
  if (value !== null && value !== "") {
    return Number(value);
  }
  return undefined;
};

// Parse counter-related filters from URLSearchParams
const parseCounterFilters = (params: URLSearchParams): Partial<SearchFilters> => ({
  viewCounterGte: getNumParam(params, "vcGte"),
  viewCounterLte: getNumParam(params, "vcLte"),
  commentCounterGte: getNumParam(params, "ccGte"),
  commentCounterLte: getNumParam(params, "ccLte"),
  mylistCounterGte: getNumParam(params, "mlGte"),
  mylistCounterLte: getNumParam(params, "mlLte"),
  likeCounterGte: getNumParam(params, "lkGte"),
  likeCounterLte: getNumParam(params, "lkLte"),
});

// Parse time and metadata filters from URLSearchParams
const parseMetaFilters = (params: URLSearchParams): Partial<SearchFilters> => ({
  startTimeGte: params.get("stGte") ?? undefined,
  startTimeLte: params.get("stLte") ?? undefined,
  lengthSecondsGte: getNumParam(params, "lsGte"),
  lengthSecondsLte: getNumParam(params, "lsLte"),
  genre: params.get("genre") ?? undefined,
});

// Parse all filter parameters from URLSearchParams
const parseFilters = (params: URLSearchParams): SearchFilters => ({
  ...parseCounterFilters(params),
  ...parseMetaFilters(params),
});

const isSortOrder = (value: string): value is SortOrder => value === "+" || value === "-";

// Parse sort and pagination fields from URLSearchParams
const parseSortAndPage = (params: URLSearchParams) => {
  const rawSort = params.get("sort") ?? "";
  const rawOrder = params.get("order") ?? "";
  const sortField: SortField = isSortField(rawSort) ? rawSort : DEFAULT_SEARCH_STATE.sortField;
  const sortOrder: SortOrder = isSortOrder(rawOrder) ? rawOrder : DEFAULT_SEARCH_STATE.sortOrder;
  const page = Math.max(MIN_PAGE, Number(params.get("page")) || MIN_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(MIN_PAGE, Number(params.get("limit")) || DEFAULT_SEARCH_STATE.limit),
  );
  return { sortField, sortOrder, page, limit };
};

// Determine query, targets, and tags from URL params.
// If explicit `targets` or `tag` params are present, use them directly.
// Otherwise, parse prefix syntax (title:, body:, #tag) from the `q` value.
const parseQueryAndTargets = (
  params: URLSearchParams,
): { query: string; targets: string; tags: string[] } => {
  const rawQuery = params.get("q") ?? "";
  const hasExplicitTargets = params.has("targets");
  const hasExplicitTags = params.has("tag");

  if (hasExplicitTargets || hasExplicitTags) {
    return {
      query: rawQuery,
      targets: params.get("targets") ?? DEFAULT_SEARCH_STATE.targets,
      tags: params.getAll("tag"),
    };
  }

  const parsed = parseQueryInput(rawQuery);
  return { query: parsed.query, targets: parsed.targets, tags: parsed.tags };
};

// Parse URL search params into a SearchState object
export const parseSearchParams = (params: URLSearchParams): SearchState => {
  const { query, targets, tags } = parseQueryAndTargets(params);
  const { sortField, sortOrder, page, limit } = parseSortAndPage(params);
  const filters = parseFilters(params);

  return { query, targets, sortField, sortOrder, filters, tags, page, limit };
};

// Set query, target, and tag params on URLSearchParams
const setQueryParams = (params: URLSearchParams, state: SearchState): void => {
  if (state.query !== "") {
    params.set("q", state.query);
  }
  if (state.targets !== DEFAULT_SEARCH_STATE.targets) {
    params.set("targets", state.targets);
  }
  for (const tag of state.tags) {
    params.append("tag", tag);
  }
};

// Set sort and pagination params on URLSearchParams
const setSortAndPageParams = (params: URLSearchParams, state: SearchState): void => {
  if (state.sortField !== DEFAULT_SEARCH_STATE.sortField) {
    params.set("sort", state.sortField);
  }
  if (state.sortOrder !== DEFAULT_SEARCH_STATE.sortOrder) {
    params.set("order", state.sortOrder);
  }
  if (state.page > MIN_PAGE) {
    params.set("page", String(state.page));
  }
  if (state.limit !== DEFAULT_SEARCH_STATE.limit) {
    params.set("limit", String(state.limit));
  }
};

// Set base search parameters on URLSearchParams
const setBaseParams = (params: URLSearchParams, state: SearchState): void => {
  setQueryParams(params, state);
  setSortAndPageParams(params, state);
};

// Set a numeric filter param if defined
const setNumFilterParam = (
  params: URLSearchParams,
  key: string,
  value: number | undefined,
): void => {
  if (value !== undefined) {
    params.set(key, String(value));
  }
};

// Set a string filter param if defined and non-empty
const setStrFilterParam = (
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void => {
  if (value !== undefined && value !== "") {
    params.set(key, value);
  }
};

// Set counter filter parameters on URLSearchParams
const setCounterFilterParams = (params: URLSearchParams, filters: SearchFilters): void => {
  setNumFilterParam(params, "vcGte", filters.viewCounterGte);
  setNumFilterParam(params, "vcLte", filters.viewCounterLte);
  setNumFilterParam(params, "ccGte", filters.commentCounterGte);
  setNumFilterParam(params, "ccLte", filters.commentCounterLte);
  setNumFilterParam(params, "mlGte", filters.mylistCounterGte);
  setNumFilterParam(params, "mlLte", filters.mylistCounterLte);
  setNumFilterParam(params, "lkGte", filters.likeCounterGte);
  setNumFilterParam(params, "lkLte", filters.likeCounterLte);
};

// Set time and metadata filter parameters on URLSearchParams
const setMetaFilterParams = (params: URLSearchParams, filters: SearchFilters): void => {
  setStrFilterParam(params, "stGte", filters.startTimeGte);
  setStrFilterParam(params, "stLte", filters.startTimeLte);
  setNumFilterParam(params, "lsGte", filters.lengthSecondsGte);
  setNumFilterParam(params, "lsLte", filters.lengthSecondsLte);
  setStrFilterParam(params, "genre", filters.genre);
};

// Set all filter parameters on URLSearchParams
const setFilterParams = (params: URLSearchParams, filters: SearchFilters): void => {
  setCounterFilterParams(params, filters);
  setMetaFilterParams(params, filters);
};

// Build URLSearchParams from a SearchState object
export const buildSearchParams = (state: SearchState): URLSearchParams => {
  const params = new URLSearchParams();
  setBaseParams(params, state);
  setFilterParams(params, state.filters);
  return params;
};
