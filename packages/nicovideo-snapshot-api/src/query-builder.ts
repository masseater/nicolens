import type { SearchFilters, SearchOptions } from "./types";

const SNAPSHOT_API = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
const DEFAULT_FIELDS =
  "contentId,title,description,userId,channelId,viewCounter,mylistCounter,likeCounter,lengthSeconds,thumbnailUrl,startTime,lastResBody,commentCounter,lastCommentTime,categoryTags,tags,genre";
const DEFAULT_CONTEXT = "nicolens";

const applyBaseParams = (params: URLSearchParams, options: SearchOptions): void => {
  params.set("q", options.query);
  params.set("targets", options.targets);
  params.set("fields", options.fields ?? DEFAULT_FIELDS);
  params.set("_context", options.context ?? DEFAULT_CONTEXT);
};

const applyPagingParams = (params: URLSearchParams, options: SearchOptions): void => {
  if (options.sort !== undefined) {
    params.set("_sort", options.sort);
  }
  if (options.limit !== undefined) {
    params.set("_limit", String(options.limit));
  }
  if (options.offset !== undefined) {
    params.set("_offset", String(options.offset));
  }
};

const applyFilters = (params: URLSearchParams, filters: SearchFilters): void => {
  for (const [field, ops] of Object.entries(filters)) {
    for (const [op, val] of Object.entries(ops)) {
      params.set(`filters[${field}][${op}]`, val);
    }
  }
};

export const buildSearchUrl = (options: SearchOptions): string => {
  const params = new URLSearchParams();
  applyBaseParams(params, options);
  applyPagingParams(params, options);
  if (options.filters !== undefined) {
    applyFilters(params, options.filters);
  }
  return `${SNAPSHOT_API}?${params.toString()}`;
};
