import { and, eq, notInArray } from "drizzle-orm";

import {
  getDb,
  notificationLog,
  pendingNotifications,
  tagTriggers,
  watchResults,
} from "@nicolens/datastore";

type Db = ReturnType<typeof getDb>;

interface VideoContent {
  contentId: string;
  title: string;
  thumbnailUrl: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  startTime: string;
}

interface TagTriggerRow {
  id: string;
  tag: string;
  webhookId: string;
}

interface WatchRow {
  contentId: string;
  videoData: string;
}

interface PayloadVideo {
  contentId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  startTime: string;
}

interface NotificationPayload {
  trigger: { type: "tag"; tag: string };
  videos: PayloadVideo[];
  totalNew: number;
}

interface PendingRow {
  id: string;
  webhookId: string;
  triggerType: string;
  triggerId: string;
  contentId: string;
  payload: string;
  createdAt: string;
}

interface ScanResult {
  triggersProcessed: number;
  pendingCreated: number;
  errors: number;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toVideoContent = (value: unknown): VideoContent | undefined => {
  if (!isObject(value)) {
    return undefined;
  }
  const { contentId, title, thumbnailUrl, viewCounter, likeCounter, commentCounter, startTime } =
    value;
  if (
    typeof contentId !== "string" ||
    typeof title !== "string" ||
    typeof thumbnailUrl !== "string" ||
    typeof viewCounter !== "number" ||
    typeof likeCounter !== "number" ||
    typeof commentCounter !== "number" ||
    typeof startTime !== "string"
  ) {
    return undefined;
  }
  return {
    contentId,
    title,
    thumbnailUrl,
    viewCounter,
    likeCounter,
    commentCounter,
    startTime,
  };
};

const parseVideoData = (raw: string): VideoContent | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return toVideoContent(parsed);
  } catch {
    return undefined;
  }
};

const fetchActiveTriggers = async (db: Db): Promise<TagTriggerRow[]> => {
  const rows = await db
    .select({
      id: tagTriggers.id,
      tag: tagTriggers.tag,
      webhookId: tagTriggers.webhookId,
    })
    .from(tagTriggers)
    .where(eq(tagTriggers.isActive, true));
  return rows;
};

const fetchNotifiedIds = async (db: Db, triggerId: string): Promise<string[]> => {
  const rows = await db
    .select({ contentId: notificationLog.contentId })
    .from(notificationLog)
    .where(eq(notificationLog.triggerId, triggerId));
  return rows.map((row) => row.contentId);
};

const fetchPendingIds = async (db: Db, triggerId: string): Promise<string[]> => {
  const rows = await db
    .select({ contentId: pendingNotifications.contentId })
    .from(pendingNotifications)
    .where(eq(pendingNotifications.triggerId, triggerId));
  return rows.map((row) => row.contentId);
};

const dedupeIds = (notified: readonly string[], pending: readonly string[]): string[] => {
  const set = new Set<string>(notified);
  for (const id of pending) {
    set.add(id);
  }
  return [...set];
};

const fetchUnnotifiedResults = async (
  db: Db,
  tag: string,
  excludedIds: readonly string[],
): Promise<WatchRow[]> => {
  const condition =
    excludedIds.length > 0
      ? and(eq(watchResults.tag, tag), notInArray(watchResults.contentId, [...excludedIds]))
      : eq(watchResults.tag, tag);
  const rows = await db
    .select({
      contentId: watchResults.contentId,
      videoData: watchResults.videoData,
    })
    .from(watchResults)
    .where(condition);
  return rows;
};

const parseVideosFromResults = (rows: readonly WatchRow[]): VideoContent[] => {
  const videos: VideoContent[] = [];
  for (const row of rows) {
    const video = parseVideoData(row.videoData);
    if (video !== undefined) {
      videos.push(video);
    }
  }
  return videos;
};

const toPayloadVideo = (video: VideoContent): PayloadVideo => ({
  contentId: video.contentId,
  title: video.title,
  url: `https://nico.ms/${video.contentId}`,
  thumbnailUrl: video.thumbnailUrl,
  viewCounter: video.viewCounter,
  likeCounter: video.likeCounter,
  commentCounter: video.commentCounter,
  startTime: video.startTime,
});

const buildPayload = (tag: string, videos: readonly VideoContent[]): NotificationPayload => ({
  trigger: { type: "tag", tag },
  videos: videos.map((video) => toPayloadVideo(video)),
  totalNew: videos.length,
});

interface PendingRowParams {
  trigger: TagTriggerRow;
  payloadJson: string;
  createdAt: string;
}

const buildPendingRows = (
  videos: readonly VideoContent[],
  params: PendingRowParams,
): PendingRow[] =>
  videos.map((video) => ({
    id: crypto.randomUUID(),
    webhookId: params.trigger.webhookId,
    triggerType: "tag",
    triggerId: params.trigger.id,
    contentId: video.contentId,
    payload: params.payloadJson,
    createdAt: params.createdAt,
  }));

interface ScanContext {
  db: Db;
  now: string;
  result: ScanResult;
}

const collectNewVideos = async (
  ctx: ScanContext,
  trigger: TagTriggerRow,
): Promise<VideoContent[]> => {
  const notifiedIds = await fetchNotifiedIds(ctx.db, trigger.id);
  const pendingIds = await fetchPendingIds(ctx.db, trigger.id);
  const excludedIds = dedupeIds(notifiedIds, pendingIds);
  const unnotifiedResults = await fetchUnnotifiedResults(ctx.db, trigger.tag, excludedIds);
  if (unnotifiedResults.length === 0) {
    return [];
  }
  return parseVideosFromResults(unnotifiedResults);
};

const insertPending = async (
  ctx: ScanContext,
  trigger: TagTriggerRow,
  videos: readonly VideoContent[],
): Promise<void> => {
  const payload = buildPayload(trigger.tag, videos);
  const pendingRows = buildPendingRows(videos, {
    trigger,
    payloadJson: JSON.stringify(payload),
    createdAt: ctx.now,
  });
  await ctx.db.insert(pendingNotifications).values(pendingRows);
  ctx.result.pendingCreated += pendingRows.length;
  console.log(
    `[tag-scanner] trigger ${trigger.id} (#${trigger.tag}): ${String(videos.length)} pending`,
  );
};

const processTrigger = async (ctx: ScanContext, trigger: TagTriggerRow): Promise<void> => {
  const videos = await collectNewVideos(ctx, trigger);
  if (videos.length === 0) {
    return;
  }
  await insertPending(ctx, trigger, videos);
};

const handleTrigger = async (ctx: ScanContext, trigger: TagTriggerRow): Promise<void> => {
  ctx.result.triggersProcessed++;
  try {
    await processTrigger(ctx, trigger);
  } catch (error) {
    console.error(`[tag-scanner] Error for trigger ${trigger.id}:`, error);
    ctx.result.errors++;
  }
};

const processAllTriggers = async (
  ctx: ScanContext,
  triggers: readonly TagTriggerRow[],
): Promise<void> => {
  for (const trigger of triggers) {
    await handleTrigger(ctx, trigger);
  }
};

export const runScan = async (): Promise<ScanResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: ScanResult = { triggersProcessed: 0, pendingCreated: 0, errors: 0 };

  const triggers = await fetchActiveTriggers(db);
  console.log(`[tag-scanner] Processing ${String(triggers.length)} triggers`);

  await processAllTriggers({ db, now, result }, triggers);

  return result;
};
