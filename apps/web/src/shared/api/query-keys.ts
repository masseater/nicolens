import type { SearchState, SemanticSearchState, TaglessSearchState } from "@/shared/types";

export const searchKeys = {
  all: ["search"] as const,
  query: (state: SearchState) => [...searchKeys.all, state] as const,
};

export const taglessKeys = {
  all: ["tagless"] as const,
  query: (state: TaglessSearchState) => [...taglessKeys.all, state] as const,
};

export const semanticSearchKeys = {
  all: ["semantic-search"] as const,
  query: (state: SemanticSearchState) => [...semanticSearchKeys.all, state] as const,
};
