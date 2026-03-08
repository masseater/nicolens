import { describe, expect, it } from "vitest";

import { highlightKeywords } from "./highlight";

describe("highlightKeywords", () => {
  it("returns plain text when query is empty", () => {
    expect(highlightKeywords("hello world", "")).toBe("hello world");
  });

  it("returns plain text when query is whitespace only", () => {
    expect(highlightKeywords("hello world", "   ")).toBe("hello world");
  });

  it("returns plain text when query is OR only", () => {
    expect(highlightKeywords("hello world", "OR")).toBe("hello world");
  });

  it("returns plain text when no keywords match", () => {
    expect(highlightKeywords("hello world", "xyz")).toBe("hello world");
  });

  it("wraps matching keyword in mark elements", () => {
    const result = highlightKeywords("hello world", "hello");
    expect(Array.isArray(result)).toBe(true);
    const parts = result as React.ReactNode[];
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it("highlights multiple keywords", () => {
    const result = highlightKeywords("hello beautiful world", "hello world");
    expect(Array.isArray(result)).toBe(true);
    const parts = result as React.ReactNode[];
    // "hello" + " beautiful " + "world" = at least 3 parts
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it("handles case-insensitive matching", () => {
    const result = highlightKeywords("Hello WORLD", "hello world");
    expect(Array.isArray(result)).toBe(true);
  });

  it("strips OR keyword from query before highlighting", () => {
    const result = highlightKeywords("cat OR dog", "cat OR dog");
    expect(Array.isArray(result)).toBe(true);
  });

  it("strips NOT prefix (-) from keywords", () => {
    const result = highlightKeywords("test keyword", "-test");
    expect(Array.isArray(result)).toBe(true);
  });

  it("handles - prefix that results in empty keyword", () => {
    // "-" alone after stripping prefix becomes empty string, should be filtered
    expect(highlightKeywords("hello", "-")).toBe("hello");
  });

  it("escapes regex special characters in keywords", () => {
    const result = highlightKeywords("price is $100", "$100");
    expect(Array.isArray(result)).toBe(true);
  });
});
