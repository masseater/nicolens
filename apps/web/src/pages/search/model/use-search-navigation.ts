"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { buildSearchParams, calcPageOnLimitChange } from "@/shared/lib";
import type { SearchFilters, SearchState, SortField, SortOrder } from "@/shared/types";

const FIRST_PAGE = 1;

export const useSearchNavigation = (state: SearchState) => {
  const router = useRouter();

  const updateAndNavigate = (newState: SearchState) => {
    const params = buildSearchParams(newState);
    router.push(`/search?${params.toString()}`);
  };

  const buildPageHref = useCallback(
    (page: number): string => {
      const params = buildSearchParams({ ...state, page });
      return `/search?${params.toString()}`;
    },
    [state],
  );

  const handleFiltersChange = (filters: SearchFilters) => {
    updateAndNavigate({ ...state, filters, page: FIRST_PAGE });
  };

  const handleSortChange = (field: SortField, order: SortOrder) => {
    updateAndNavigate({ ...state, sortField: field, sortOrder: order, page: FIRST_PAGE });
  };

  const handlePageChange = (page: number) => {
    updateAndNavigate({ ...state, page });
    document.querySelector("[data-slot=results]")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (limit: number) => {
    updateAndNavigate({
      ...state,
      limit,
      page: calcPageOnLimitChange(state.page, state.limit, limit),
    });
  };

  return {
    handleFiltersChange,
    handleSortChange,
    handlePageChange,
    handleLimitChange,
    buildPageHref,
  };
};
