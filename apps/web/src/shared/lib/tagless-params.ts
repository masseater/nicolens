import type { SearchFilters, SortField, SortOrder, TaglessSearchState } from "@/shared/types";

import { JST_OFFSET_HOURS, MINUTES_PER_HOUR, MS_PER_SECOND, SECONDS_PER_MINUTE } from "./constants";

const FIRST_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;

const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

export const getCurrentMonth = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}`;
};

const parseOptionalNumber = (raw: string | null): number | undefined => {
  if (raw === null) {
    return undefined;
  }
  return Number(raw);
};

const parseFilters = (params: URLSearchParams): SearchFilters => ({
  viewCounterGte: parseOptionalNumber(params.get("vcGte")),
  viewCounterLte: parseOptionalNumber(params.get("vcLte")),
  commentCounterGte: parseOptionalNumber(params.get("ccGte")),
  commentCounterLte: parseOptionalNumber(params.get("ccLte")),
  mylistCounterGte: parseOptionalNumber(params.get("mlGte")),
  mylistCounterLte: parseOptionalNumber(params.get("mlLte")),
  likeCounterGte: parseOptionalNumber(params.get("lkGte")),
  likeCounterLte: parseOptionalNumber(params.get("lkLte")),
  lengthSecondsGte: parseOptionalNumber(params.get("lsGte")),
  lengthSecondsLte: parseOptionalNumber(params.get("lsLte")),
  startTimeGte: params.get("stGte") ?? undefined,
  startTimeLte: params.get("stLte") ?? undefined,
  genre: params.get("genre") ?? undefined,
});

export const parseTaglessParams = (params: URLSearchParams): TaglessSearchState => ({
  query: params.get("q") ?? "",
  month: params.get("month") ?? getCurrentMonth(),
  sortField: (params.get("sort") as SortField | null) ?? "viewCounter", // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  sortOrder: (params.get("order") as SortOrder | null) ?? "-", // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  page: Number(params.get("page") ?? String(FIRST_PAGE)),
  limit: Number(params.get("limit") ?? String(DEFAULT_LIMIT)),
  filters: parseFilters(params),
});
