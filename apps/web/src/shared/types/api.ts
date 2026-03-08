export interface VideoContent {
  contentId: string;
  title: string;
  description?: string;
  userId?: number;
  channelId?: number;
  viewCounter: number;
  mylistCounter: number;
  likeCounter: number;
  lengthSeconds: number;
  thumbnailUrl: string;
  startTime: string;
  lastResBody?: string;
  commentCounter: number;
  lastCommentTime?: string;
  categoryTags?: string;
  tags?: string;
  genre?: string;
}

export interface SnapshotMeta {
  status: number;
  totalCount: number;
  id: string;
}

export interface SnapshotSearchResponse {
  meta: SnapshotMeta;
  data: VideoContent[];
}

export interface SnapshotErrorResponse {
  meta: {
    status: number;
    errorCode: string;
    errorMessage: string;
  };
}

export type SortField =
  | "viewCounter"
  | "mylistCounter"
  | "likeCounter"
  | "lengthSeconds"
  | "startTime"
  | "commentCounter"
  | "lastCommentTime";

export type SortOrder = "+" | "-";

export interface SearchFilters {
  viewCounterGte?: number;
  viewCounterLte?: number;
  startTimeGte?: string;
  startTimeLte?: string;
  lengthSecondsGte?: number;
  lengthSecondsLte?: number;
  genre?: string;
  commentCounterGte?: number;
  commentCounterLte?: number;
  mylistCounterGte?: number;
  mylistCounterLte?: number;
  likeCounterGte?: number;
  likeCounterLte?: number;
}

export interface SearchState {
  query: string;
  targets: string;
  sortField: SortField;
  sortOrder: SortOrder;
  filters: SearchFilters;
  tags: string[];
  page: number;
  limit: number;
}

export type ViewMode = "grid" | "list";
