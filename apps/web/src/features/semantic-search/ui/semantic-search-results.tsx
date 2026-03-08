"use client";

import { Brain, Database, Loader2, SearchX } from "lucide-react";
import { useMemo } from "react";

import { VideoGrid } from "@/entities/video";
import type { SemanticSearchResult, VideoContent, ViewMode } from "@/shared/types";
import { Badge } from "@/shared/ui/badge";
import { SkeletonGrid } from "@/shared/ui/skeleton-card";

const EMPTY_COUNT = 0;

const toVideoContent = (result: SemanticSearchResult): VideoContent => ({
  contentId: result.contentId,
  title: result.title,
  description: result.description,
  tags: result.tags,
  genre: result.genre,
  thumbnailUrl: result.thumbnailUrl,
  viewCounter: result.viewCounter,
  mylistCounter: result.mylistCounter,
  likeCounter: result.likeCounter,
  commentCounter: result.commentCounter,
  lengthSeconds: result.lengthSeconds,
  startTime: result.startTime,
});

const LoadingSkeleton = () => (
  <div className="mt-4">
    <div className="mb-4 flex items-center gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">意味合いで検索中...</span>
    </div>
    <SkeletonGrid />
  </div>
);

const EmptyState = ({ query, indexedCount }: { query: string; indexedCount: number }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
    <SearchX className="size-12 text-muted-foreground/50" />
    <div>
      <p className="text-lg font-medium">「{query}」に類似する動画が見つかりませんでした</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {indexedCount === EMPTY_COUNT
          ? "まだインデックスが構築されていません。まず通常検索で動画を検索してください。"
          : "別の表現で検索してみてください"}
      </p>
    </div>
  </div>
);

const IndexInfo = ({ indexedCount }: { indexedCount: number }) => (
  <div className="mt-4 flex items-center gap-2">
    <Badge variant="secondary" className="gap-1">
      <Database className="size-3" />
      {indexedCount.toLocaleString("ja-JP")} 件インデックス済み
    </Badge>
    <Badge variant="outline" className="gap-1">
      <Brain className="size-3" />
      セマンティック検索
    </Badge>
  </div>
);

const EMPTY_RESULTS_LENGTH = 0;

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
    {message}
  </div>
);

interface SemanticSearchResultsProps {
  loading: boolean;
  error: string | null;
  results: SemanticSearchResult[];
  totalCount: number;
  indexedCount: number;
  query: string;
  currentPage: number;
  limit: number;
  viewMode: ViewMode;
  buildPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLimitChange: (limit: number) => void;
}

const ResultsGrid = (props: SemanticSearchResultsProps & { videoContents: VideoContent[] }) => (
  <>
    <IndexInfo indexedCount={props.indexedCount} />
    <VideoGrid
      results={props.videoContents}
      totalCount={props.totalCount}
      currentPage={props.currentPage}
      limit={props.limit}
      query={props.query}
      viewMode={props.viewMode}
      buildPageHref={props.buildPageHref}
      onPageChange={props.onPageChange}
      onViewModeChange={props.onViewModeChange}
      onLimitChange={props.onLimitChange}
    />
  </>
);

const useVideoContents = (results: SemanticSearchResult[]) =>
  useMemo(() => results.map((result) => toVideoContent(result)), [results]);

export const SemanticSearchResults = (props: SemanticSearchResultsProps) => {
  const videoContents = useVideoContents(props.results);

  if (props.loading) {
    return <LoadingSkeleton />;
  }
  if (props.error !== null) {
    return <ErrorBanner message={props.error} />;
  }
  if (props.query === "") {
    return null;
  }
  if (props.results.length === EMPTY_RESULTS_LENGTH) {
    return <EmptyState query={props.query} indexedCount={props.indexedCount} />;
  }

  return <ResultsGrid {...props} videoContents={videoContents} />;
};
