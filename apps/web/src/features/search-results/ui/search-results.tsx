"use client";

import { Loader2, SearchX } from "lucide-react";

import { VideoGrid } from "@/entities/video";
import type { VideoContent, ViewMode } from "@/shared/types";
import { SkeletonGrid } from "@/shared/ui/skeleton-card";

const LoadingSkeleton = () => (
  <div className="mt-4">
    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">検索中...</span>
    </div>
    <SkeletonGrid />
  </div>
);

const EmptyState = ({ query }: { query: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
    <SearchX className="size-12 text-muted-foreground/50" />
    <div>
      <p className="text-lg font-medium">「{query}」に一致する動画が見つかりませんでした</p>
      <p className="mt-1 text-sm text-muted-foreground">
        別のキーワードやフィルタ条件で検索してみてください
      </p>
    </div>
  </div>
);

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
    {message}
  </div>
);

const EMPTY_RESULTS_LENGTH = 0;

interface SearchResultsProps {
  loading: boolean;
  error: string | null;
  results: VideoContent[];
  totalCount: number;
  query: string;
  currentPage: number;
  limit: number;
  viewMode: ViewMode;
  extraActions?: React.ReactNode;
  buildPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLimitChange: (limit: number) => void;
}

export const SearchResults = ({
  loading,
  error,
  results,
  totalCount,
  query,
  currentPage,
  limit,
  viewMode,
  extraActions,
  buildPageHref,
  onPageChange,
  onViewModeChange,
  onLimitChange,
}: SearchResultsProps) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error !== null) {
    return <ErrorBanner message={error} />;
  }

  if (query === "") {
    return null;
  }

  if (results.length === EMPTY_RESULTS_LENGTH) {
    return <EmptyState query={query} />;
  }

  return (
    <VideoGrid
      results={results}
      totalCount={totalCount}
      currentPage={currentPage}
      limit={limit}
      query={query}
      viewMode={viewMode}
      extraActions={extraActions}
      buildPageHref={buildPageHref}
      onPageChange={onPageChange}
      onViewModeChange={onViewModeChange}
      onLimitChange={onLimitChange}
    />
  );
};
