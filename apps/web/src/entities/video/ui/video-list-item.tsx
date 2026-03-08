"use client";

import { Heart } from "lucide-react";
import { useMemo } from "react";

import { buildVideoUrl } from "../lib/video-url";
import { formatDuration, highlightKeywords } from "@/shared/lib";
import type { VideoContent } from "@/shared/types";
import { Badge } from "@/shared/ui/badge";

import { VideoStats } from "./video-stats";
import { VideoTags } from "./video-tags";
import { VideoThumbnailImage } from "./video-thumbnail-image";

const EMPTY_TAGS: string[] = [];
const THUMBNAIL_WIDTH = 168;
const THUMBNAIL_HEIGHT = 94;

interface VideoListItemProps {
  video: VideoContent;
  query: string;
}

const ListItemThumbnail = ({ video }: { video: VideoContent }) => (
  <a
    href={buildVideoUrl(video.contentId)}
    target="_blank"
    rel="noopener noreferrer"
    className="shrink-0"
  >
    <div className="relative h-[67px] w-[120px] overflow-hidden rounded-md bg-muted sm:h-[94px] sm:w-[168px]">
      <VideoThumbnailImage
        src={video.thumbnailUrl}
        alt={video.title}
        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
        width={THUMBNAIL_WIDTH}
        height={THUMBNAIL_HEIGHT}
      />
      <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-0.5 text-xs font-medium text-white">
        {formatDuration(video.lengthSeconds)}
      </span>
    </div>
  </a>
);

export const VideoListItem = ({ video, query }: VideoListItemProps) => {
  const tags = useMemo(
    () => video.tags?.split(" ").filter((tag) => tag !== "") ?? EMPTY_TAGS,
    [video.tags],
  );

  return (
    <div className="flex gap-2 rounded-lg border bg-card p-2 transition-shadow hover:shadow-md sm:gap-3 sm:p-3">
      <ListItemThumbnail video={video} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a href={buildVideoUrl(video.contentId)} target="_blank" rel="noopener noreferrer">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight hover:text-primary">
            {highlightKeywords(video.title, query)}
          </h3>
        </a>

        <VideoStats
          video={video}
          className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground"
        />

        <div className="flex items-center gap-2">
          {video.genre !== undefined && video.genre !== "" && (
            <Badge variant="secondary" className="text-xs">
              {video.genre}
            </Badge>
          )}
          <VideoTags tags={tags} query={query} className="flex flex-wrap gap-1" />
        </div>

        {video.lastResBody !== undefined && video.lastResBody !== "" && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            <Heart className="mr-1 inline size-3" />
            {video.lastResBody}
          </p>
        )}
      </div>
    </div>
  );
};
