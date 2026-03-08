import { eq } from "drizzle-orm";

import { getDb, taglessCrawlStatus, taglessVideos } from "@/shared/db";
import type { VideoContent } from "@/shared/types";

const DB_INSERT_BATCH_SIZE = 500;

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
