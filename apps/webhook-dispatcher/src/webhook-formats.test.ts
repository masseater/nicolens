import { describe, expect, it } from "vitest";

import { formatDiscord, formatGeneric } from "./webhook-formats";

const payloadStr = JSON.stringify({
  trigger: { type: "tag", tag: "VOCALOID" },
  videos: [
    {
      contentId: "sm123",
      title: "Test",
      url: "https://nico.ms/sm123",
      thumbnailUrl: "https://example.com/t.jpg",
      viewCounter: 1000,
      likeCounter: 50,
      commentCounter: 10,
      startTime: "2026-04-12T10:00:00+09:00",
    },
  ],
  totalNew: 1,
});

describe("formatGeneric", () => {
  it("returns the payload as-is", () => {
    const result = formatGeneric(payloadStr);
    expect(result).toEqual(JSON.parse(payloadStr));
  });
});

describe("formatDiscord", () => {
  it("builds embed with video info", () => {
    const result = formatDiscord(payloadStr);
    expect(result.content).toContain("VOCALOID");
    expect(result.embeds).toHaveLength(1);
    const [firstEmbed] = result.embeds;
    expect(firstEmbed?.url).toBe("https://nico.ms/sm123");
  });

  it("limits to 10 embeds", () => {
    const videos = Array.from({ length: 15 }, (_unused, index) => ({
      contentId: `sm${String(index)}`,
      title: `Test ${String(index)}`,
      url: `https://nico.ms/sm${String(index)}`,
      thumbnailUrl: "https://example.com/t.jpg",
      viewCounter: 1,
      likeCounter: 1,
      commentCounter: 1,
      startTime: "2026-04-12T10:00:00+09:00",
    }));
    const big = JSON.stringify({ trigger: { type: "tag", tag: "T" }, videos, totalNew: 15 });
    const result = formatDiscord(big);
    expect(result.embeds).toHaveLength(10);
  });
});
