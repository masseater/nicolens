import { and, eq, lt } from "drizzle-orm";

import { getDb, notificationLog, pendingNotifications, webhooks } from "@nicolens/datastore";

import { sendWebhook } from "./webhook-sender";

const RETENTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;

type Db = ReturnType<typeof getDb>;

interface PendingRow {
  id: string;
  webhookId: string;
  triggerType: string;
  triggerId: string;
  contentId: string;
  payload: string;
}

interface WebhookRow {
  id: string;
  url: string;
  format: string;
  isActive: boolean;
}

interface DispatchResult {
  pendingProcessed: number;
  delivered: number;
  failed: number;
  skipped: number;
}

interface DispatchContext {
  db: Db;
  now: string;
  result: DispatchResult;
}

const fetchPending = async (db: Db): Promise<PendingRow[]> => {
  const rows = await db
    .select({
      id: pendingNotifications.id,
      webhookId: pendingNotifications.webhookId,
      triggerType: pendingNotifications.triggerType,
      triggerId: pendingNotifications.triggerId,
      contentId: pendingNotifications.contentId,
      payload: pendingNotifications.payload,
    })
    .from(pendingNotifications);
  return rows;
};

const fetchWebhook = async (db: Db, webhookId: string): Promise<WebhookRow | undefined> => {
  const rows = await db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      format: webhooks.format,
      isActive: webhooks.isActive,
    })
    .from(webhooks)
    .where(eq(webhooks.id, webhookId))
    .limit(1);
  return rows[0];
};

const deletePending = async (db: Db, id: string): Promise<void> => {
  await db.delete(pendingNotifications).where(eq(pendingNotifications.id, id));
};

const recordLog = async (
  ctx: DispatchContext,
  pending: PendingRow,
  success: boolean,
): Promise<void> => {
  await ctx.db
    .insert(notificationLog)
    .values({
      id: crypto.randomUUID(),
      webhookId: pending.webhookId,
      triggerType: pending.triggerType,
      triggerId: pending.triggerId,
      contentId: pending.contentId,
      sentAt: ctx.now,
      success,
    })
    .onConflictDoNothing();
};

const isAlreadyLogged = async (db: Db, pending: PendingRow): Promise<boolean> => {
  const rows = await db
    .select({ id: notificationLog.id })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.triggerId, pending.triggerId),
        eq(notificationLog.contentId, pending.contentId),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

const dispatchPending = async (
  ctx: DispatchContext,
  pending: PendingRow,
  webhook: WebhookRow,
): Promise<void> => {
  const sendResult = await sendWebhook({
    url: webhook.url,
    format: webhook.format,
    payloadStr: pending.payload,
  });
  await recordLog(ctx, pending, sendResult.success);
  if (sendResult.success) {
    await deletePending(ctx.db, pending.id);
    ctx.result.delivered++;
    console.log(`[webhook-dispatcher] delivered ${pending.contentId} via webhook ${webhook.id}`);
  } else {
    ctx.result.failed++;
    console.warn(
      `[webhook-dispatcher] failed ${pending.contentId} via webhook ${webhook.id}; pending row retained for retry`,
    );
  }
};

const skipPending = async (ctx: DispatchContext, pending: PendingRow): Promise<void> => {
  await deletePending(ctx.db, pending.id);
  ctx.result.skipped++;
  console.log(
    `[webhook-dispatcher] skipped ${pending.contentId} (webhook ${pending.webhookId} missing or inactive)`,
  );
};

const tryDispatch = async (
  ctx: DispatchContext,
  pending: PendingRow,
  webhook: WebhookRow,
): Promise<void> => {
  try {
    await dispatchPending(ctx, pending, webhook);
  } catch (error) {
    ctx.result.failed++;
    console.error(`[webhook-dispatcher] error dispatching ${pending.id}:`, error);
  }
};

const skipDuplicate = async (ctx: DispatchContext, pending: PendingRow): Promise<void> => {
  await deletePending(ctx.db, pending.id);
  ctx.result.skipped++;
  console.log(
    `[webhook-dispatcher] skipped ${pending.contentId} (already logged for trigger ${pending.triggerId})`,
  );
};

const handlePending = async (ctx: DispatchContext, pending: PendingRow): Promise<void> => {
  ctx.result.pendingProcessed++;
  const webhook = await fetchWebhook(ctx.db, pending.webhookId);
  if (webhook === undefined || !webhook.isActive) {
    await skipPending(ctx, pending);
    return;
  }
  if (await isAlreadyLogged(ctx.db, pending)) {
    await skipDuplicate(ctx, pending);
    return;
  }
  await tryDispatch(ctx, pending, webhook);
};

const processAllPending = async (
  ctx: DispatchContext,
  rows: readonly PendingRow[],
): Promise<void> => {
  for (const pending of rows) {
    await handlePending(ctx, pending);
  }
};

const cleanupOldLogs = async (db: Db): Promise<void> => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(notificationLog).where(lt(notificationLog.sentAt, cutoff));
};

export const runDispatch = async (): Promise<DispatchResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: DispatchResult = {
    pendingProcessed: 0,
    delivered: 0,
    failed: 0,
    skipped: 0,
  };

  const pending = await fetchPending(db);
  console.log(`[webhook-dispatcher] Processing ${String(pending.length)} pending notifications`);

  await processAllPending({ db, now, result }, pending);
  await cleanupOldLogs(db);

  return result;
};
