import { getDb, videoEmbeddings } from "@nicolens/datastore";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { generateDocumentEmbedding } from "@/shared/lib/embedding";
import { recordUsage } from "@/shared/lib/usage-monitor";
import type { VideoContent } from "@/shared/types";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_SERVICE_UNAVAILABLE = 503;
const RATE_LIMIT_MS = 100;
const EXISTING_CHECK_LIMIT = 1;
const NO_EXISTING = 0;
const INITIAL_COUNTER = 0;

interface EmbedRequest {
  videos: VideoContent[];
}

const isEmbedRequest = (value: unknown): value is EmbedRequest => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("videos" in value)) {
    return false;
  }
  const record = value as Record<string, unknown>; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
  return Array.isArray(record["videos"]);
};

const wait = (ms: number) =>
  // oxlint-disable-next-line promise/avoid-new -- setTimeout requires native Promise constructor
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const embedAndStore = async (video: VideoContent): Promise<void> => {
  const db = getDb();

  const existing = await db
    .select({ contentId: videoEmbeddings.contentId })
    .from(videoEmbeddings)
    .where(eq(videoEmbeddings.contentId, video.contentId))
    .limit(EXISTING_CHECK_LIMIT);

  if (existing.length > NO_EXISTING) {
    return;
  }

  const usage = recordUsage();
  if (!usage.allowed) {
    return;
  }

  const embedding = await generateDocumentEmbedding({
    title: video.title,
    tags: video.tags,
    genre: video.genre,
    description: video.description,
  });

  await db
    .insert(videoEmbeddings)
    .values({
      contentId: video.contentId,
      title: video.title,
      description: video.description ?? null,
      tags: video.tags ?? null,
      genre: video.genre ?? null,
      thumbnailUrl: video.thumbnailUrl,
      viewCounter: video.viewCounter,
      mylistCounter: video.mylistCounter,
      likeCounter: video.likeCounter,
      commentCounter: video.commentCounter,
      lengthSeconds: video.lengthSeconds,
      startTime: video.startTime,
      embedding,
      embeddedAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
};

const processVideoBatch = async (
  videos: VideoContent[],
): Promise<{ embedded: number; skipped: number }> => {
  let embedded = INITIAL_COUNTER;
  let skipped = INITIAL_COUNTER;

  for (const video of videos) {
    try {
      await embedAndStore(video); // oxlint-disable-line no-await-in-loop -- sequential to respect rate limit
      embedded++;
      await wait(RATE_LIMIT_MS); // oxlint-disable-line no-await-in-loop -- intentional throttling
    } catch {
      skipped++;
    }
  }

  return { embedded, skipped };
};

export const POST = async (request: NextRequest) => {
  try {
    const body: unknown = await request.json();
    if (!isEmbedRequest(body)) {
      return NextResponse.json(
        { error: "Invalid request: expected { videos: VideoContent[] }" },
        { status: HTTP_BAD_REQUEST },
      );
    }

    const preCheck = recordUsage();
    if (!preCheck.allowed) {
      return NextResponse.json(
        { error: "API利用制限に達しました。明日再度お試しください。" },
        { status: HTTP_SERVICE_UNAVAILABLE },
      );
    }

    const result = await processVideoBatch(body.videos);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to process embedding request" },
      { status: HTTP_INTERNAL_ERROR },
    );
  }
};
