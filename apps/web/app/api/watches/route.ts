import { getDb, tagTriggers, webhooks } from "@nicolens/datastore";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;
const NO_ROWS = 0;
const QUERY_LIMIT = 1;

interface CreateTriggerInput {
  tag: string;
  webhookId: string;
}

const buildInputFromRecord = (record: Record<string, unknown>): CreateTriggerInput | undefined => {
  const rawTag = record["tag"];
  const rawWebhookId = record["webhookId"];
  if (typeof rawTag !== "string" || typeof rawWebhookId !== "string") {
    return undefined;
  }
  const tag = rawTag.trim();
  const webhookId = rawWebhookId.trim();
  if (tag === "" || webhookId === "") {
    return undefined;
  }
  return { tag, webhookId };
};

const parseCreateTriggerInput = (value: unknown): CreateTriggerInput | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- safe after object check
  return buildInputFromRecord(record);
};

const isWebhookOwnedByUser = async (webhookId: string, userId: string): Promise<boolean> => {
  const db = getDb();
  const rows = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, userId)))
    .limit(QUERY_LIMIT);
  return rows.length > NO_ROWS;
};

const insertTagTrigger = async (userId: string, input: CreateTriggerInput): Promise<string> => {
  const id = crypto.randomUUID();
  const db = getDb();
  await db
    .insert(tagTriggers)
    .values({
      id,
      userId,
      tag: input.tag,
      webhookId: input.webhookId,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
  return id;
};

export const GET = async () => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: tagTriggers.id,
      tag: tagTriggers.tag,
      webhookId: tagTriggers.webhookId,
      webhookName: webhooks.name,
      isActive: tagTriggers.isActive,
      createdAt: tagTriggers.createdAt,
    })
    .from(tagTriggers)
    .innerJoin(webhooks, eq(tagTriggers.webhookId, webhooks.id))
    .where(eq(tagTriggers.userId, session.user.id))
    .orderBy(desc(tagTriggers.createdAt));

  return NextResponse.json({ triggers: rows });
};

const createTriggerForUser = async (userId: string, body: unknown): Promise<NextResponse> => {
  const input = parseCreateTriggerInput(body);
  if (input === undefined) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }
  const owned = await isWebhookOwnedByUser(input.webhookId, userId);
  if (!owned) {
    return NextResponse.json({ error: "Webhook not found" }, { status: HTTP_BAD_REQUEST });
  }
  const id = await insertTagTrigger(userId, input);
  return NextResponse.json({ id });
};

export const POST = async (request: NextRequest) => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }
  const body: unknown = await request.json().catch(() => null);
  return createTriggerForUser(session.user.id, body);
};
