"use client";

import { AlertTriangle, Loader2, RefreshCw, SearchX } from "lucide-react";

import { VideoGrid } from "@/entities/video";
import type { VideoContent, ViewMode } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { SkeletonGrid } from "@/shared/ui/skeleton-card";

const LoadingState = ({ month }: { month: string }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground/50" />
    <div>
      <p className="text-lg font-medium">{month} のタグなし動画をスキャン中...</p>
      <p className="mt-1 text-sm text-muted-foreground">初回は数分かかることがあります</p>
    </div>
    <div className="mt-4 w-full">
      <SkeletonGrid />
    </div>
  </div>
);

const EmptyState = ({ month }: { month: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
    <SearchX className="h-12 w-12 text-muted-foreground/50" />
    <div>
      <p className="text-lg font-medium">{month} にはタグなし動画が見つかりませんでした</p>
      <p className="mt-1 text-sm text-muted-foreground">別の月を選択してみてください</p>
    </div>
  </div>
);

const EMPTY_RESULTS_LENGTH = 0;
const CRAWL_LIMIT_COUNT = 30_000;

const CrawlLimitWarning = ({ totalCount }: { totalCount: number }) => {
  if (totalCount < CRAWL_LIMIT_COUNT) {
    return null;
  }
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
      <AlertTriangle className="size-4 shrink-0" />
      <span>
        この月の動画数がスキャン上限（{CRAWL_LIMIT_COUNT.toLocaleString("ja-JP")}
        件）を超えているため、一部の動画が含まれていない可能性があります
      </span>
    </div>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
    <p>{message}</p>
    {onRetry !== undefined && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1 size-4" />
        再試行
      </Button>
    )}
  </div>
);

interface TaglessResultsProps {
  loading: boolean;
  error: string | null;
  results: VideoContent[];
  totalCount: number;
  query: string;
  month: string;
  currentPage: number;
  limit: number;
  viewMode: ViewMode;
  buildPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLimitChange: (limit: number) => void;
  onRetry?: () => void;
}

export const TaglessResults = ({
  loading,
  error,
  results,
  totalCount,
  query,
  month,
  currentPage,
  limit,
  viewMode,
  buildPageHref,
  onPageChange,
  onViewModeChange,
  onLimitChange,
  onRetry,
}: TaglessResultsProps) => {
  if (loading) {
    return <LoadingState month={month} />;
  }
  if (error !== null) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (results.length === EMPTY_RESULTS_LENGTH) {
    return <EmptyState month={month} />;
  }

  return (
    <>
      <CrawlLimitWarning totalCount={totalCount} />
      <VideoGrid
        results={results}
        totalCount={totalCount}
        currentPage={currentPage}
        limit={limit}
        query={query}
        viewMode={viewMode}
        buildPageHref={buildPageHref}
        onPageChange={onPageChange}
        onViewModeChange={onViewModeChange}
        onLimitChange={onLimitChange}
      />
    </>
  );
};
