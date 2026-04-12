import { getDb, tagTriggers, webhooks } from "@nicolens/datastore";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import {
  type TagTriggerEntry,
  TagWatchForm,
  TagWatchList,
  type WebhookOption,
} from "@/features/tag-watch";

const loadWebhookOptions = async (userId: string): Promise<WebhookOption[]> => {
  const db = getDb();
  const rows = await db
    .select({
      id: webhooks.id,
      name: webhooks.name,
    })
    .from(webhooks)
    .where(eq(webhooks.userId, userId))
    .orderBy(desc(webhooks.createdAt));
  return rows;
};

const loadTagTriggers = async (userId: string): Promise<TagTriggerEntry[]> => {
  const db = getDb();
  const rows = await db
    .select({
      id: tagTriggers.id,
      tag: tagTriggers.tag,
      webhookName: webhooks.name,
      isActive: tagTriggers.isActive,
      createdAt: tagTriggers.createdAt,
    })
    .from(tagTriggers)
    .innerJoin(webhooks, eq(tagTriggers.webhookId, webhooks.id))
    .where(eq(tagTriggers.userId, userId))
    .orderBy(desc(tagTriggers.createdAt));
  return rows;
};

export const WatchesPage = async () => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">ログインが必要です</p>
      </div>
    );
  }

  const [webhookOptions, triggers] = await Promise.all([
    loadWebhookOptions(session.user.id),
    loadTagTriggers(session.user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">タグ監視</h1>
      <TagWatchForm webhooks={webhookOptions} />
      <TagWatchList triggers={triggers} />
    </div>
  );
};
