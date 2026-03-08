"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useThumbnailPreload } from "@/entities/video";
import { searchTaglessVideos, taglessKeys, usePrefetchTaglessPages } from "@/shared/api";
import { useViewMode } from "@/shared/hooks";
import { calcPageOnLimitChange, parseTaglessParams } from "@/shared/lib";
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

const isEffectivelyLoading = (query: ReturnType<typeof useTaglessQuery>): boolean =>
  query.isLoading || query.isPlaceholderData || query.isFetching;

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
  const query = useTaglessQuery(state);
  const results = query.data?.data ?? [];
  const totalCount = query.data?.meta.totalCount ?? INITIAL_TOTAL_COUNT;
  const loading = isEffectivelyLoading(query);

  useThumbnailPreload(results);
  usePrefetchTaglessPages(state, totalCount);

  const { refetch } = query;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return { results, totalCount, loading, error: query.error, handleRetry };
};

export const useTaglessSearch = (): TaglessSearchResult => {
  const searchParams = useSearchParams();
  const params = searchParams ?? EMPTY_PARAMS;
  const state = useMemo(() => parseTaglessParams(params), [params]);

  const { results, totalCount, loading, error, handleRetry } = useTaglessData(state);
  const viewMode = useViewMode((store) => store.viewMode);
  const handleViewModeChange = useViewMode((store) => store.setViewMode);
  const navigate = useTaglessNavigate();
  const searchHandlers = useSearchHandlers(state, navigate);
  const paginationHandlers = usePaginationHandlers(state, navigate);

  return {
    state,
    results,
    totalCount,
    loading,
    error: error === null ? null : getErrorMessage(error),
    viewMode,
    handleViewModeChange,
    handleRetry,
    ...searchHandlers,
    ...paginationHandlers,
  };
};
