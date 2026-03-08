import { Heart } from "lucide-react";
import { useMemo } from "react";

import { buildVideoUrl } from "../lib/video-url";
import { formatDuration, highlightKeywords } from "@/shared/lib";
import type { VideoContent } from "@/shared/types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

import { VideoStats } from "./video-stats";
import { VideoTags } from "./video-tags";
import { VideoThumbnailImage } from "./video-thumbnail-image";

const EMPTY_TAGS: string[] = [];
const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_HEIGHT = 360;

interface VideoCardProps {
  video: VideoContent;
  query: string;
}

const VideoThumbnail = ({ video }: { video: VideoContent }) => (
  <a
    href={buildVideoUrl(video.contentId)}
    target="_blank"
    rel="noopener noreferrer"
    className="block"
  >
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
      <VideoThumbnailImage
        src={video.thumbnailUrl}
        alt={video.title}
        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
        width={THUMBNAIL_WIDTH}
        height={THUMBNAIL_HEIGHT}
      />
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
        {formatDuration(video.lengthSeconds)}
      </span>
    </div>
  </a>
);

export const VideoCard = ({ video, query }: VideoCardProps) => {
  const tags = useMemo(
    () => video.tags?.split(" ").filter((tag) => tag !== "") ?? EMPTY_TAGS,
    [video.tags],
  );

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <VideoThumbnail video={video} />
      <CardContent className="p-3">
        <a
          href={buildVideoUrl(video.contentId)}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight hover:text-primary">
            {highlightKeywords(video.title, query)}
          </h3>
        </a>
        <VideoStats
          video={video}
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
        />
        {video.genre !== undefined && video.genre !== "" && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs">
              {video.genre}
            </Badge>
          </div>
        )}
        <VideoTags tags={tags} query={query} className="mt-2 flex flex-wrap gap-1" />
        {video.lastResBody !== undefined && video.lastResBody !== "" && (
          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
            <Heart className="mr-1 inline size-3" />
            {video.lastResBody}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
