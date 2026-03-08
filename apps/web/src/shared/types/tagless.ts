import type { SearchFilters, SortField, SortOrder } from "./api";

// Month format: "2025-03"
export interface TaglessSearchState {
  query: string;
  month: string;
  sortField: SortField;
  sortOrder: SortOrder;
  filters: SearchFilters;
  page: number;
  limit: number;
}
