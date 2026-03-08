import type { ReactNode } from "react";

const EMPTY_LENGTH = 0;
const NOT_PREFIX_OFFSET = 1;
const SINGLE_PART = 1;

// Extract individual keywords from query, ignoring OR and removing - prefix (NOT)
const extractKeywords = (query: string): string[] =>
  query
    .split(/\s+/)
    .filter((word) => word !== "OR" && word !== "")
    .map((word) => (word.startsWith("-") ? word.slice(NOT_PREFIX_OFFSET) : word))
    .filter((word) => word.length > EMPTY_LENGTH);

// Build a case-insensitive regex pattern that matches any of the keywords
const buildKeywordPattern = (keywords: string[]): RegExp => {
  const escaped = keywords.map((kw) => kw.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`));
  return new RegExp(`(${escaped.join("|")})`, "gi");
};

// Render a single text part, wrapping matches in <mark>
const renderPart = (part: string, index: number, pattern: RegExp): ReactNode => {
  const key = `${part}-${String(index)}`;
  if (pattern.test(part)) {
    pattern.lastIndex = 0;
    return (
      <mark key={key} className="rounded-sm bg-yellow-200/80 px-0.5 dark:bg-yellow-500/30">
        {part}
      </mark>
    );
  }
  return part;
};

// Split text by keyword matches (case-insensitive) and wrap matches in <mark>
export const highlightKeywords = (text: string, query: string): ReactNode => {
  if (query.trim() === "") {
    return text;
  }

  const keywords = extractKeywords(query);
  if (keywords.length === EMPTY_LENGTH) {
    return text;
  }

  const pattern = buildKeywordPattern(keywords);
  const parts = text.split(pattern);

  if (parts.length <= SINGLE_PART) {
    return text;
  }

  return parts.map((part, index) => renderPart(part, index, pattern));
};
