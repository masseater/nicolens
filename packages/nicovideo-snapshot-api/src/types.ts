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
  id?: string;
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

export type SearchFilters = Record<string, Record<string, string>>;

export interface SearchOptions {
  query: string;
  targets: string;
  fields?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  context?: string;
  userAgent: string;
}
