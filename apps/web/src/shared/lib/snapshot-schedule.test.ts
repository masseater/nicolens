import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLatestSnapshotUpdate,
  getMsUntilNextSnapshot,
  getSecondsUntilNextSnapshot,
  isCacheStillValid,
} from "./snapshot-schedule";

describe("getLatestSnapshotUpdate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today 5am JST when current time is after 5am JST", () => {
    // 2025-01-15 10:00:00 JST = 2025-01-15 01:00:00 UTC
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    const result = getLatestSnapshotUpdate();
    // 5am JST = 20:00 UTC previous day
    expect(result.toISOString()).toBe("2025-01-14T20:00:00.000Z");
  });

  it("returns yesterday 5am JST when current time is before 5am JST", () => {
    // 2025-01-15 03:00:00 JST = 2025-01-14 18:00:00 UTC
    vi.setSystemTime(new Date("2025-01-14T18:00:00Z"));
    const result = getLatestSnapshotUpdate();
    // Should be previous day's 5am JST = 2025-01-13T20:00:00Z
    expect(result.toISOString()).toBe("2025-01-13T20:00:00.000Z");
  });
});

describe("getSecondsUntilNextSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns positive seconds until next snapshot", () => {
    // 2025-01-15 10:00:00 JST = 2025-01-15 01:00:00 UTC
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    const seconds = getSecondsUntilNextSnapshot();
    // Next snapshot: 2025-01-15T20:00:00Z (tomorrow 5am JST)
    // Remaining: 19 hours = 68400 seconds
    expect(seconds).toBe(68400);
  });

  it("returns at least 60 seconds (MIN_CACHE_SECONDS)", () => {
    // Set time very close to next snapshot update
    // 2025-01-15 04:59:50 JST = 2025-01-14 19:59:50 UTC
    vi.setSystemTime(new Date("2025-01-14T19:59:50Z"));
    const seconds = getSecondsUntilNextSnapshot();
    expect(seconds).toBeGreaterThanOrEqual(60);
  });
});

describe("getMsUntilNextSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns milliseconds (seconds * 1000)", () => {
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    const ms = getMsUntilNextSnapshot();
    const seconds = getSecondsUntilNextSnapshot();
    expect(ms).toBe(seconds * 1000);
  });
});

describe("isCacheStillValid", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when cache was stored after latest snapshot update", () => {
    // Current time: 2025-01-15 10:00 JST (01:00 UTC)
    // Latest snapshot: 2025-01-15 05:00 JST (2025-01-14 20:00 UTC)
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    // Cache stored at 2025-01-15 06:00 JST (2025-01-14 21:00 UTC) — after snapshot
    const timestamp = new Date("2025-01-14T21:00:00Z").getTime();
    expect(isCacheStillValid(timestamp)).toBe(true);
  });

  it("returns false when cache was stored before latest snapshot update", () => {
    // Current time: 2025-01-15 10:00 JST (01:00 UTC)
    // Latest snapshot: 2025-01-15 05:00 JST (2025-01-14 20:00 UTC)
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    // Cache stored at 2025-01-15 03:00 JST (2025-01-14 18:00 UTC) — before snapshot
    const timestamp = new Date("2025-01-14T18:00:00Z").getTime();
    expect(isCacheStillValid(timestamp)).toBe(false);
  });

  it("returns false when cache was stored exactly at snapshot update time", () => {
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    // Cache stored exactly at snapshot time (2025-01-14 20:00 UTC = JST 05:00)
    const timestamp = new Date("2025-01-14T20:00:00Z").getTime();
    expect(isCacheStillValid(timestamp)).toBe(false);
  });
});
