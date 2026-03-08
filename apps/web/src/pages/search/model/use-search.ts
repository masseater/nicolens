"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useThumbnailPreload } from "@/entities/video";
import { addToHistory } from "@/features/search-history";
import { usePrefetchAdjacentPages, useSearchQuery } from "@/shared/api";
import { useEmbedResults, useViewMode } from "@/shared/hooks";
import { formatQueryDisplay, parseSearchParams } from "@/shared/lib";
import type {
  SearchFilters,
  SearchState,
  SortField,
  SortOrder,
  VideoContent,
  ViewMode,
} from "@/shared/types";

import { useSearchNavigation } from "./use-search-navigation";

const INITIAL_TOTAL_COUNT = 0;

interface SearchData {
  state: SearchState;
  results: VideoContent[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
}

interface SearchResult extends SearchData {
  buildPageHref: (page: number) => string;
  handleFiltersChange: (filters: SearchFilters) => void;
  handleSortChange: (sortField: SortField, sortOrder: SortOrder) => void;
  handlePageChange: (page: number) => void;
  handleViewModeChange: (mode: ViewMode) => void;
  handleLimitChange: (limit: number) => void;
}

const getErrorMessage = (thrown: unknown): string => {
  if (thrown instanceof Error) {
    return thrown.message;
  }
  return "検索中にエラーが発生しました";
};

const EMPTY_PARAMS = new URLSearchParams();

const useSearchData = (searchParams: ReturnType<typeof useSearchParams>) => {
  const params = searchParams ?? EMPTY_PARAMS;
  const state = useMemo(() => parseSearchParams(params), [params]);
  const hasQuery = state.query.trim() !== "";

  const { data, isLoading, error } = useSearchQuery(state, hasQuery);

  useEffect(() => {
    if (hasQuery) {
      addToHistory(formatQueryDisplay(state.query, state.targets, state.tags));
    }
  }, [hasQuery, state.query, state.targets, state.tags]);

  return {
    state,
    results: data?.data ?? [],
    totalCount: data?.meta.totalCount ?? INITIAL_TOTAL_COUNT,
    loading: isLoading,
    error: error === null ? null : getErrorMessage(error),
  };
};

export const useSearch = (): SearchResult => {
  const searchParams = useSearchParams();
  const data = useSearchData(searchParams);
  const viewMode = useViewMode((state) => state.viewMode);
  const handleViewModeChange = useViewMode((state) => state.setViewMode);
  const navigation = useSearchNavigation(data.state);

  useThumbnailPreload(data.results);
  usePrefetchAdjacentPages(data.state, data.totalCount);
  useEmbedResults(data.results);

  return { ...data, viewMode, ...navigation, handleViewModeChange };
};
