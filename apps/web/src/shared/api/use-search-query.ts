"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SearchState, SnapshotSearchResponse } from "@/shared/types";

import { searchVideos } from "./search";

export const searchKeys = {
  all: ["search"] as const,
  query: (state: SearchState) => [...searchKeys.all, state] as const,
};

export const useSearchQuery = (state: SearchState, enabled: boolean) =>
  useQuery<SnapshotSearchResponse>({
    queryKey: searchKeys.query(state),
    queryFn: () => searchVideos(state),
    enabled,
    placeholderData: keepPreviousData,
  });
