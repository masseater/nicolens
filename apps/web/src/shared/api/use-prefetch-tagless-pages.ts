"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { SnapshotSearchResponse, TaglessSearchState } from "@/shared/types";

import { taglessKeys } from "./query-keys";
import { searchTaglessVideos } from "./tagless";

const FIRST_PAGE = 1;
const NO_PAGES = 0;
const PAGE_STEP = 1;
const MIN_TOTAL_COUNT = 0;

/**
 * Prefetch adjacent tagless pages (prev/next) so that pagination feels instant.
 */
export const usePrefetchTaglessPages = (state: TaglessSearchState, totalCount: number) => {
  const queryClient = useQueryClient();
  const totalPages = totalCount > MIN_TOTAL_COUNT ? Math.ceil(totalCount / state.limit) : NO_PAGES;

  useEffect(() => {
    if (totalPages === NO_PAGES) {
      return;
    }

    const pagesToPrefetch: number[] = [];

    if (state.page > FIRST_PAGE) {
      pagesToPrefetch.push(state.page - PAGE_STEP);
    }
    if (state.page < totalPages) {
      pagesToPrefetch.push(state.page + PAGE_STEP);
    }

    for (const page of pagesToPrefetch) {
      const prefetchState = { ...state, page };
      void queryClient.prefetchQuery<SnapshotSearchResponse>({
        queryKey: taglessKeys.query(prefetchState),
        queryFn: () => searchTaglessVideos(prefetchState),
      });
    }
  }, [queryClient, state, totalPages]);
};
