import { describe, expect, it } from "vitest";

import { formatDate, formatDuration, formatNumber } from "./format";

describe("formatNumber", () => {
  it("formats numbers below 10,000 with locale", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(9999)).toBe("9,999");
  });

  it("formats numbers >= 10,000 with 万 suffix", () => {
    expect(formatNumber(10_000)).toBe("1.0万");
    expect(formatNumber(15_000)).toBe("1.5万");
    expect(formatNumber(100_000)).toBe("10.0万");
    expect(formatNumber(1_234_567)).toBe("123.5万");
  });
});

describe("formatDuration", () => {
  it("formats seconds-only durations", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(59)).toBe("0:59");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(600)).toBe("10:00");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
    expect(formatDuration(7200)).toBe("2:00:00");
    expect(formatDuration(36610)).toBe("10:10:10");
  });
});

describe("formatDate", () => {
  it("formats ISO date strings to ja-JP locale", () => {
    const result = formatDate("2024-01-15T12:00:00Z");
    expect(result).toBe("2024/01/15");
  });

  it("formats another date", () => {
    const result = formatDate("2023-12-31T23:59:59Z");
    expect(result).toBe("2024/01/01");
  });
});
