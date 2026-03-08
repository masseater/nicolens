"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SearchState, SnapshotSearchResponse } from "@/shared/types";

import { searchKeys } from "./query-keys";
import { searchVideos } from "./search";

export const useSearchQuery = (state: SearchState, enabled: boolean) =>
  useQuery<SnapshotSearchResponse>({
    queryKey: searchKeys.query(state),
    queryFn: () => searchVideos(state),
    enabled,
    placeholderData: keepPreviousData,
  });
