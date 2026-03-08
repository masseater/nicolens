import { describe, expect, it } from "vitest";

import { buildVideoUrl, toLargeThumbnailUrl } from "./video-url";

describe("buildVideoUrl", () => {
  it("builds nico.ms URL from contentId", () => {
    expect(buildVideoUrl("sm12345")).toBe("https://nico.ms/sm12345");
  });

  it("handles different content ID formats", () => {
    expect(buildVideoUrl("nm99999")).toBe("https://nico.ms/nm99999");
    expect(buildVideoUrl("so1")).toBe("https://nico.ms/so1");
  });
});

describe("toLargeThumbnailUrl", () => {
  it("appends .L suffix to thumbnail URL", () => {
    expect(toLargeThumbnailUrl("https://nicovideo.cdn.nimg.jp/thumbnails/12345/12345")).toBe(
      "https://nicovideo.cdn.nimg.jp/thumbnails/12345/12345.L",
    );
  });
});
