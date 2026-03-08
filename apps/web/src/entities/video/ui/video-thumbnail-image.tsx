"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

import { toLargeThumbnailUrl } from "../lib/video-url";

interface VideoThumbnailImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export const VideoThumbnailImage = ({
  src,
  alt,
  width,
  height,
  className,
}: VideoThumbnailImageProps) => {
  const [imgSrc, setImgSrc] = useState(() => toLargeThumbnailUrl(src));
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    setImgSrc((current) => {
      if (current !== src) {
        return src;
      }
      return current;
    });
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
          <span className="text-xs text-muted-foreground">読み込み中...</span>
        </div>
      )}
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className ?? ""} transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
};
