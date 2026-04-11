# Watch & Webhook Implementation Plan (v2 — Microservices)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snapshot API の日次更新を監視し、ユーザー定義の検索条件に合致する新着動画を webhook で通知する。clone と notify を独立したマイクロサービスとしてモノレポ内に構成し、GitHub Actions で実行する。

**Architecture:** DB 層を `packages/db` に抽出し、3つのアプリ (`apps/web`, `apps/clone`, `apps/notify`) が共有する。clone は Snapshot API → DB、notify は DB → webhook。GitHub Actions の `needs` で clone → notify の順序を保証。

**Tech Stack:** Turborepo, Drizzle ORM (PostgreSQL/Neon), GitHub Actions, tsx, Vitest

---

## File Map

### New Packages/Apps

| Path | Responsibility |
|------|---------------|
| `packages/db/` | 共有 DB schema + connection (apps/web から抽出) |
| `apps/clone/` | Snapshot API から動画データを取得して DB に保存 |
| `apps/notify/` | DB の結果を評価して webhook を送信 |

### New Files in apps/web

| Path | Responsibility |
|------|---------------|
| `apps/web/app/api/watch/route.ts` | POST: 条件作成 |
| `apps/web/app/api/watch/[token]/route.ts` | GET/PATCH/DELETE: 条件管理 |
| `apps/web/app/watch/[token]/page.tsx` | 管理ページ |
| `apps/web/src/features/watch/ui/watch-button.tsx` | Watch ボタン |
| `apps/web/src/features/watch/index.ts` | barrel |
| `apps/web/src/pages/watch/ui/watch-page.tsx` | ページ構成 |
| `apps/web/src/pages/watch/index.ts` | barrel |

### New Workflow

| Path | Responsibility |
|------|---------------|
| `.github/workflows/watch.yml` | Daily cron: clone → notify |

### Deleted Files

| Path | Reason |
|------|--------|
| `apps/web/src/shared/db/schema.ts` | `packages/db` に移動 |
| `apps/web/src/shared/db/connection.ts` | `packages/db` に移動 |
| `apps/web/src/shared/db/index.ts` | `packages/db` に移動。re-export は作らない |
| `apps/web/drizzle.config.ts` | `packages/db` に移動 |

### Modified Files

| Path | Change |
|------|--------|
| `apps/web/package.json` | `@nicolens/db` dependency 追加、db:* scripts を packages/db に委譲 |
| `apps/web/app/api/tagless/tagless-filters.ts` | `@/shared/db` → `@nicolens/db` |
| `apps/web/app/api/tagless/route.ts` | `@/shared/db` → `@nicolens/db` |
| `apps/web/app/api/tagless/crawl-db.ts` | `@/shared/db` → `@nicolens/db` |
| `apps/web/app/api/tagless/route.test.ts` | `@/shared/db` → `@nicolens/db` |
| `apps/web/app/api/semantic-search/route.ts` | `@/shared/db` → `@nicolens/db` |
| `apps/web/app/api/embed/route.ts` | `@/shared/db` → `@nicolens/db` |
| `apps/web/src/pages/search/ui/search-page.tsx` | WatchButton 追加 |
| `turbo.json` | clone, notify の task 追加 |

---

### Task 1: Extract packages/db

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/schema.ts` (moved from `apps/web/src/shared/db/schema.ts`)
- Create: `packages/db/src/connection.ts` (moved from `apps/web/src/shared/db/connection.ts`)
- Create: `packages/db/src/index.ts`
- Create: `packages/db/drizzle.config.ts` (moved from `apps/web/drizzle.config.ts`)
- Delete: `apps/web/src/shared/db/` (ディレクトリごと削除)
- Delete: `apps/web/drizzle.config.ts`
- Modify: `apps/web/package.json` — `@nicolens/db` dep 追加、db:* scripts 変更
- Modify: 6 files — `@/shared/db` → `@nicolens/db` にインポート変更

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@nicolens/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "postgres": "^3.4.8"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "drizzle-kit": "^0.31.9",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create packages/db/tsconfig.json**

```json
{
  "extends": "@nicolens/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Move schema.ts to packages/db/src/schema.ts**

Copy `apps/web/src/shared/db/schema.ts` to `packages/db/src/schema.ts`. Content is identical — this is a move, not a modification. Also add the new watch tables (see Task 2).

- [ ] **Step 4: Move connection.ts to packages/db/src/connection.ts**

Copy `apps/web/src/shared/db/connection.ts` to `packages/db/src/connection.ts`. Content is identical.

- [ ] **Step 5: Create packages/db/src/index.ts**

```typescript
export { getDb } from "./connection";
export {
  taglessCrawlStatus,
  taglessVideos,
  videoEmbeddings,
} from "./schema";
```

(watch tables will be added in Task 2)

- [ ] **Step 6: Move drizzle.config.ts**

Copy `apps/web/drizzle.config.ts` to `packages/db/drizzle.config.ts`. Update the schema path:

```typescript
import { defineConfig } from "drizzle-kit";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"]!,
  },
});
```

- [ ] **Step 7: Delete apps/web/src/shared/db/ entirely**

```bash
rm -rf apps/web/src/shared/db/
rm apps/web/drizzle.config.ts
```

- [ ] **Step 8: Add @nicolens/db to apps/web/package.json**

Add to `dependencies`:
```json
"@nicolens/db": "workspace:*"
```

Update db scripts to delegate to packages/db:
```json
"db:generate": "pnpm --filter @nicolens/db db:generate",
"db:migrate": "pnpm --filter @nicolens/db db:migrate",
"db:push": "pnpm --filter @nicolens/db db:push",
"db:studio": "pnpm --filter @nicolens/db db:studio"
```

Remove `drizzle-kit` from `apps/web/devDependencies` (now in `packages/db`).

- [ ] **Step 9: Update all imports from @/shared/db to @nicolens/db**

6 files to update. In each file, replace the import:

`apps/web/app/api/tagless/tagless-filters.ts`:
```typescript
// before: import { taglessVideos } from "@/shared/db";
import { taglessVideos } from "@nicolens/db";
```

`apps/web/app/api/tagless/route.ts`:
```typescript
// before: import { getDb, taglessVideos } from "@/shared/db";
import { getDb, taglessVideos } from "@nicolens/db";
```

`apps/web/app/api/tagless/crawl-db.ts`:
```typescript
// before: import { getDb, taglessCrawlStatus, taglessVideos } from "@/shared/db";
import { getDb, taglessCrawlStatus, taglessVideos } from "@nicolens/db";
```

`apps/web/app/api/tagless/route.test.ts`:
```typescript
// before: import { getDb } from "@/shared/db";
import { getDb } from "@nicolens/db";
// Also update vi.mock path: vi.mock("@nicolens/db", ...)
```

`apps/web/app/api/semantic-search/route.ts`:
```typescript
// before: import { getDb, videoEmbeddings } from "@/shared/db";
import { getDb, videoEmbeddings } from "@nicolens/db";
```

`apps/web/app/api/embed/route.ts`:
```typescript
// before: import { getDb, videoEmbeddings } from "@/shared/db";
import { getDb, videoEmbeddings } from "@nicolens/db";
```

- [ ] **Step 10: Install and verify**

Run: `pnpm install`
Run: `pnpm typecheck`
Expected: No errors. All imports resolve to `@nicolens/db`.

- [ ] **Step 11: Verify DB operations**

Run: `pnpm --filter @nicolens/db db:push`
Expected: No schema changes (tables already exist).

- [ ] **Step 12: Commit**

```bash
git add packages/db/ apps/web/ pnpm-lock.yaml
git commit -m "refactor: extract database layer to packages/db, remove apps/web/src/shared/db"
```

---

### Task 2: Add Watch Tables to Schema

**Files:**
- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Add watch tables to schema**

Add to `packages/db/src/schema.ts` imports:

```typescript
import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, vector } from "drizzle-orm/pg-core";
```

Add at the end of the file:

```typescript
export const watchConditions = pgTable(
  "watch_conditions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    label: text("label").notNull(),
    query: text("query").notNull(),
    targets: text("targets").notNull(),
    filtersJson: text("filters_json"),
    webhookUrl: text("webhook_url").notNull(),
    webhookFormat: text("webhook_format").notNull(),
    isActive: boolean("is_active").notNull(),
    lastClonedAt: timestamp("last_cloned_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [uniqueIndex("idx_watch_conditions_token").on(table.token)],
);

export const watchResults = pgTable(
  "watch_results",
  {
    conditionId: text("condition_id")
      .notNull()
      .references(() => watchConditions.id, { onDelete: "cascade" }),
    contentId: text("content_id").notNull(),
    videoData: text("video_data").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conditionId, table.contentId] }),
    index("idx_watch_results_discovered_at").on(table.discoveredAt),
  ],
);

export const watchNotifications = pgTable(
  "watch_notifications",
  {
    id: text("id").primaryKey(),
    conditionId: text("condition_id")
      .notNull()
      .references(() => watchConditions.id, { onDelete: "cascade" }),
    contentId: text("content_id").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_watch_notifs_unique").on(table.conditionId, table.contentId),
    index("idx_watch_notifs_notified_at").on(table.notifiedAt),
  ],
);
```

- [ ] **Step 2: Update packages/db/src/index.ts**

```typescript
export { getDb } from "./connection";
export {
  taglessCrawlStatus,
  taglessVideos,
  videoEmbeddings,
  watchConditions,
  watchNotifications,
  watchResults,
} from "./schema";
```

- [ ] **Step 3: Push schema**

Run: `pnpm --filter @nicolens/db db:push`
Expected: 3 new tables created.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/src/index.ts
git commit -m "feat(db): add watch_conditions, watch_results, watch_notifications tables"
```

---

### Task 3: Create apps/clone

**Files:**
- Create: `apps/clone/package.json`
- Create: `apps/clone/tsconfig.json`
- Create: `apps/clone/src/clone-handler.ts`
- Create: `apps/clone/src/index.ts`

- [ ] **Step 1: Create apps/clone/package.json**

```json
{
  "name": "@nicolens/clone",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nicolens/db": "workspace:*",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "tsx": "^4.19.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create apps/clone/tsconfig.json**

```json
{
  "extends": "@nicolens/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Implement clone-handler.ts**

`apps/clone/src/clone-handler.ts`:

```typescript
import { eq, lt } from "drizzle-orm";

import { getDb, watchConditions, watchResults } from "@nicolens/db";

const SNAPSHOT_API = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
const SNAPSHOT_FIELDS =
  "contentId,title,description,userId,channelId,viewCounter,mylistCounter,likeCounter,lengthSeconds,thumbnailUrl,startTime,lastResBody,commentCounter,lastCommentTime,categoryTags,tags,genre";
const SNAPSHOT_LIMIT = 100;
const RETENTION_DAYS = 90;
const MS_PER_DAY = 86400000;
const RATE_LIMIT_MS = 200;

interface SnapshotVideo {
  contentId: string;
  [key: string]: unknown;
}

interface SnapshotApiResponse {
  meta: { status: number; totalCount: number };
  data: SnapshotVideo[];
}

const isSnapshotResponse = (value: unknown): value is SnapshotApiResponse =>
  typeof value === "object" &&
  value !== null &&
  "data" in value &&
  Array.isArray((value as SnapshotApiResponse).data);

const wait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const buildSnapshotUrl = (
  query: string,
  targets: string,
  filtersJson: string | null,
  since: string,
): string => {
  const params = new URLSearchParams({
    q: query,
    targets,
    fields: SNAPSHOT_FIELDS,
    _sort: "-startTime",
    _limit: String(SNAPSHOT_LIMIT),
    _context: "nicolens-watch",
  });

  params.set("filters[startTime][gte]", since);

  if (filtersJson !== null && filtersJson !== "") {
    try {
      const filters = JSON.parse(filtersJson) as Record<string, Record<string, string>>;
      for (const [field, ops] of Object.entries(filters)) {
        if (field === "startTime") {
          continue;
        }
        for (const [op, val] of Object.entries(ops)) {
          params.set(`filters[${field}][${op}]`, val);
        }
      }
    } catch {
      // skip invalid JSON
    }
  }

  return `${SNAPSHOT_API}?${params.toString()}`;
};

interface CloneResult {
  processed: number;
  videosStored: number;
  errors: number;
}

export const runClone = async (): Promise<CloneResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: CloneResult = { processed: 0, videosStored: 0, errors: 0 };

  const conditions = await db
    .select()
    .from(watchConditions)
    .where(eq(watchConditions.isActive, true));

  console.log(`[clone] Processing ${String(conditions.length)} conditions`);

  for (const condition of conditions) {
    result.processed++;

    try {
      const since = condition.lastClonedAt ?? new Date(Date.now() - MS_PER_DAY).toISOString();
      const url = buildSnapshotUrl(condition.query, condition.targets, condition.filtersJson, since);

      const response = await fetch(url, {
        headers: { "User-Agent": "nicolens-clone/1.0" },
      });

      if (!response.ok) {
        console.error(`[clone] API error for condition ${condition.id}: ${String(response.status)}`);
        result.errors++;
        await wait(RATE_LIMIT_MS);
        continue;
      }

      const json: unknown = await response.json();
      if (!isSnapshotResponse(json)) {
        result.errors++;
        await wait(RATE_LIMIT_MS);
        continue;
      }

      if (json.data.length > 0) {
        const rows = json.data.map((video) => ({
          conditionId: condition.id,
          contentId: video.contentId,
          videoData: JSON.stringify(video),
          discoveredAt: now,
        }));

        await db.insert(watchResults).values(rows).onConflictDoNothing();
        result.videosStored += json.data.length;
        console.log(`[clone] ${condition.label}: ${String(json.data.length)} videos stored`);
      }

      await db
        .update(watchConditions)
        .set({ lastClonedAt: now })
        .where(eq(watchConditions.id, condition.id));
    } catch (error) {
      console.error(`[clone] Error for condition ${condition.id}:`, error);
      result.errors++;
    }

    await wait(RATE_LIMIT_MS);
  }

  // Cleanup old results
  const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(watchResults).where(lt(watchResults.discoveredAt, cutoff));

  return result;
};
```

- [ ] **Step 4: Implement index.ts entry point**

`apps/clone/src/index.ts`:

```typescript
import { runClone } from "./clone-handler";

const main = async () => {
  console.log("[clone] Starting snapshot clone...");
  const result = await runClone();
  console.log("[clone] Complete:", JSON.stringify(result));

  if (result.errors > 0) {
    process.exitCode = 1;
  }
};

void main();
```

- [ ] **Step 5: Install and verify**

Run: `pnpm install`
Run: `pnpm --filter @nicolens/clone typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/clone/
git commit -m "feat: add apps/clone snapshot clone service"
```

---

### Task 4: Create apps/notify

**Files:**
- Create: `apps/notify/package.json`
- Create: `apps/notify/tsconfig.json`
- Create: `apps/notify/src/url-validator.ts`
- Create: `apps/notify/src/url-validator.test.ts`
- Create: `apps/notify/src/webhook-formats.ts`
- Create: `apps/notify/src/webhook-formats.test.ts`
- Create: `apps/notify/src/webhook-sender.ts`
- Create: `apps/notify/src/notify-handler.ts`
- Create: `apps/notify/src/index.ts`

- [ ] **Step 1: Create apps/notify/package.json**

```json
{
  "name": "@nicolens/notify",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nicolens/db": "workspace:*",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "tsx": "^4.19.0",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Create apps/notify/tsconfig.json**

```json
{
  "extends": "@nicolens/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Implement url-validator.ts with tests**

`apps/notify/src/url-validator.ts`:

```typescript
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "[::1]"]);

const isPrivateIp = (hostname: string): boolean => {
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true;
  }
  if (hostname.startsWith("127.")) {
    return true;
  }
  if (hostname.startsWith("10.")) {
    return true;
  }
  if (hostname.startsWith("192.168.")) {
    return true;
  }
  return /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
};

export const validateWebhookUrl = (url: string): boolean => {
  if (url === "") {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  return !isPrivateIp(parsed.hostname);
};
```

`apps/notify/src/url-validator.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { validateWebhookUrl } from "./url-validator";

describe("validateWebhookUrl", () => {
  it("accepts valid https URL", () => {
    expect(validateWebhookUrl("https://discord.com/api/webhooks/123/abc")).toBe(true);
  });

  it("rejects http URL", () => {
    expect(validateWebhookUrl("http://example.com/webhook")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateWebhookUrl("")).toBe(false);
  });

  it("rejects localhost", () => {
    expect(validateWebhookUrl("https://localhost/webhook")).toBe(false);
  });

  it("rejects private IPs", () => {
    expect(validateWebhookUrl("https://10.0.0.1/webhook")).toBe(false);
    expect(validateWebhookUrl("https://172.16.0.1/webhook")).toBe(false);
    expect(validateWebhookUrl("https://192.168.1.1/webhook")).toBe(false);
    expect(validateWebhookUrl("https://127.0.0.1/webhook")).toBe(false);
  });
});
```

- [ ] **Step 4: Implement webhook-formats.ts with tests**

`apps/notify/src/webhook-formats.ts`:

```typescript
interface VideoContent {
  contentId: string;
  title: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  thumbnailUrl: string;
  startTime: string;
  [key: string]: unknown;
}

interface ConditionInfo {
  id: string;
  label: string;
  query: string;
}

interface GenericPayload {
  condition: ConditionInfo;
  videos: VideoContent[];
  checkedAt: string;
  totalNew: number;
}

interface DiscordEmbed {
  title: string;
  url: string;
  thumbnail?: { url: string };
  fields: { name: string; value: string; inline: boolean }[];
  timestamp: string;
}

interface DiscordPayload {
  content: string;
  embeds: DiscordEmbed[];
}

const DISCORD_MAX_EMBEDS = 10;

const formatCount = (n: number): string => n.toLocaleString("ja-JP");

export const buildGenericPayload = (
  condition: ConditionInfo,
  videos: VideoContent[],
  checkedAt: string,
): GenericPayload => ({
  condition,
  videos,
  checkedAt,
  totalNew: videos.length,
});

const videoToEmbed = (video: VideoContent): DiscordEmbed => ({
  title: video.title,
  url: `https://nico.ms/${video.contentId}`,
  thumbnail: video.thumbnailUrl ? { url: video.thumbnailUrl } : undefined,
  fields: [
    { name: "再生", value: formatCount(video.viewCounter), inline: true },
    { name: "いいね", value: formatCount(video.likeCounter), inline: true },
    { name: "コメント", value: formatCount(video.commentCounter), inline: true },
  ],
  timestamp: video.startTime,
});

export const buildDiscordPayload = (
  condition: ConditionInfo,
  videos: VideoContent[],
): DiscordPayload => ({
  content: `**${condition.label}** - ${String(videos.length)}件の新着動画`,
  embeds: videos.slice(0, DISCORD_MAX_EMBEDS).map(videoToEmbed),
});
```

`apps/notify/src/webhook-formats.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildDiscordPayload, buildGenericPayload } from "./webhook-formats";

const makeVideo = (overrides = {}) => ({
  contentId: "sm12345",
  title: "Test Video",
  viewCounter: 1000,
  likeCounter: 100,
  commentCounter: 30,
  thumbnailUrl: "https://img.example.com/thumb.jpg",
  startTime: "2026-04-11T10:00:00+09:00",
  ...overrides,
});

const condition = { id: "c1", label: "VOCALOID新着", query: "VOCALOID" };

describe("buildGenericPayload", () => {
  it("builds correct structure", () => {
    const result = buildGenericPayload(condition, [makeVideo()], "2026-04-11T05:10:00Z");
    expect(result.totalNew).toBe(1);
    expect(result.condition.label).toBe("VOCALOID新着");
  });
});

describe("buildDiscordPayload", () => {
  it("builds embeds with video info", () => {
    const result = buildDiscordPayload(condition, [makeVideo()]);
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0].url).toBe("https://nico.ms/sm12345");
  });

  it("limits to 10 embeds", () => {
    const videos = Array.from({ length: 15 }, (_, i) =>
      makeVideo({ contentId: `sm${String(i)}` }),
    );
    const result = buildDiscordPayload(condition, videos);
    expect(result.embeds).toHaveLength(10);
  });
});
```

- [ ] **Step 5: Implement webhook-sender.ts**

`apps/notify/src/webhook-sender.ts`:

```typescript
import { buildDiscordPayload, buildGenericPayload } from "./webhook-formats";

interface VideoContent {
  contentId: string;
  title: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  thumbnailUrl: string;
  startTime: string;
  [key: string]: unknown;
}

interface SendWebhookParams {
  url: string;
  format: string;
  condition: { id: string; label: string; query: string };
  videos: VideoContent[];
  checkedAt: string;
}

interface SendWebhookResult {
  success: boolean;
}

export const sendWebhook = async (params: SendWebhookParams): Promise<SendWebhookResult> => {
  const payload =
    params.format === "discord"
      ? buildDiscordPayload(params.condition, params.videos)
      : buildGenericPayload(params.condition, params.videos, params.checkedAt);

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { success: response.ok };
  } catch {
    return { success: false };
  }
};
```

- [ ] **Step 6: Implement notify-handler.ts**

`apps/notify/src/notify-handler.ts`:

```typescript
import { and, eq, lt, notInArray } from "drizzle-orm";

import { getDb, watchConditions, watchNotifications, watchResults } from "@nicolens/db";

import { sendWebhook } from "./webhook-sender";

const RETENTION_DAYS = 90;
const MS_PER_DAY = 86400000;

interface VideoContent {
  contentId: string;
  title: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  thumbnailUrl: string;
  startTime: string;
  [key: string]: unknown;
}

interface NotifyResult {
  processed: number;
  notified: number;
  errors: number;
}

export const runNotify = async (): Promise<NotifyResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: NotifyResult = { processed: 0, notified: 0, errors: 0 };

  const conditions = await db
    .select()
    .from(watchConditions)
    .where(eq(watchConditions.isActive, true));

  console.log(`[notify] Processing ${String(conditions.length)} conditions`);

  for (const condition of conditions) {
    result.processed++;

    try {
      // Get already-notified content IDs for this condition
      const notified = await db
        .select({ contentId: watchNotifications.contentId })
        .from(watchNotifications)
        .where(eq(watchNotifications.conditionId, condition.id));

      const notifiedIds = notified.map((n) => n.contentId);

      // Find unnotified results
      const unnotifiedQuery = db
        .select({
          contentId: watchResults.contentId,
          videoData: watchResults.videoData,
        })
        .from(watchResults)
        .where(
          notifiedIds.length > 0
            ? and(
                eq(watchResults.conditionId, condition.id),
                notInArray(watchResults.contentId, notifiedIds),
              )
            : eq(watchResults.conditionId, condition.id),
        );

      const unnotified = await unnotifiedQuery;

      if (unnotified.length === 0) {
        continue;
      }

      // Parse video data
      const videos = unnotified
        .map((r) => {
          try {
            return JSON.parse(r.videoData) as VideoContent;
          } catch {
            return null;
          }
        })
        .filter((v): v is VideoContent => v !== null);

      if (videos.length === 0) {
        continue;
      }

      // Send webhook
      const webhookResult = await sendWebhook({
        url: condition.webhookUrl,
        format: condition.webhookFormat,
        condition: { id: condition.id, label: condition.label, query: condition.query },
        videos,
        checkedAt: now,
      });

      if (webhookResult.success) {
        const notifRows = videos.map((v) => ({
          id: crypto.randomUUID(),
          conditionId: condition.id,
          contentId: v.contentId,
          notifiedAt: now,
        }));
        await db.insert(watchNotifications).values(notifRows).onConflictDoNothing();
        result.notified += videos.length;
        console.log(`[notify] ${condition.label}: ${String(videos.length)} notifications sent`);
      } else {
        console.error(`[notify] Webhook failed for condition ${condition.id}`);
        result.errors++;
      }
    } catch (error) {
      console.error(`[notify] Error for condition ${condition.id}:`, error);
      result.errors++;
    }
  }

  // Cleanup old notifications
  const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(watchNotifications).where(lt(watchNotifications.notifiedAt, cutoff));

  return result;
};
```

- [ ] **Step 7: Implement index.ts entry point**

`apps/notify/src/index.ts`:

```typescript
import { runNotify } from "./notify-handler";

const main = async () => {
  console.log("[notify] Starting notifications...");
  const result = await runNotify();
  console.log("[notify] Complete:", JSON.stringify(result));

  if (result.errors > 0) {
    process.exitCode = 1;
  }
};

void main();
```

- [ ] **Step 8: Install, test, verify**

Run: `pnpm install`
Run: `pnpm --filter @nicolens/notify test`
Expected: All tests pass.
Run: `pnpm --filter @nicolens/notify typecheck`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add apps/notify/
git commit -m "feat: add apps/notify webhook notification service"
```

---

### Task 5: API Routes (apps/web)

**Files:**
- Create: `apps/web/app/api/watch/route.ts`
- Create: `apps/web/app/api/watch/[token]/route.ts`

- [ ] **Step 1: Implement POST /api/watch**

`apps/web/app/api/watch/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";

import { getDb, watchConditions } from "@nicolens/db";

const HTTP_BAD_REQUEST = 400;
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "[::1]"]);

const isValidHttpsUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const h = parsed.hostname;
    if (BLOCKED_HOSTNAMES.has(h)) return false;
    if (h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    return true;
  } catch {
    return false;
  }
};

const VALID_FORMATS = new Set(["generic", "discord"]);

export const POST = async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: HTTP_BAD_REQUEST });
  }

  const b = body as Record<string, unknown>;
  const label = typeof b["label"] === "string" ? b["label"].trim() : "";
  const query = typeof b["query"] === "string" ? b["query"].trim() : "";
  const targets = typeof b["targets"] === "string" ? b["targets"] : "title,description,tags";
  const filtersJson = typeof b["filtersJson"] === "string" ? b["filtersJson"] : null;
  const webhookUrl = typeof b["webhookUrl"] === "string" ? b["webhookUrl"].trim() : "";
  const webhookFormat =
    typeof b["webhookFormat"] === "string" && VALID_FORMATS.has(b["webhookFormat"])
      ? b["webhookFormat"]
      : "generic";

  if (label === "" || query === "") {
    return NextResponse.json({ error: "label and query are required" }, { status: HTTP_BAD_REQUEST });
  }

  if (!isValidHttpsUrl(webhookUrl)) {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: HTTP_BAD_REQUEST });
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();

  const db = getDb();
  await db.insert(watchConditions).values({
    id,
    token,
    label,
    query,
    targets,
    filtersJson,
    webhookUrl,
    webhookFormat,
    isActive: true,
    lastClonedAt: null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id, token, manageUrl: `/watch/${token}` });
};
```

- [ ] **Step 2: Implement GET/PATCH/DELETE /api/watch/[token]**

`apps/web/app/api/watch/[token]/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { getDb, watchConditions, watchNotifications } from "@nicolens/db";

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const RECENT_LIMIT = 10;

interface RouteParams {
  params: Promise<{ token: string }>;
}

const findByToken = async (token: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(watchConditions)
    .where(eq(watchConditions.token, token))
    .limit(1);
  return rows[0] ?? null;
};

export const GET = async (_request: NextRequest, { params }: RouteParams) => {
  const { token } = await params;
  const condition = await findByToken(token);
  if (condition === null) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }

  const db = getDb();
  const recentNotifications = await db
    .select({ contentId: watchNotifications.contentId, notifiedAt: watchNotifications.notifiedAt })
    .from(watchNotifications)
    .where(eq(watchNotifications.conditionId, condition.id))
    .orderBy(desc(watchNotifications.notifiedAt))
    .limit(RECENT_LIMIT);

  return NextResponse.json({
    condition: {
      ...condition,
      webhookUrl: undefined,
      webhookUrlMasked: condition.webhookUrl.replace(/(.{15}).*(.{6})/, "$1***$2"),
    },
    recentNotifications,
  });
};

export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  const { token } = await params;
  const condition = await findByToken(token);
  if (condition === null) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (typeof b["label"] === "string") updates["label"] = b["label"].trim();
  if (typeof b["isActive"] === "boolean") updates["isActive"] = b["isActive"];
  if (typeof b["webhookUrl"] === "string") updates["webhookUrl"] = b["webhookUrl"];
  if (typeof b["webhookFormat"] === "string") updates["webhookFormat"] = b["webhookFormat"];

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: HTTP_BAD_REQUEST });
  }

  const db = getDb();
  await db.update(watchConditions).set(updates).where(eq(watchConditions.id, condition.id));
  return NextResponse.json({ success: true });
};

export const DELETE = async (_request: NextRequest, { params }: RouteParams) => {
  const { token } = await params;
  const condition = await findByToken(token);
  if (condition === null) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }

  const db = getDb();
  await db.delete(watchConditions).where(eq(watchConditions.id, condition.id));
  return NextResponse.json({ success: true });
};
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/watch/
git commit -m "feat(web): add watch condition CRUD API routes"
```

---

### Task 6: UI — Watch Button

**Files:**
- Create: `apps/web/src/features/watch/ui/watch-button.tsx`
- Create: `apps/web/src/features/watch/index.ts`
- Modify: `apps/web/src/pages/search/ui/search-page.tsx`

- [ ] **Step 1: Implement WatchButton**

`apps/web/src/features/watch/ui/watch-button.tsx`:

```typescript
"use client";

import { Bell } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

interface WatchButtonProps {
  query: string;
  targets: string;
  filtersJson: string | null;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const formatSelectValue = (value: unknown): string => {
  if (value === "discord") return "Discord";
  return "Generic";
};

export const WatchButton = ({ query, targets, filtersJson }: WatchButtonProps) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(query);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookFormat, setWebhookFormat] = useState("generic");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  const handleSubmit = async () => {
    setStatus("submitting");
    try {
      const response = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), query, targets, filtersJson, webhookUrl: webhookUrl.trim(), webhookFormat }),
      });
      if (!response.ok) { setStatus("error"); return; }
      const data = (await response.json()) as { manageUrl: string };
      setManageUrl(data.manageUrl);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (query === "") return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="この条件で通知を受け取る" />}>
        <Bell className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 space-y-3 p-3">
        {status === "success" && manageUrl !== null ? (
          <div className="space-y-2 text-xs">
            <p className="font-medium text-green-600">通知設定を保存しました</p>
            <a href={manageUrl} className="text-blue-600 underline">管理ページを開く</a>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">ラベル</Label>
              <Input type="text" value={label} onChange={(e) => { setLabel(e.target.value); }} className="h-8 text-xs" placeholder="例: VOCALOID新着" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Webhook URL</Label>
              <Input type="url" value={webhookUrl} onChange={(e) => { setWebhookUrl(e.target.value); }} className="h-8 text-xs" placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">形式</Label>
              <Select value={webhookFormat} onValueChange={setWebhookFormat}>
                <SelectTrigger className="h-8 text-xs"><SelectValue>{formatSelectValue}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "error" && <p className="text-xs text-destructive">保存に失敗しました</p>}
            <Button type="submit" size="sm" className="h-8 w-full text-xs" disabled={status === "submitting" || label.trim() === "" || webhookUrl.trim() === ""}>
              {status === "submitting" ? "保存中..." : "通知を設定"}
            </Button>
          </form>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

- [ ] **Step 2: Create barrel**

`apps/web/src/features/watch/index.ts`:

```typescript
export { WatchButton } from "./ui/watch-button";
```

- [ ] **Step 3: Add WatchButton to search page**

In `apps/web/src/pages/search/ui/search-page.tsx`:

Add import:
```typescript
import { WatchButton } from "@/features/watch";
```

Change `extraActions` prop:
```typescript
extraActions={
  <>
    <WatchButton
      query={search.state.query}
      targets={search.state.targets}
      filtersJson={Object.keys(search.state.filters).length > 0 ? JSON.stringify(search.state.filters) : null}
    />
    <SaveSearchButton currentUrl={currentUrl} />
  </>
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/ apps/web/src/pages/search/ui/search-page.tsx
git commit -m "feat(web): add watch button to search results toolbar"
```

---

### Task 7: Management Page

**Files:**
- Create: `apps/web/src/features/watch/ui/watch-manage-view.tsx`
- Create: `apps/web/src/pages/watch/ui/watch-page.tsx`
- Create: `apps/web/src/pages/watch/index.ts`
- Create: `apps/web/app/watch/[token]/page.tsx`

- [ ] **Step 1: Create WatchManageView component**

`apps/web/src/features/watch/ui/watch-manage-view.tsx` — client component that fetches `/api/watch/[token]` and renders condition details, toggle, delete, and recent notifications. (Full code as specified in v1 plan Task 12 — same component, just the import path for `@/shared/db` is not needed here since this is a client component using fetch.)

- [ ] **Step 2: Create page composition**

`apps/web/src/pages/watch/ui/watch-page.tsx`:
```typescript
"use client";
import { WatchManageView } from "@/features/watch/ui/watch-manage-view";
interface WatchPageProps { token: string; }
export const WatchPage = ({ token }: WatchPageProps) => <WatchManageView token={token} />;
```

`apps/web/src/pages/watch/index.ts`:
```typescript
export { WatchPage } from "./ui/watch-page";
```

- [ ] **Step 3: Create app router page**

`apps/web/app/watch/[token]/page.tsx`:
```typescript
import { WatchPage } from "@/pages/watch";
interface WatchRouteProps { params: Promise<{ token: string }>; }
// oxlint-disable-next-line import/no-default-export
export default async function WatchRoute({ params }: WatchRouteProps) {
  const { token } = await params;
  return <WatchPage token={token} />;
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/ui/watch-manage-view.tsx apps/web/src/pages/watch/ "apps/web/app/watch/[token]/"
git commit -m "feat(web): add watch condition management page"
```

---

### Task 8: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/watch.yml`

- [ ] **Step 1: Create workflow**

`.github/workflows/watch.yml`:

```yaml
name: Watch & Notify

on:
  schedule:
    - cron: '10 20 * * *' # UTC 20:10 = JST 5:10
  workflow_dispatch: # Manual trigger for testing

jobs:
  clone:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nicolens/clone start
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  notify:
    needs: clone
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nicolens/notify start
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

- [ ] **Step 2: Update turbo.json**

Add `start` task:

```json
{
  "tasks": {
    "start": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

(Merge into existing tasks object.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/watch.yml turbo.json
git commit -m "ci: add GitHub Actions workflow for daily watch clone and notify"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full check**

Run: `pnpm check`
Fix any lint, format, typecheck, or knip issues.

- [ ] **Step 2: Test locally**

1. Start dev server: `pnpm dev`
2. Search for a keyword, click bell icon, enter webhook URL, save
3. Run clone manually: `pnpm --filter @nicolens/clone start`
4. Run notify manually: `pnpm --filter @nicolens/notify start`
5. Verify webhook received at test endpoint

- [ ] **Step 3: Commit any fixes**

```bash
git commit -m "fix: resolve lint and type issues for watch feature"
```
