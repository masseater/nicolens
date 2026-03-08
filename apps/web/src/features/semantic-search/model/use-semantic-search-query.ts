"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { searchSemantic, semanticSearchKeys } from "@/shared/api";
import type { SemanticSearchResponse, SemanticSearchState } from "@/shared/types";

export const useSemanticSearchQuery = (state: SemanticSearchState, enabled: boolean) =>
  useQuery<SemanticSearchResponse>({
    queryKey: semanticSearchKeys.query(state),
    queryFn: () => searchSemantic(state),
    enabled,
    placeholderData: keepPreviousData,
  });
