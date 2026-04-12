import { taglessVideos } from "@nicolens/datastore";
import { type SQL, eq, gte, ilike, isNull, lte, or } from "drizzle-orm";

export interface ParsedFilters {
  viewCounterGte?: number;
  viewCounterLte?: number;
  commentCounterGte?: number;
  commentCounterLte?: number;
  mylistCounterGte?: number;
  mylistCounterLte?: number;
  likeCounterGte?: number;
  likeCounterLte?: number;
  lengthSecondsGte?: number;
  lengthSecondsLte?: number;
  startTimeGte?: string;
  startTimeLte?: string;
  genre?: string;
}

const parseOptionalInt = (param: string | null): number | undefined => {
  if (param === null) {
    return undefined;
  }
  const num = Number(param);
  return Number.isFinite(num) ? num : undefined;
};

export const parseFilters = (searchParams: URLSearchParams): ParsedFilters => ({
  viewCounterGte: parseOptionalInt(searchParams.get("vcGte")),
  viewCounterLte: parseOptionalInt(searchParams.get("vcLte")),
  commentCounterGte: parseOptionalInt(searchParams.get("ccGte")),
  commentCounterLte: parseOptionalInt(searchParams.get("ccLte")),
  mylistCounterGte: parseOptionalInt(searchParams.get("mlGte")),
  mylistCounterLte: parseOptionalInt(searchParams.get("mlLte")),
  likeCounterGte: parseOptionalInt(searchParams.get("lkGte")),
  likeCounterLte: parseOptionalInt(searchParams.get("lkLte")),
  lengthSecondsGte: parseOptionalInt(searchParams.get("lsGte")),
  lengthSecondsLte: parseOptionalInt(searchParams.get("lsLte")),
  startTimeGte: searchParams.get("stGte") ?? undefined,
  startTimeLte: searchParams.get("stLte") ?? undefined,
  genre: searchParams.get("genre") ?? undefined,
});

const addQueryCondition = (conditions: SQL[], query: string): void => {
  if (query !== "") {
    const pattern = `%${query}%`;
    conditions.push(
      or(ilike(taglessVideos.title, pattern), ilike(taglessVideos.description, pattern)) as SQL, // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- or() returns SQL | undefined, but both args are always present
    );
  }
};

interface RangeFilterDef {
  column: Parameters<typeof gte>[0]; // oxlint-disable-line no-magic-numbers -- tuple index
  gteVal?: number | string;
  lteVal?: number | string;
}

const addRangeConditions = (conditions: SQL[], filters: ParsedFilters): void => {
  const rangeDefs: RangeFilterDef[] = [
    {
      column: taglessVideos.viewCounter,
      gteVal: filters.viewCounterGte,
      lteVal: filters.viewCounterLte,
    },
    {
      column: taglessVideos.commentCounter,
      gteVal: filters.commentCounterGte,
      lteVal: filters.commentCounterLte,
    },
    {
      column: taglessVideos.mylistCounter,
      gteVal: filters.mylistCounterGte,
      lteVal: filters.mylistCounterLte,
    },
    {
      column: taglessVideos.likeCounter,
      gteVal: filters.likeCounterGte,
      lteVal: filters.likeCounterLte,
    },
    {
      column: taglessVideos.lengthSeconds,
      gteVal: filters.lengthSecondsGte,
      lteVal: filters.lengthSecondsLte,
    },
    { column: taglessVideos.startTime, gteVal: filters.startTimeGte, lteVal: filters.startTimeLte },
  ];
  for (const { column, gteVal, lteVal } of rangeDefs) {
    if (gteVal !== undefined) {
      conditions.push(gte(column, gteVal));
    }
    if (lteVal !== undefined) {
      conditions.push(lte(column, lteVal));
    }
  }
  if (filters.genre !== undefined && filters.genre !== "") {
    conditions.push(eq(taglessVideos.genre, filters.genre));
  }
};

export const buildWhereConditions = (
  month: string,
  filters: ParsedFilters,
  query: string,
): SQL[] => {
  const conditions: SQL[] = [
    eq(taglessVideos.month, month),
    or(isNull(taglessVideos.tags), eq(taglessVideos.tags, "")) as SQL, // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- or() returns SQL | undefined, but both args are always present
  ];
  addQueryCondition(conditions, query);
  addRangeConditions(conditions, filters);
  return conditions;
};
