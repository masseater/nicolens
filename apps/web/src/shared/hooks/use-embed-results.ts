"use client";

import { useEffect, useRef } from "react";

import { embedVideos } from "../api/semantic-search";
import type { VideoContent } from "@/shared/types";

const EMPTY_LENGTH = 0;

export const useEmbedResults = (videos: VideoContent[] | undefined) => {
  const sentRef = useRef(new Set<string>());

  useEffect(() => {
    if (videos === undefined || videos.length === EMPTY_LENGTH) {
      return;
    }

    const newVideos = videos.filter((video) => !sentRef.current.has(video.contentId));
    if (newVideos.length === EMPTY_LENGTH) {
      return;
    }

    for (const video of newVideos) {
      sentRef.current.add(video.contentId);
    }

    void embedVideos(newVideos);
  }, [videos]);
};
