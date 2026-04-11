import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUsageStats, recordUsage, resetUsageForTesting } from "./usage-monitor";

describe("usage-monitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2025-01-15 10:00:00 JST = 2025-01-15 01:00:00 UTC
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    resetUsageForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("recordUsage", () => {
    it("allows usage when under limit", () => {
      const result = recordUsage();
      expect(result.allowed).toBe(true);
    });

    it("increments count on each call", () => {
      recordUsage();
      recordUsage();
      recordUsage();
      const stats = getUsageStats();
      expect(stats.count).toBe(3);
    });

    it("rejects usage when daily limit is reached", () => {
      vi.stubEnv("GEMINI_DAILY_LIMIT", "3");
      resetUsageForTesting();

      expect(recordUsage().allowed).toBe(true);
      expect(recordUsage().allowed).toBe(true);
      expect(recordUsage().allowed).toBe(true);
      expect(recordUsage().allowed).toBe(false);
    });

    it("resets counter when JST date changes", () => {
      vi.stubEnv("GEMINI_DAILY_LIMIT", "3");
      resetUsageForTesting();

      recordUsage();
      recordUsage();
      recordUsage();
      expect(recordUsage().allowed).toBe(false);

      // Advance to next JST day (15:00 UTC = 00:00 JST next day)
      vi.setSystemTime(new Date("2025-01-15T15:00:00Z"));
      expect(recordUsage().allowed).toBe(true);
    });
  });

  describe("getUsageStats", () => {
    it("returns current count and limit", () => {
      recordUsage();
      const stats = getUsageStats();
      expect(stats.count).toBe(1);
      expect(stats.limit).toBe(1000);
      expect(stats.date).toBe("2025-01-15");
    });

    it("respects GEMINI_DAILY_LIMIT env var", () => {
      vi.stubEnv("GEMINI_DAILY_LIMIT", "500");
      resetUsageForTesting();

      const stats = getUsageStats();
      expect(stats.limit).toBe(500);
    });
  });
});
