"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useThumbnailPreload } from "@/entities/video";
import { searchTaglessVideos, usePrefetchTaglessPages } from "@/shared/api";
import { useViewMode } from "@/shared/hooks";
import {
  JST_OFFSET_HOURS,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  calcPageOnLimitChange,
} from "@/shared/lib";
import type {
  SearchFilters,
  SortField,
  SortOrder,
  SnapshotSearchResponse,
  TaglessSearchState,
  VideoContent,
  ViewMode,
} from "@/shared/types";

const FIRST_PAGE = 1;
const DEFAULT_LIMIT = 50;
const INITIAL_TOTAL_COUNT = 0;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;

const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

const taglessKeys = {
  all: ["tagless"] as const,
  query: (state: TaglessSearchState) => [...taglessKeys.all, state] as const,
};

const getCurrentMonth = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}`;
};

const parseOptionalNumber = (raw: string | null): number | undefined => {
  if (raw === null) {
    return undefined;
  }
  return Number(raw);
};

const parseFilters = (params: URLSearchParams): SearchFilters => ({
  viewCounterGte: parseOptionalNumber(params.get("vcGte")),
  viewCounterLte: parseOptionalNumber(params.get("vcLte")),
  commentCounterGte: parseOptionalNumber(params.get("ccGte")),
  commentCounterLte: parseOptionalNumber(params.get("ccLte")),
  mylistCounterGte: parseOptionalNumber(params.get("mlGte")),
  mylistCounterLte: parseOptionalNumber(params.get("mlLte")),
  likeCounterGte: parseOptionalNumber(params.get("lkGte")),
  likeCounterLte: parseOptionalNumber(params.get("lkLte")),
  lengthSecondsGte: parseOptionalNumber(params.get("lsGte")),
  lengthSecondsLte: parseOptionalNumber(params.get("lsLte")),
  startTimeGte: params.get("stGte") ?? undefined,
  startTimeLte: params.get("stLte") ?? undefined,
  genre: params.get("genre") ?? undefined,
});

const parseState = (params: URLSearchParams): TaglessSearchState => ({
  query: params.get("q") ?? "",
  month: params.get("month") ?? getCurrentMonth(),
  sortField: (params.get("sort") as SortField | null) ?? "viewCounter", // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  sortOrder: (params.get("order") as SortOrder | null) ?? "-", // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  page: Number(params.get("page") ?? String(FIRST_PAGE)),
  limit: Number(params.get("limit") ?? String(DEFAULT_LIMIT)),
  filters: parseFilters(params),
});

const setIfDefined = (
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void => {
  if (value !== undefined && value !== "") {
    params.set(key, String(value));
  }
};

const FILTER_PARAM_MAP: readonly (readonly [string, keyof SearchFilters])[] = [
  ["vcGte", "viewCounterGte"],
  ["vcLte", "viewCounterLte"],
  ["ccGte", "commentCounterGte"],
  ["ccLte", "commentCounterLte"],
  ["mlGte", "mylistCounterGte"],
  ["mlLte", "mylistCounterLte"],
  ["lkGte", "likeCounterGte"],
  ["lkLte", "likeCounterLte"],
  ["lsGte", "lengthSecondsGte"],
  ["lsLte", "lengthSecondsLte"],
  ["stGte", "startTimeGte"],
  ["stLte", "startTimeLte"],
  ["genre", "genre"],
];

const appendFilterParams = (params: URLSearchParams, filters: SearchFilters): void => {
  for (const [paramKey, filterKey] of FILTER_PARAM_MAP) {
    setIfDefined(params, paramKey, filters[filterKey]);
  }
};

const appendNonDefaultParams = (params: URLSearchParams, state: TaglessSearchState): void => {
  if (state.query !== "") {
    params.set("q", state.query);
  }
  if (state.sortField !== "viewCounter") {
    params.set("sort", state.sortField);
  }
  if (state.sortOrder !== "-") {
    params.set("order", state.sortOrder);
  }
  if (state.page !== FIRST_PAGE) {
    params.set("page", String(state.page));
  }
  if (state.limit !== DEFAULT_LIMIT) {
    params.set("limit", String(state.limit));
  }
};

const buildTaglessParams = (state: TaglessSearchState): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("month", state.month);
  appendNonDefaultParams(params, state);
  appendFilterParams(params, state.filters);
  return params;
};

const getErrorMessage = (thrown: unknown): string => {
  if (thrown instanceof Error) {
    return thrown.message;
  }
  return "タグなし動画の取得中にエラーが発生しました";
};

const EMPTY_PARAMS = new URLSearchParams();

export interface TaglessSearchResult {
  state: TaglessSearchState;
  results: VideoContent[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  buildPageHref: (page: number) => string;
  handleQueryChange: (query: string) => void;
  handleMonthChange: (month: string) => void;
  handleFiltersChange: (filters: SearchFilters) => void;
  handleSortChange: (field: SortField, order: SortOrder) => void;
  handlePageChange: (page: number) => void;
  handleLimitChange: (limit: number) => void;
  handleViewModeChange: (mode: ViewMode) => void;
  handleRetry: () => void;
}

const useTaglessQuery = (state: TaglessSearchState) =>
  useQuery<SnapshotSearchResponse>({
    queryKey: taglessKeys.query(state),
    queryFn: () => searchTaglessVideos(state),
    placeholderData: keepPreviousData,
  });

const useTaglessNavigate = () => {
  const router = useRouter();
  return useCallback(
    (newState: TaglessSearchState) => {
      const urlParams = buildTaglessParams(newState);
      router.push(`/search/tagless?${urlParams.toString()}`);
    },
    [router],
  );
};

const useSearchHandlers = (
  state: TaglessSearchState,
  navigate: (st: TaglessSearchState) => void,
) => {
  const handleQueryChange = useCallback(
    (query: string) => {
      navigate({ ...state, query, page: FIRST_PAGE });
    },
    [state, navigate],
  );

  const handleMonthChange = useCallback(
    (month: string) => {
      navigate({ ...state, month, page: FIRST_PAGE });
    },
    [state, navigate],
  );

  const handleFiltersChange = useCallback(
    (filters: SearchFilters) => {
      navigate({ ...state, filters, page: FIRST_PAGE });
    },
    [state, navigate],
  );

  const handleSortChange = useCallback(
    (field: SortField, order: SortOrder) => {
      navigate({ ...state, sortField: field, sortOrder: order, page: FIRST_PAGE });
    },
    [state, navigate],
  );

  return { handleQueryChange, handleMonthChange, handleFiltersChange, handleSortChange };
};

const usePaginationHandlers = (
  state: TaglessSearchState,
  navigate: (st: TaglessSearchState) => void,
) => {
  const buildPageHref = useCallback(
    (page: number): string => {
      const urlParams = buildTaglessParams({ ...state, page });
      return `/search/tagless?${urlParams.toString()}`;
    },
    [state],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({ ...state, page });
      document.querySelector("[data-slot=results]")?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [state, navigate],
  );

  const handleLimitChange = useCallback(
    (limit: number) => {
      navigate({ ...state, limit, page: calcPageOnLimitChange(state.page, state.limit, limit) });
    },
    [state, navigate],
  );

  return { buildPageHref, handlePageChange, handleLimitChange };
};

const useTaglessData = (state: TaglessSearchState) => {
  const { data, isLoading, error, refetch } = useTaglessQuery(state);
  const results = data?.data ?? [];
  const totalCount = data?.meta.totalCount ?? INITIAL_TOTAL_COUNT;

  useThumbnailPreload(results);
  usePrefetchTaglessPages(state, totalCount);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return { results, totalCount, isLoading, error, handleRetry };
};

export const useTaglessSearch = (): TaglessSearchResult => {
  const searchParams = useSearchParams();
  const params = searchParams ?? EMPTY_PARAMS;
  const state = useMemo(() => parseState(params), [params]);

  const { results, totalCount, isLoading, error, handleRetry } = useTaglessData(state);
  const viewMode = useViewMode((store) => store.viewMode);
  const handleViewModeChange = useViewMode((store) => store.setViewMode);
  const navigate = useTaglessNavigate();
  const searchHandlers = useSearchHandlers(state, navigate);
  const paginationHandlers = usePaginationHandlers(state, navigate);

  return {
    state,
    results,
    totalCount,
    loading: isLoading,
    error: error === null ? null : getErrorMessage(error),
    viewMode,
    handleViewModeChange,
    handleRetry,
    ...searchHandlers,
    ...paginationHandlers,
  };
};
