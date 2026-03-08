import { Clock, Eye, MessageCircle, Star, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";

import { formatDate, formatNumber } from "@/shared/lib";
import type { VideoContent } from "@/shared/types";

const StatItem = ({ icon, value }: { icon: ReactNode; value: string }) => (
  <span className="flex items-center gap-1">
    {icon}
    {value}
  </span>
);

interface VideoStatsProps {
  video: VideoContent;
  className?: string;
}

export const VideoStats = ({ video, className }: VideoStatsProps) => (
  <div className={className}>
    <StatItem icon={<Eye className="size-3" />} value={formatNumber(video.viewCounter)} />
    <StatItem
      icon={<MessageCircle className="size-3" />}
      value={formatNumber(video.commentCounter)}
    />
    <StatItem icon={<Star className="size-3" />} value={formatNumber(video.mylistCounter)} />
    <StatItem icon={<ThumbsUp className="size-3" />} value={formatNumber(video.likeCounter)} />
    <StatItem icon={<Clock className="size-3" />} value={formatDate(video.startTime)} />
  </div>
);
