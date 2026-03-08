"use client";

import { Download, Grid3X3, List } from "lucide-react";

import { exportToCsv, exportToJson } from "@/shared/lib";
import type { VideoContent, ViewMode } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Pagination } from "@/shared/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { VideoCard } from "./video-card";
import { VideoListItem } from "./video-list-item";

const GRID_COLUMNS_CLASS =
  "mt-4 grid gap-3 grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]";
const LIST_CLASS = "mt-4 flex flex-col gap-3";

const LIMIT_OPTIONS = [
  { value: "25", label: "25件" },
  { value: "50", label: "50件" },
  { value: "100", label: "100件" },
];

const LimitSelect = ({
  limit,
  onLimitChange,
}: {
  limit: number;
  onLimitChange: (limit: number) => void;
}) => (
  <Select
    value={String(limit)}
    onValueChange={(value) => {
      onLimitChange(Number(value));
    }}
  >
    <SelectTrigger className="h-8 w-24 text-xs">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {LIMIT_OPTIONS.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const ViewModeToggle = ({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) => (
  <div className="flex rounded-md border">
    <Button
      variant={viewMode === "grid" ? "default" : "ghost"}
      size="icon-sm"
      onClick={() => {
        onViewModeChange("grid");
      }}
      aria-label="グリッド表示"
    >
      <Grid3X3 className="size-4" />
    </Button>
    <Button
      variant={viewMode === "list" ? "default" : "ghost"}
      size="icon-sm"
      onClick={() => {
        onViewModeChange("list");
      }}
      aria-label="リスト表示"
    >
      <List className="size-4" />
    </Button>
  </div>
);

const ExportButton = ({ results }: { results: VideoContent[] }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={<Button variant="outline" size="icon-sm" aria-label="エクスポート" />}
    >
      <Download className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={() => {
          exportToCsv(results);
        }}
      >
        CSV でダウンロード
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          exportToJson(results);
        }}
      >
        JSON でダウンロード
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

interface ResultsToolbarProps {
  totalCount: number;
  viewMode: ViewMode;
  limit: number;
  results: VideoContent[];
  extraActions?: React.ReactNode;
  onViewModeChange: (mode: ViewMode) => void;
  onLimitChange: (limit: number) => void;
}

const ResultsToolbar = ({
  totalCount,
  viewMode,
  limit,
  results,
  extraActions,
  onViewModeChange,
  onLimitChange,
}: ResultsToolbarProps) => (
  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
    <p className="text-sm font-medium">
      <span className="text-lg font-bold text-foreground">
        {totalCount.toLocaleString("ja-JP")}
      </span>
      <span className="ml-1 text-muted-foreground">件の結果</span>
    </p>
    <div className="flex items-center gap-2">
      {extraActions}
      <ExportButton results={results} />
      <LimitSelect limit={limit} onLimitChange={onLimitChange} />
      <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  </div>
);

interface VideoGridProps {
  results: VideoContent[];
  totalCount: number;
  currentPage: number;
  limit: number;
  query: string;
  viewMode: ViewMode;
  extraActions?: React.ReactNode;
  buildPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onLimitChange: (limit: number) => void;
}

export const VideoGrid = ({
  results,
  totalCount,
  currentPage,
  limit,
  query,
  viewMode,
  extraActions,
  buildPageHref,
  onPageChange,
  onViewModeChange,
  onLimitChange,
}: VideoGridProps) => (
  <>
    <ResultsToolbar
      totalCount={totalCount}
      viewMode={viewMode}
      limit={limit}
      results={results}
      extraActions={extraActions}
      onViewModeChange={onViewModeChange}
      onLimitChange={onLimitChange}
    />
    {viewMode === "grid" ? (
      <div className={GRID_COLUMNS_CLASS}>
        {results.map((video) => (
          <VideoCard key={video.contentId} video={video} query={query} />
        ))}
      </div>
    ) : (
      <div className={LIST_CLASS}>
        {results.map((video) => (
          <VideoListItem key={video.contentId} video={video} query={query} />
        ))}
      </div>
    )}
    <div className="mt-8 pb-8">
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        limit={limit}
        buildHref={buildPageHref}
        onPageChange={onPageChange}
      />
    </div>
  </>
);
