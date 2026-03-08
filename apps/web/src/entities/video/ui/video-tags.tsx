import Link from "next/link";

import { highlightKeywords } from "@/shared/lib";
import { Badge } from "@/shared/ui/badge";

const EMPTY_LENGTH = 0;

interface VideoTagsProps {
  tags: string[];
  query: string;
  className?: string;
}

export const VideoTags = ({ tags, query, className }: VideoTagsProps) => {
  if (tags.length === EMPTY_LENGTH) {
    return null;
  }

  return (
    <div className={className}>
      {tags.map((tag) => (
        <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}&targets=tagsExact`}>
          <Badge variant="outline" className="cursor-pointer text-xs hover:bg-accent">
            {highlightKeywords(tag, query)}
          </Badge>
        </Link>
      ))}
    </div>
  );
};
