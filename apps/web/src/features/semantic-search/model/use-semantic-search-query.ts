"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { searchSemantic } from "@/shared/api";
import type { SemanticSearchResponse, SemanticSearchState } from "@/shared/types";

export const semanticSearchKeys = {
  all: ["semantic-search"] as const,
  query: (state: SemanticSearchState) => [...semanticSearchKeys.all, state] as const,
};

export const useSemanticSearchQuery = (state: SemanticSearchState, enabled: boolean) =>
  useQuery<SemanticSearchResponse>({
    queryKey: semanticSearchKeys.query(state),
    queryFn: () => searchSemantic(state),
    enabled,
    placeholderData: keepPreviousData,
  });
