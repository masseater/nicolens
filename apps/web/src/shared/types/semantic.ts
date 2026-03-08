export interface SemanticSearchState {
  query: string;
  page: number;
  limit: number;
}

export interface SemanticSearchResult {
  contentId: string;
  title: string;
  description?: string;
  tags?: string;
  genre?: string;
  thumbnailUrl: string;
  viewCounter: number;
  mylistCounter: number;
  likeCounter: number;
  commentCounter: number;
  lengthSeconds: number;
  startTime: string;
  similarity: number;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  totalCount: number;
  indexedCount: number;
}
