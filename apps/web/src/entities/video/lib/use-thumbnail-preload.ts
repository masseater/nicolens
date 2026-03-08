"use client";

import { useEffect } from "react";
import ReactDOM from "react-dom";

import type { VideoContent } from "@/shared/types";

import { toLargeThumbnailUrl } from "./video-url";

/**
 * Preload thumbnail images for the given video results.
 * Uses ReactDOM.preload() (React 19) to hint the browser to fetch images
 * before they scroll into the viewport.
 */
export const useThumbnailPreload = (results: readonly VideoContent[]) => {
  useEffect(() => {
    for (const video of results) {
      ReactDOM.preload(toLargeThumbnailUrl(video.thumbnailUrl), {
        as: "image",
      });
    }
  }, [results]);
};
