const TAG_SEARCH_TARGETS = "tagsExact";
const KEYWORD_SEARCH_TARGETS = "title,description,tags";
const TAG_PREFIX_PATTERN = /#(\S+)/g;
const FIELD_PREFIX_PATTERN = /(title|body):(?:"([^"]+)"|(\S+))/g;
const FIRST_INDEX = 0;
const SECOND_INDEX = 1;

// Regex replace callback argument indices for FIELD_PREFIX_PATTERN capture groups
const PREFIX_GROUP_INDEX = 1;
const QUOTED_GROUP_INDEX = 2;
const UNQUOTED_GROUP_INDEX = 3;

// Parenthesized OR group pattern: (A OR B OR C)
const OR_GROUP_PATTERN = /\(([^)]+)\)/g;
const OR_KEYWORD = " OR ";

const FIELD_TARGET_MAP: Record<string, string> = {
  title: "title",
  body: "description",
};

const REVERSE_TARGET_MAP: Record<string, string> = {
  title: "title",
  description: "body",
};

export { KEYWORD_SEARCH_TARGETS, TAG_SEARCH_TARGETS, REVERSE_TARGET_MAP };

export interface ParsedQueryInput {
  query: string;
  targets: string;
  tags: string[];
  error?: string;
}

interface NormalizedQuery {
  query: string;
  error?: string;
}

// Extract parenthesized OR groups from a raw query string
const extractOrGroups = (raw: string): { groups: string[]; remainder: string } => {
  const groups: string[] = [];
  const remainder = raw
    .replace(OR_GROUP_PATTERN, (_match, inner: string) => {
      groups.push(inner.trim());
      return "";
    })
    .trim();
  return { groups, remainder };
};

// Validate a single OR group and build the normalized query
const buildNormalizedOrQuery = (
  raw: string,
  orGroup: string,
  remainder: string,
): NormalizedQuery => {
  if (!orGroup.includes(OR_KEYWORD)) {
    return { query: raw, error: "カッコ内にはORを含めてください。例: (A OR B)" };
  }
  const parts = [orGroup];
  if (remainder !== "") {
    parts.push(remainder);
  }
  return { query: parts.join(" ") };
};

const normalizeOrSyntax = (raw: string): NormalizedQuery => {
  const { groups, remainder } = extractOrGroups(raw);

  if (groups.length === FIRST_INDEX) {
    return { query: raw };
  }

  if (groups.length > SECOND_INDEX) {
    return { query: raw, error: "ORグループは1つまでです。例: (A OR B) キーワード" };
  }

  const orGroup = groups[FIRST_INDEX] as string; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  return buildNormalizedOrQuery(raw, orGroup, remainder);
};

// Extract field prefixes (title:, body:) and determine search targets
const extractFieldPrefixes = (
  input: string,
): { keywords: string[]; targets: Set<string>; remainder: string } => {
  const keywords: string[] = [];
  const targets = new Set<string>();

  const remainder = input
    .replace(FIELD_PREFIX_PATTERN, (...args: string[]) => {
      const prefix = args[PREFIX_GROUP_INDEX] ?? "";
      const keyword = args[QUOTED_GROUP_INDEX] ?? args[UNQUOTED_GROUP_INDEX] ?? "";
      if (keyword !== "") {
        keywords.push(keyword);
        const target = FIELD_TARGET_MAP[prefix];
        if (target !== undefined) {
          targets.add(target);
        }
      }
      return "";
    })
    .trim();

  return { keywords, targets, remainder };
};

// Extract tags from raw input
const extractTags = (trimmed: string): { tags: string[]; remaining: string } => {
  const tags: string[] = [];
  const remaining = trimmed
    .replace(TAG_PREFIX_PATTERN, (_match, tag: string) => {
      tags.push(tag);
      return "";
    })
    .trim();
  return { tags, remaining };
};

// Build parsed result for tag-only queries
const buildTagOnlyResult = (tags: string[]): ParsedQueryInput => {
  const firstTag = tags[FIRST_INDEX] as string; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  const restTags = tags.slice(SECOND_INDEX);
  return { query: firstTag, targets: TAG_SEARCH_TARGETS, tags: restTags };
};

// Build parsed result for keyword queries (with optional field prefixes)
const buildKeywordResult = (remaining: string, tags: string[]): ParsedQueryInput => {
  const {
    keywords: prefixedKeywords,
    targets: fieldTargets,
    remainder: afterPrefixes,
  } = extractFieldPrefixes(remaining);

  const allKeywords = [...prefixedKeywords];
  if (afterPrefixes !== "") {
    allKeywords.push(afterPrefixes);
  }
  const combinedQuery = allKeywords.join(" ");
  const targets =
    fieldTargets.size > FIRST_INDEX ? [...fieldTargets].join(",") : KEYWORD_SEARCH_TARGETS;

  const normalized = normalizeOrSyntax(combinedQuery);
  return { query: normalized.query, targets, tags, error: normalized.error };
};

// Parse raw input: extract #tag tokens as tag filters, rest as keyword query
export const parseQueryInput = (raw: string): ParsedQueryInput => {
  const { tags, remaining } = extractTags(raw.trim());

  if (remaining === "" && tags.length > FIRST_INDEX) {
    return buildTagOnlyResult(tags);
  }

  return buildKeywordResult(remaining, tags);
};

// Format a query string with field prefix (e.g. title:hoge or body:"multi word")
const formatWithFieldPrefix = (prefix: string, query: string): string => {
  if (query.includes(" ")) {
    return `${prefix}:"${query}"`;
  }
  return `${prefix}:${query}`;
};

// Reconstruct the display form from parsed state
export const formatQueryDisplay = (query: string, targets: string, tags: string[]): string => {
  const parts: string[] = [];
  if (targets === TAG_SEARCH_TARGETS) {
    parts.push(`#${query}`);
  } else if (query !== "") {
    const prefix = REVERSE_TARGET_MAP[targets];
    if (prefix === undefined) {
      parts.push(query);
    } else {
      parts.push(formatWithFieldPrefix(prefix, query));
    }
  }
  for (const tag of tags) {
    parts.push(`#${tag}`);
  }
  return parts.join(" ");
};
