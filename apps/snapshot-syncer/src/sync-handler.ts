import { eq, lt } from "drizzle-orm";

import { getDb, tagTriggers, watchResults } from "@nicolens/datastore";
import {
  SnapshotApiError,
  searchSnapshot,
  type VideoContent,
} from "@nicolens/nicovideo-snapshot-api";

const LIMIT = 100;
const RETENTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;
const RATE_LIMIT_MS = 200;
const USER_AGENT = "nicolens-snapshot-syncer/1.0";

type Db = ReturnType<typeof getDb>;

const wait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

interface SyncResult {
  tagsProcessed: number;
  videosStored: number;
  errors: number;
}

interface SyncWindow {
  since: string;
  now: string;
}

interface WatchRow {
  tag: string;
  contentId: string;
  videoData: string;
  discoveredAt: string;
}

const fetchActiveTags = async (db: Db): Promise<string[]> => {
  const rows = await db
    .selectDistinct({ tag: tagTriggers.tag })
    .from(tagTriggers)
    .where(eq(tagTriggers.isActive, true));
  return rows.map((row) => row.tag);
};

const fetchVideosForTag = async (tag: string, since: string): Promise<VideoContent[]> => {
  const response = await searchSnapshot({
    query: tag,
    targets: "tagsExact",
    sort: "-startTime",
    limit: LIMIT,
    filters: { startTime: { gte: since } },
    context: "nicolens-snapshot-syncer",
    userAgent: USER_AGENT,
  });
  return response.data;
};

const buildRows = (tag: string, videos: VideoContent[], discoveredAt: string): WatchRow[] =>
  videos.map((video) => ({
    tag,
    contentId: video.contentId,
    videoData: JSON.stringify(video),
    discoveredAt,
  }));

const logSyncError = (tag: string, error: unknown): void => {
  if (error instanceof SnapshotApiError) {
    console.error(`[snapshot-syncer] Snapshot API error for tag "${tag}": ${error.errorCode}`);
  } else {
    console.error(`[snapshot-syncer] Error for tag "${tag}":`, error);
  }
};

const processTag = async (db: Db, tag: string, window: SyncWindow): Promise<number> => {
  const videos = await fetchVideosForTag(tag, window.since);
  if (videos.length === 0) {
    return 0;
  }
  const rows = buildRows(tag, videos, window.now);
  await db.insert(watchResults).values(rows).onConflictDoNothing();
  console.log(`[snapshot-syncer] tag "${tag}": ${String(videos.length)} videos stored`);
  return videos.length;
};

interface SyncContext {
  db: Db;
  window: SyncWindow;
  result: SyncResult;
}

const handleTag = async (ctx: SyncContext, tag: string): Promise<void> => {
  ctx.result.tagsProcessed++;
  try {
    ctx.result.videosStored += await processTag(ctx.db, tag, ctx.window);
  } catch (error) {
    logSyncError(tag, error);
    ctx.result.errors++;
  }
};

const processAllTags = async (ctx: SyncContext, tags: readonly string[]): Promise<void> => {
  for (const tag of tags) {
    await handleTag(ctx, tag);
    await wait(RATE_LIMIT_MS);
  }
};

const cleanupOldResults = async (db: Db): Promise<void> => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(watchResults).where(lt(watchResults.discoveredAt, cutoff));
};

const buildSyncWindow = (): SyncWindow => {
  const nowMs = Date.now();
  return {
    now: new Date(nowMs).toISOString(),
    since: new Date(nowMs - MS_PER_DAY).toISOString(),
  };
};

export const runSync = async (): Promise<SyncResult> => {
  const db = getDb();
  const window = buildSyncWindow();
  const result: SyncResult = { tagsProcessed: 0, videosStored: 0, errors: 0 };

  const tags = await fetchActiveTags(db);
  console.log(`[snapshot-syncer] Processing ${String(tags.length)} unique tags`);

  await processAllTags({ db, window, result }, tags);
  await cleanupOldResults(db);

  return result;
};
