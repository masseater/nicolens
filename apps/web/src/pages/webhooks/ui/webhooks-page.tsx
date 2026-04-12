import { getDb, webhooks } from "@nicolens/datastore";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { type WebhookEntry, WebhookForm, WebhookList } from "@/features/webhook";

const loadWebhooks = async (userId: string): Promise<WebhookEntry[]> => {
  const db = getDb();
  const rows = await db
    .select({
      id: webhooks.id,
      name: webhooks.name,
      url: webhooks.url,
      format: webhooks.format,
    })
    .from(webhooks)
    .where(eq(webhooks.userId, userId))
    .orderBy(desc(webhooks.createdAt));
  return rows;
};

export const WebhooksPage = async () => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">ログインが必要です</p>
      </div>
    );
  }

  const rows = await loadWebhooks(session.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Webhook 管理</h1>
      <WebhookForm />
      <WebhookList webhooks={rows} />
    </div>
  );
};
