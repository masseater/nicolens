"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useSemanticSearchQuery } from "@/features/semantic-search";
import { useViewMode } from "@/shared/hooks";
import { parseSemanticParams } from "@/shared/lib";
import type { SemanticSearchResult, SemanticSearchState, ViewMode } from "@/shared/types";

const DEFAULT_PAGE = 1;
const INITIAL_TOTAL_COUNT = 0;
const INITIAL_INDEXED_COUNT = 0;

const buildSemanticUrl = (state: SemanticSearchState): string => {
  const params = new URLSearchParams({
    q: state.query, // oxlint-disable-line id-length -- URL search parameter name

    page: String(state.page),
    limit: String(state.limit),
  });
  return `/search/semantic?${params.toString()}`;
};

interface SemanticSearchData {
  state: SemanticSearchState;
  results: SemanticSearchResult[];
  totalCount: number;
  indexedCount: number;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  buildPageHref: (page: number) => string;
  handlePageChange: (page: number) => void;
  handleViewModeChange: (mode: ViewMode) => void;
  handleLimitChange: (limit: number) => void;
}

const getErrorMessage = (thrown: unknown): string => {
  if (thrown instanceof Error) {
    return thrown.message;
  }
  return "セマンティック検索中にエラーが発生しました";
};

const EMPTY_PARAMS = new URLSearchParams();

const useSemanticNavigation = (state: SemanticSearchState) => {
  const router = useRouter();

  const buildPageHref = useCallback(
    (page: number) => buildSemanticUrl({ ...state, page }),
    [state],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      router.push(buildSemanticUrl({ ...state, page }));
    },
    [router, state],
  );

  const handleLimitChange = useCallback(
    (limit: number) => {
      router.push(buildSemanticUrl({ ...state, limit, page: DEFAULT_PAGE }));
    },
    [router, state],
  );

  return { buildPageHref, handlePageChange, handleLimitChange };
};

export const useSemanticSearch = (): SemanticSearchData => {
  const searchParams = useSearchParams();
  const params = searchParams ?? EMPTY_PARAMS;
  const state = useMemo(() => parseSemanticParams(params), [params]);
  const hasQuery = state.query.trim() !== "";

  const { data, isLoading, isPlaceholderData, error } = useSemanticSearchQuery(state, hasQuery);
  const loading = isLoading || isPlaceholderData;
  const viewMode = useViewMode((store) => store.viewMode);
  const handleViewModeChange = useViewMode((store) => store.setViewMode);
  const { buildPageHref, handlePageChange, handleLimitChange } = useSemanticNavigation(state);

  return {
    state,
    results: data?.results ?? [],
    totalCount: data?.totalCount ?? INITIAL_TOTAL_COUNT,
    indexedCount: data?.indexedCount ?? INITIAL_INDEXED_COUNT,
    loading,
    error: error === null ? null : getErrorMessage(error),
    viewMode,
    buildPageHref,
    handlePageChange,
    handleViewModeChange,
    handleLimitChange,
  };
};
