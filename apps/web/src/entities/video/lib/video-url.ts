const NICO_MS_BASE = "https://nico.ms/";

export const buildVideoUrl = (contentId: string): string => `${NICO_MS_BASE}${contentId}`;

/**
 * Append `.L` suffix to get the large (352x198) thumbnail from niconico CDN.
 * The default URL returned by the Snapshot API is ~130x100.
 */
export const toLargeThumbnailUrl = (thumbnailUrl: string): string => `${thumbnailUrl}.L`;
