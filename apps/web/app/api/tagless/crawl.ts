import { MONTHS_PER_YEAR, getLatestSnapshotUpdate } from "@/shared/lib";
import type { VideoContent } from "@/shared/types";

import { isCrawlFresh, saveVideosToDb } from "./crawl-db";

const SNAPSHOT_API = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
const MIN_WAIT_MS = 50;
const BATCH_LIMIT = 100;
const MAX_OFFSET = 30_000;
const INITIAL_OFFSET = 0;
const PAD_WIDTH = 2;
const MONTH_INCREMENT = 1;
const YEAR_INCREMENT = 1;
const FIRST_MONTH = 1;

// prettier-ignore
const RESPONSE_FIELDS = [
  "contentId", "title", "description", "userId",
  "viewCounter", "mylistCounter", "likeCounter", "lengthSeconds",
  "thumbnailUrl", "startTime", "lastResBody", "commentCounter",
  "lastCommentTime", "categoryTags", "tags", "genre",
].join(",");

interface SnapshotBatchResponse {
  meta: { status: number; totalCount: number; id: string };
  data?: VideoContent[];
}

const activeCrawls = new Map<string, Promise<VideoContent[]>>();

const wait = (ms: number): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const padTwo = (num: number) => String(num).padStart(PAD_WIDTH, "0");

const getMonthRange = (year: number, month: number): { start: string; end: string } => {
  const start = `${String(year)}-${padTwo(month)}-01T00:00:00+09:00`;
  let endYear = year;
  let endMonth = month + MONTH_INCREMENT;
  if (endMonth > MONTHS_PER_YEAR) {
    endMonth = FIRST_MONTH;
    endYear += YEAR_INCREMENT;
  }
  const end = `${String(endYear)}-${padTwo(endMonth)}-01T00:00:00+09:00`;
  return { start, end };
};

const isValidBatchResponse = (json: unknown): json is SnapshotBatchResponse => {
  if (typeof json !== "object" || json === null) {
    return false;
  }
  return "meta" in json;
};

const QUERY_PARAM_KEY = "q";

const buildBatchParams = (start: string, end: string, offset: number): URLSearchParams =>
  new URLSearchParams({
    [QUERY_PARAM_KEY]: "",
    targets: "title",
    fields: RESPONSE_FIELDS,
    _sort: "-startTime",
    _offset: String(offset),
    _limit: String(BATCH_LIMIT),
    _context: "nicolens-tagless",
    "filters[startTime][gte]": start,
    "filters[startTime][lt]": end,
  });

// Snapshot API returns null for missing fields, but VideoContent uses undefined.
// Normalize null tags to undefined so downstream filters work correctly.
const normalizeVideoTags = (video: VideoContent): VideoContent =>
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- runtime null from JSON despite TS type
  (video.tags as string | null | undefined) === null ? { ...video, tags: undefined } : video;

const parseBatchResponse = (json: unknown): { data: VideoContent[]; done: boolean } => {
  if (!isValidBatchResponse(json)) {
    throw new Error("Invalid batch response format");
  }
  const rawData = json.data ?? [];
  const data = rawData.map((video) => normalizeVideoTags(video));
  return { data, done: rawData.length < BATCH_LIMIT };
};

const fetchBatch = async (
  start: string,
  end: string,
  offset: number,
): Promise<{ data: VideoContent[]; done: boolean; elapsed: number }> => {
  const params = buildBatchParams(start, end, offset);
  const requestStart = Date.now();

  const response = await fetch(`${SNAPSHOT_API}?${params.toString()}`, {
    headers: { "User-Agent": "nicolens/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Snapshot API returned ${String(response.status)}`);
  }

  const json: unknown = await response.json();
  const elapsed = Date.now() - requestStart;

  return { ...parseBatchResponse(json), elapsed };
};

const filterTaglessVideos = (data: VideoContent[]): VideoContent[] =>
  data.filter((video) => video.tags === undefined || video.tags.trim() === "");

const waitForRateLimit = (lastElapsed: number): Promise<void> =>
  wait(Math.max(lastElapsed, MIN_WAIT_MS));

interface CrawlState {
  taglessVideos: VideoContent[];
  offset: number;
  lastElapsed: number;
}

const processCrawlBatch = async (
  start: string,
  end: string,
  crawlState: CrawlState,
): Promise<{ done: boolean }> => {
  if (crawlState.offset > INITIAL_OFFSET) {
    await waitForRateLimit(crawlState.lastElapsed);
  }

  const { data, done, elapsed } = await fetchBatch(start, end, crawlState.offset);
  crawlState.lastElapsed = elapsed;
  crawlState.taglessVideos.push(...filterTaglessVideos(data));
  crawlState.offset += BATCH_LIMIT;

  return { done: done || crawlState.offset >= MAX_OFFSET };
};

const executeCrawl = async (year: number, month: number): Promise<VideoContent[]> => {
  const { start, end } = getMonthRange(year, month);
  const crawlState: CrawlState = {
    taglessVideos: [],
    offset: INITIAL_OFFSET,
    lastElapsed: INITIAL_OFFSET,
  };

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const { done } = await processCrawlBatch(start, end, crawlState); // oxlint-disable-line no-await-in-loop
    if (done) {
      break;
    }
  }

  return crawlState.taglessVideos;
};

const parseMonth = (monthStr: string): { year: number; month: number } | undefined => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthStr);
  if (match === null) {
    return undefined;
  }
  const year = Number(match[FIRST_MONTH]);
  const monthNum = Number(match[PAD_WIDTH]);
  if (monthNum < FIRST_MONTH || monthNum > MONTHS_PER_YEAR) {
    return undefined;
  }
  return { year, month: monthNum };
};

const startCrawl = (
  monthStr: string,
  parsed: { year: number; month: number },
): Promise<VideoContent[]> => {
  const crawlPromise = (async () => {
    try {
      const videos = await executeCrawl(parsed.year, parsed.month);
      await saveVideosToDb(videos, monthStr);
      return videos;
    } finally {
      activeCrawls.delete(monthStr);
    }
  })();

  activeCrawls.set(monthStr, crawlPromise);
  return crawlPromise;
};

const awaitOrStartCrawl = async (
  monthStr: string,
  parsed: { year: number; month: number },
): Promise<void> => {
  const active = activeCrawls.get(monthStr);
  if (active !== undefined) {
    await active;
    return;
  }
  await startCrawl(monthStr, parsed);
};

export const ensureCrawled = async (monthStr: string): Promise<void> => {
  const parsed = parseMonth(monthStr);
  if (parsed === undefined) {
    throw new Error(`Invalid month format: ${monthStr}`);
  }

  const fresh = await isCrawlFresh(monthStr, getLatestSnapshotUpdate);
  if (fresh) {
    return;
  }

  await awaitOrStartCrawl(monthStr, parsed);
};
