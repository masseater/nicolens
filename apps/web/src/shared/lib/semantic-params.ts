import type { SemanticSearchState } from "@/shared/types";

const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;
const MIN_LIMIT = 1;

export const parseSemanticParams = (params: URLSearchParams): SemanticSearchState => ({
  query: params.get("q") ?? "",
  page: Math.max(DEFAULT_PAGE, Number(params.get("page") ?? String(DEFAULT_PAGE))),
  limit: Math.max(MIN_LIMIT, Number(params.get("limit") ?? String(DEFAULT_LIMIT))),
});
