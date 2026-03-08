import { describe, expect, it } from "vitest";

import {
  formatQueryDisplay,
  KEYWORD_SEARCH_TARGETS,
  parseQueryInput,
  REVERSE_TARGET_MAP,
  TAG_SEARCH_TARGETS,
} from "./query-parser";

describe("parseQueryInput", () => {
  it("parses plain keyword query", () => {
    const result = parseQueryInput("hello");
    expect(result.query).toBe("hello");
    expect(result.targets).toBe(KEYWORD_SEARCH_TARGETS);
    expect(result.tags).toEqual([]);
  });

  it("parses tag-only query", () => {
    const result = parseQueryInput("#VOCALOID");
    expect(result.query).toBe("VOCALOID");
    expect(result.targets).toBe(TAG_SEARCH_TARGETS);
    expect(result.tags).toEqual([]);
  });

  it("parses multiple tags (first tag as query, rest as tag filters)", () => {
    const result = parseQueryInput("#VOCALOID #初音ミク");
    expect(result.query).toBe("VOCALOID");
    expect(result.targets).toBe(TAG_SEARCH_TARGETS);
    expect(result.tags).toEqual(["初音ミク"]);
  });

  it("parses keyword with tag filters", () => {
    const result = parseQueryInput("music #VOCALOID");
    expect(result.query).toBe("music");
    expect(result.targets).toBe(KEYWORD_SEARCH_TARGETS);
    expect(result.tags).toEqual(["VOCALOID"]);
  });

  it("parses title: prefix", () => {
    const result = parseQueryInput("title:hello");
    expect(result.query).toBe("hello");
    expect(result.targets).toBe("title");
  });

  it("parses body: prefix", () => {
    const result = parseQueryInput("body:hello");
    expect(result.query).toBe("hello");
    expect(result.targets).toBe("description");
  });

  it("parses title: prefix with quoted value", () => {
    const result = parseQueryInput('title:"hello world"');
    expect(result.query).toBe("hello world");
    expect(result.targets).toBe("title");
  });

  it("parses body: prefix with quoted value", () => {
    const result = parseQueryInput('body:"foo bar"');
    expect(result.query).toBe("foo bar");
    expect(result.targets).toBe("description");
  });

  it("handles OR syntax in parentheses", () => {
    const result = parseQueryInput("(cat OR dog)");
    expect(result.query).toBe("cat OR dog");
    expect(result.error).toBeUndefined();
  });

  it("returns error for parenthesized group without OR", () => {
    const result = parseQueryInput("(hello)");
    expect(result.error).toContain("OR");
  });

  it("returns error for multiple OR groups", () => {
    const result = parseQueryInput("(cat OR dog) (foo OR bar)");
    expect(result.error).toContain("1つまで");
  });

  it("handles OR group with remaining keywords", () => {
    const result = parseQueryInput("(cat OR dog) extra");
    expect(result.query).toBe("cat OR dog extra");
    expect(result.error).toBeUndefined();
  });

  it("handles empty input", () => {
    const result = parseQueryInput("");
    expect(result.query).toBe("");
    expect(result.targets).toBe(KEYWORD_SEARCH_TARGETS);
    expect(result.tags).toEqual([]);
  });

  it("handles whitespace-only input", () => {
    const result = parseQueryInput("   ");
    expect(result.query).toBe("");
    expect(result.targets).toBe(KEYWORD_SEARCH_TARGETS);
  });

  it("parses field prefix with tag combination", () => {
    const result = parseQueryInput("title:music #VOCALOID");
    expect(result.query).toBe("music");
    expect(result.targets).toBe("title");
    expect(result.tags).toEqual(["VOCALOID"]);
  });

  it("handles field prefix with additional plain keywords", () => {
    const result = parseQueryInput("title:hello extra");
    expect(result.query).toBe("hello extra");
  });
});

describe("formatQueryDisplay", () => {
  it("formats tag search query", () => {
    expect(formatQueryDisplay("VOCALOID", TAG_SEARCH_TARGETS, [])).toBe("#VOCALOID");
  });

  it("formats keyword search query", () => {
    expect(formatQueryDisplay("hello", KEYWORD_SEARCH_TARGETS, [])).toBe("hello");
  });

  it("formats query with tags", () => {
    expect(formatQueryDisplay("hello", KEYWORD_SEARCH_TARGETS, ["VOCALOID"])).toBe(
      "hello #VOCALOID",
    );
  });

  it("formats query with title target", () => {
    expect(formatQueryDisplay("hello", "title", [])).toBe("title:hello");
  });

  it("formats query with description target", () => {
    expect(formatQueryDisplay("hello", "description", [])).toBe("body:hello");
  });

  it("formats multi-word query with field prefix using quotes", () => {
    expect(formatQueryDisplay("hello world", "title", [])).toBe('title:"hello world"');
  });

  it("formats tag search with additional tags", () => {
    expect(formatQueryDisplay("VOCALOID", TAG_SEARCH_TARGETS, ["初音ミク"])).toBe(
      "#VOCALOID #初音ミク",
    );
  });

  it("handles empty query with tags", () => {
    expect(formatQueryDisplay("", KEYWORD_SEARCH_TARGETS, ["VOCALOID"])).toBe("#VOCALOID");
  });

  it("handles unknown target without field prefix", () => {
    expect(formatQueryDisplay("hello", "unknown_target", [])).toBe("hello");
  });
});

describe("REVERSE_TARGET_MAP", () => {
  it("maps title to title", () => {
    expect(REVERSE_TARGET_MAP["title"]).toBe("title");
  });

  it("maps description to body", () => {
    expect(REVERSE_TARGET_MAP["description"]).toBe("body");
  });
});
