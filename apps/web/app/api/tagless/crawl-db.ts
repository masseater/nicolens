import { getDb, taglessCrawlStatus, taglessVideos } from "@nicolens/datastore";
import { eq, inArray, sql } from "drizzle-orm";

import type { VideoContent } from "@/shared/types";

const DB_INSERT_BATCH_SIZE = 500;
const DEFAULT_RETENTION_MONTHS = 6;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;
const BYTES_PER_MB = 1_048_576;
const STORAGE_WARN_MB = 400;
const NO_OLD_MONTHS = 0;
const FIRST_ROW_INDEX = 0;
const DEFAULT_SIZE = 0;

const videoToDbRow = (video: VideoContent, monthStr: string) => ({
  contentId: video.contentId,
  month: monthStr,
  title: video.title,
  description: video.description ?? null,
  userId: video.userId ?? null,
  channelId: video.channelId ?? null,
  viewCounter: video.viewCounter,
  mylistCounter: video.mylistCounter,
  likeCounter: video.likeCounter,
  lengthSeconds: video.lengthSeconds,
  thumbnailUrl: video.thumbnailUrl,
  startTime: video.startTime,
  lastResBody: video.lastResBody ?? null,
  commentCounter: video.commentCounter,
  lastCommentTime: video.lastCommentTime ?? null,
  categoryTags: video.categoryTags ?? null,
  tags: video.tags === undefined || video.tags.trim() === "" ? null : video.tags,
  genre: video.genre ?? null,
});

export const saveVideosToDb = async (videos: VideoContent[], monthStr: string): Promise<void> => {
  const db = getDb();

  await db.delete(taglessVideos).where(eq(taglessVideos.month, monthStr));

  for (let batchIndex = 0; batchIndex < videos.length; batchIndex += DB_INSERT_BATCH_SIZE) {
    const batch = videos.slice(batchIndex, batchIndex + DB_INSERT_BATCH_SIZE);
    const rows = batch.map((video) => videoToDbRow(video, monthStr));
    await db.insert(taglessVideos).values(rows); // oxlint-disable-line no-await-in-loop
  }

  await db
    .insert(taglessCrawlStatus)
    .values({
      month: monthStr,
      crawledAt: new Date().toISOString(),
      videoCount: videos.length,
    })
    .onConflictDoUpdate({
      target: taglessCrawlStatus.month,
      set: {
        crawledAt: new Date().toISOString(),
        videoCount: videos.length,
      },
    });

  await cleanupOldMonths();
  await checkStorageUsage();
};

const getRetentionCutoff = (): string => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - DEFAULT_RETENTION_MONTHS);
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}`;
};

const cleanupOldMonths = async (): Promise<void> => {
  const db = getDb();
  const cutoff = getRetentionCutoff();

  const allStatuses = await db.select({ month: taglessCrawlStatus.month }).from(taglessCrawlStatus);
  const oldMonths = allStatuses.map((row) => row.month).filter((month) => month < cutoff);

  if (oldMonths.length === NO_OLD_MONTHS) {
    return;
  }

  await db.delete(taglessVideos).where(inArray(taglessVideos.month, oldMonths));
  await db.delete(taglessCrawlStatus).where(inArray(taglessCrawlStatus.month, oldMonths));

  // oxlint-disable-next-line no-console -- intentional: cleanup log visible in Vercel logs
  console.info(
    `[crawl-db] Cleaned up ${String(oldMonths.length)} old month(s): ${oldMonths.join(", ")}`,
  );
};

const checkStorageUsage = async (): Promise<void> => {
  const db = getDb();
  const result = await db
    .select({ size: sql<number>`pg_database_size(current_database())` })
    .from(sql`(SELECT 1) as _dummy`);
  const sizeBytes = result[FIRST_ROW_INDEX]?.size ?? DEFAULT_SIZE;
  const sizeMb = sizeBytes / BYTES_PER_MB;

  if (sizeMb > STORAGE_WARN_MB) {
    // oxlint-disable-next-line no-console -- intentional: storage alert visible in Vercel logs
    console.warn(
      `[crawl-db] DB storage at ${String(Math.round(sizeMb))}MB — approaching Neon free tier limit (500MB)`,
    );
  }
};

const SINGLE_ROW_LIMIT = 1;

export const isCrawlFresh = async (
  monthStr: string,
  getLatestSnapshotUpdate: () => Date,
): Promise<boolean> => {
  const db = getDb();
  const result = await db
    .select()
    .from(taglessCrawlStatus)
    .where(eq(taglessCrawlStatus.month, monthStr))
    .limit(SINGLE_ROW_LIMIT);
  const [status] = result;
  if (status === undefined) {
    return false;
  }
  const latestUpdate = getLatestSnapshotUpdate();
  return new Date(status.crawledAt).getTime() >= latestUpdate.getTime();
};
