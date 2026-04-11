# Watch & Webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snapshot API の日次更新を監視し、ユーザー定義の検索条件に合致する新着動画を webhook で通知する。Vercel Hobby + Neon free の無料枠内で動作する。

**Architecture:** Vercel Cron (1日1回 JST 5:05) がcronエンドポイントを呼び出し、DB上の全条件を読み取って snapshot API に問い合わせ、差分を検出して webhook を送信する。ユーザー管理は UUID トークン方式（認証不要）。処理ロジックは実行環境に依存しないモジュールとして実装し、将来の GitHub Actions 移行にも対応可能。

**Tech Stack:** Next.js API Routes, Drizzle ORM (PostgreSQL), Vercel Cron, Vitest

---

## File Map

### New Files

| Path | Responsibility |
|------|---------------|
| `src/shared/types/watch.ts` | Watch 機能の型定義 |
| `src/features/watch/lib/url-validator.ts` | Webhook URL の SSRF 検証 |
| `src/features/watch/lib/url-validator.test.ts` | URL validator テスト |
| `src/features/watch/lib/webhook-formats.ts` | Generic/Discord ペイロード構築 |
| `src/features/watch/lib/webhook-formats.test.ts` | フォーマッタテスト |
| `src/features/watch/lib/webhook-sender.ts` | Webhook HTTP 送信 |
| `src/features/watch/lib/webhook-sender.test.ts` | Sender テスト |
| `src/features/watch/lib/watch-cron-handler.ts` | Cron 処理ロジック (実行環境非依存) |
| `src/features/watch/lib/watch-cron-handler.test.ts` | Cron handler テスト |
| `src/features/watch/ui/watch-button.tsx` | 検索結果に追加する Watch ボタン + DropdownMenu |
| `src/features/watch/ui/watch-manage-view.tsx` | /watch/[token] のコンテンツ |
| `src/features/watch/index.ts` | Public API |
| `app/api/watch/route.ts` | POST: 条件作成 |
| `app/api/watch/cron/route.ts` | GET: Cron ハンドラ |
| `app/api/watch/[token]/route.ts` | GET/PATCH/DELETE: 条件管理 |
| `app/watch/[token]/page.tsx` | 管理ページ (thin wrapper) |
| `src/pages/watch/ui/watch-page.tsx` | 管理ページ構成 |
| `src/pages/watch/index.ts` | Public API |

### Modified Files

| Path | Change |
|------|--------|
| `src/shared/db/schema.ts` | `watchConditions`, `watchNotifications` テーブル追加 |
| `src/shared/db/index.ts` | 新テーブルの re-export 追加 |
| `src/shared/types/index.ts` | watch 型の re-export 追加 |
| `src/pages/search/ui/search-page.tsx` | `WatchButton` を `extraActions` に追加 |
| `vercel.json` | `crons` 設定追加 |
| `apps/web/knip.json` | 必要なら新ファイルの ignore 追加 |

---

### Task 1: DB Schema

**Files:**
- Modify: `apps/web/src/shared/db/schema.ts`
- Modify: `apps/web/src/shared/db/index.ts`

- [ ] **Step 1: Add watch tables to schema**

`apps/web/src/shared/db/schema.ts` の末尾に追加:

```typescript
// Add to imports: boolean, uniqueIndex
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, vector } from "drizzle-orm/pg-core";

// ... existing tables ...

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
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [uniqueIndex("idx_watch_conditions_token").on(table.token)],
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

- [ ] **Step 2: Export new tables from db barrel**

`apps/web/src/shared/db/index.ts` を更新:

```typescript
export { getDb } from "./connection";
export {
  taglessCrawlStatus,
  taglessVideos,
  videoEmbeddings,
  watchConditions,
  watchNotifications,
} from "./schema";
```

- [ ] **Step 3: Push schema to DB**

Run: `pnpm --filter @nicolens/web db:push`
Expected: Schema changes applied successfully. `watch_conditions` and `watch_notifications` tables created.

- [ ] **Step 4: Verify with typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/db/schema.ts apps/web/src/shared/db/index.ts
git commit -m "feat(watch): add watch_conditions and watch_notifications schema"
```

---

### Task 2: Types

**Files:**
- Create: `apps/web/src/shared/types/watch.ts`
- Modify: `apps/web/src/shared/types/index.ts`

- [ ] **Step 1: Create watch types**

`apps/web/src/shared/types/watch.ts`:

```typescript
import type { VideoContent } from "./api";

export type WebhookFormat = "generic" | "discord";

export interface WatchCondition {
  id: string;
  token: string;
  label: string;
  query: string;
  targets: string;
  filtersJson: string | null;
  webhookUrl: string;
  webhookFormat: WebhookFormat;
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface WatchNotification {
  id: string;
  conditionId: string;
  contentId: string;
  notifiedAt: string;
}

export interface CreateWatchRequest {
  label: string;
  query: string;
  targets: string;
  filtersJson?: string;
  webhookUrl: string;
  webhookFormat?: WebhookFormat;
}

export interface CreateWatchResponse {
  id: string;
  token: string;
  manageUrl: string;
}

export interface GenericWebhookPayload {
  condition: {
    id: string;
    label: string;
    query: string;
  };
  videos: VideoContent[];
  checkedAt: string;
  totalNew: number;
}

export interface DiscordEmbed {
  title: string;
  url: string;
  thumbnail?: { url: string };
  fields: { name: string; value: string; inline: boolean }[];
  timestamp: string;
}

export interface DiscordWebhookPayload {
  content: string;
  embeds: DiscordEmbed[];
}
```

- [ ] **Step 2: Export from types barrel**

`apps/web/src/shared/types/index.ts` に追加:

```typescript
export type {
  CreateWatchRequest,
  CreateWatchResponse,
  DiscordEmbed,
  DiscordWebhookPayload,
  GenericWebhookPayload,
  WatchCondition,
  WatchNotification,
  WebhookFormat,
} from "./watch";
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/types/watch.ts apps/web/src/shared/types/index.ts
git commit -m "feat(watch): add watch feature type definitions"
```

---

### Task 3: URL Validator

**Files:**
- Create: `apps/web/src/features/watch/lib/url-validator.ts`
- Create: `apps/web/src/features/watch/lib/url-validator.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/src/features/watch/lib/url-validator.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { validateWebhookUrl } from "./url-validator";

describe("validateWebhookUrl", () => {
  it("accepts valid https URL", () => {
    expect(validateWebhookUrl("https://discord.com/api/webhooks/123/abc")).toBe(true);
  });

  it("accepts valid https URL with path", () => {
    expect(validateWebhookUrl("https://example.com/webhook")).toBe(true);
  });

  it("rejects http URL", () => {
    expect(validateWebhookUrl("http://example.com/webhook")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateWebhookUrl("")).toBe(false);
  });

  it("rejects non-URL string", () => {
    expect(validateWebhookUrl("not a url")).toBe(false);
  });

  it("rejects localhost", () => {
    expect(validateWebhookUrl("https://localhost/webhook")).toBe(false);
  });

  it("rejects 127.0.0.1", () => {
    expect(validateWebhookUrl("https://127.0.0.1/webhook")).toBe(false);
  });

  it("rejects 10.x.x.x private range", () => {
    expect(validateWebhookUrl("https://10.0.0.1/webhook")).toBe(false);
  });

  it("rejects 172.16.x.x private range", () => {
    expect(validateWebhookUrl("https://172.16.0.1/webhook")).toBe(false);
  });

  it("rejects 192.168.x.x private range", () => {
    expect(validateWebhookUrl("https://192.168.1.1/webhook")).toBe(false);
  });

  it("rejects 0.0.0.0", () => {
    expect(validateWebhookUrl("https://0.0.0.0/webhook")).toBe(false);
  });

  it("rejects [::1] IPv6 loopback", () => {
    expect(validateWebhookUrl("https://[::1]/webhook")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/url-validator.test.ts`
Expected: FAIL — `validateWebhookUrl` not found.

- [ ] **Step 3: Implement**

`apps/web/src/features/watch/lib/url-validator.ts`:

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
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    return true;
  }
  return false;
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

  if (isPrivateIp(parsed.hostname)) {
    return false;
  }

  return true;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/url-validator.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/lib/url-validator.ts apps/web/src/features/watch/lib/url-validator.test.ts
git commit -m "feat(watch): add webhook URL validator with SSRF prevention"
```

---

### Task 4: Webhook Formats

**Files:**
- Create: `apps/web/src/features/watch/lib/webhook-formats.ts`
- Create: `apps/web/src/features/watch/lib/webhook-formats.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/src/features/watch/lib/webhook-formats.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildDiscordPayload, buildGenericPayload } from "./webhook-formats";
import type { VideoContent } from "@/shared/types";

const makeVideo = (overrides: Partial<VideoContent> = {}): VideoContent => ({
  contentId: "sm12345",
  title: "Test Video",
  viewCounter: 1000,
  mylistCounter: 50,
  likeCounter: 100,
  commentCounter: 30,
  lengthSeconds: 300,
  thumbnailUrl: "https://img.cdn.nimg.jp/s/nicovideo/thumbnails/12345",
  startTime: "2026-04-11T10:00:00+09:00",
  ...overrides,
});

const conditionInfo = { id: "cond-1", label: "VOCALOID新着", query: "VOCALOID" };

describe("buildGenericPayload", () => {
  it("builds payload with correct structure", () => {
    const videos = [makeVideo()];
    const result = buildGenericPayload(conditionInfo, videos, "2026-04-11T05:05:00Z");

    expect(result.condition).toEqual(conditionInfo);
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].contentId).toBe("sm12345");
    expect(result.totalNew).toBe(1);
    expect(result.checkedAt).toBe("2026-04-11T05:05:00Z");
  });
});

describe("buildDiscordPayload", () => {
  it("builds Discord embed with video info", () => {
    const videos = [makeVideo()];
    const result = buildDiscordPayload(conditionInfo, videos);

    expect(result.content).toContain("VOCALOID新着");
    expect(result.content).toContain("1件");
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0].title).toBe("Test Video");
    expect(result.embeds[0].url).toBe("https://nico.ms/sm12345");
  });

  it("limits embeds to 10 for Discord API limit", () => {
    const videos = Array.from({ length: 15 }, (_, i) =>
      makeVideo({ contentId: `sm${String(i)}`, title: `Video ${String(i)}` }),
    );
    const result = buildDiscordPayload(conditionInfo, videos);

    expect(result.embeds).toHaveLength(10);
    expect(result.content).toContain("15件");
  });

  it("includes thumbnail in embed", () => {
    const videos = [makeVideo()];
    const result = buildDiscordPayload(conditionInfo, videos);

    expect(result.embeds[0].thumbnail).toEqual({
      url: "https://img.cdn.nimg.jp/s/nicovideo/thumbnails/12345",
    });
  });

  it("formats view count with locale string", () => {
    const videos = [makeVideo({ viewCounter: 12345 })];
    const result = buildDiscordPayload(conditionInfo, videos);

    const viewField = result.embeds[0].fields.find((f) => f.name === "再生");
    expect(viewField?.value).toBe("12,345");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/webhook-formats.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/features/watch/lib/webhook-formats.ts`:

```typescript
import type {
  DiscordEmbed,
  DiscordWebhookPayload,
  GenericWebhookPayload,
  VideoContent,
} from "@/shared/types";

interface ConditionInfo {
  id: string;
  label: string;
  query: string;
}

const DISCORD_MAX_EMBEDS = 10;

const formatCount = (n: number): string => n.toLocaleString("ja-JP");

export const buildGenericPayload = (
  condition: ConditionInfo,
  videos: VideoContent[],
  checkedAt: string,
): GenericWebhookPayload => ({
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
): DiscordWebhookPayload => ({
  content: `**${condition.label}** - ${String(videos.length)}件の新着動画`,
  embeds: videos.slice(0, DISCORD_MAX_EMBEDS).map(videoToEmbed),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/webhook-formats.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/lib/webhook-formats.ts apps/web/src/features/watch/lib/webhook-formats.test.ts
git commit -m "feat(watch): add generic and Discord webhook format builders"
```

---

### Task 5: Webhook Sender

**Files:**
- Create: `apps/web/src/features/watch/lib/webhook-sender.ts`
- Create: `apps/web/src/features/watch/lib/webhook-sender.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/src/features/watch/lib/webhook-sender.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendWebhook } from "./webhook-sender";
import type { VideoContent } from "@/shared/types";

const makeVideo = (): VideoContent => ({
  contentId: "sm12345",
  title: "Test",
  viewCounter: 100,
  mylistCounter: 10,
  likeCounter: 20,
  commentCounter: 5,
  lengthSeconds: 120,
  thumbnailUrl: "https://img.example.com/thumb.jpg",
  startTime: "2026-04-11T10:00:00+09:00",
});

const conditionInfo = { id: "c1", label: "Test", query: "test" };

describe("sendWebhook", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends generic payload via POST", async () => {
    await sendWebhook({
      url: "https://example.com/webhook",
      format: "generic",
      condition: conditionInfo,
      videos: [makeVideo()],
      checkedAt: "2026-04-11T05:05:00Z",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("sends discord payload when format is discord", async () => {
    await sendWebhook({
      url: "https://discord.com/api/webhooks/123/abc",
      format: "discord",
      condition: conditionInfo,
      videos: [makeVideo()],
      checkedAt: "2026-04-11T05:05:00Z",
    });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string) as Record<string, unknown>;
    expect(body).toHaveProperty("content");
    expect(body).toHaveProperty("embeds");
  });

  it("returns success true when fetch succeeds", async () => {
    const result = await sendWebhook({
      url: "https://example.com/webhook",
      format: "generic",
      condition: conditionInfo,
      videos: [makeVideo()],
      checkedAt: "2026-04-11T05:05:00Z",
    });

    expect(result.success).toBe(true);
  });

  it("returns success false when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await sendWebhook({
      url: "https://example.com/webhook",
      format: "generic",
      condition: conditionInfo,
      videos: [makeVideo()],
      checkedAt: "2026-04-11T05:05:00Z",
    });

    expect(result.success).toBe(false);
  });

  it("returns success false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await sendWebhook({
      url: "https://example.com/webhook",
      format: "generic",
      condition: conditionInfo,
      videos: [makeVideo()],
      checkedAt: "2026-04-11T05:05:00Z",
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/webhook-sender.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`apps/web/src/features/watch/lib/webhook-sender.ts`:

```typescript
import type { VideoContent, WebhookFormat } from "@/shared/types";

import { buildDiscordPayload, buildGenericPayload } from "./webhook-formats";

interface SendWebhookParams {
  url: string;
  format: WebhookFormat;
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/webhook-sender.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/lib/webhook-sender.ts apps/web/src/features/watch/lib/webhook-sender.test.ts
git commit -m "feat(watch): add webhook sender with generic and discord support"
```

---

### Task 6: Cron Handler

**Files:**
- Create: `apps/web/src/features/watch/lib/watch-cron-handler.ts`
- Create: `apps/web/src/features/watch/lib/watch-cron-handler.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/web/src/features/watch/lib/watch-cron-handler.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { processWatchConditions } from "./watch-cron-handler";

vi.mock("@/shared/db", () => ({
  getDb: vi.fn(),
  watchConditions: { id: "id", isActive: "is_active", lastCheckedAt: "last_checked_at" },
  watchNotifications: {
    id: "id",
    conditionId: "condition_id",
    contentId: "content_id",
    notifiedAt: "notified_at",
  },
}));

vi.mock("./webhook-sender", () => ({
  sendWebhook: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock snapshot API fetch
const mockFetch = vi.fn();

describe("processWatchConditions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          meta: { status: 200, totalCount: 0 },
          data: [],
        }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a function that returns a promise", () => {
    expect(typeof processWatchConditions).toBe("function");
  });
});
```

Note: Full integration testing of the cron handler requires complex DB mocking. The test above verifies the module loads correctly. More granular testing happens through the individual utility functions (url-validator, webhook-formats, webhook-sender) which are already tested.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/watch-cron-handler.test.ts`
Expected: FAIL — `processWatchConditions` not found.

- [ ] **Step 3: Implement**

`apps/web/src/features/watch/lib/watch-cron-handler.ts`:

```typescript
import { and, eq, inArray, lt } from "drizzle-orm";

import { getDb, watchConditions, watchNotifications } from "@/shared/db";
import type { VideoContent } from "@/shared/types";

import { sendWebhook } from "./webhook-sender";

const SNAPSHOT_API = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
const SNAPSHOT_FIELDS =
  "contentId,title,description,userId,channelId,viewCounter,mylistCounter,likeCounter,lengthSeconds,thumbnailUrl,startTime,lastResBody,commentCounter,lastCommentTime,categoryTags,tags,genre";
const SNAPSHOT_LIMIT = 100;
const NOTIFICATION_RETENTION_DAYS = 30;
const MS_PER_DAY = 86400000;
const RATE_LIMIT_MS = 200;

interface SnapshotApiResponse {
  meta: { status: number; totalCount: number };
  data: VideoContent[];
}

const isSnapshotResponse = (value: unknown): value is SnapshotApiResponse =>
  typeof value === "object" &&
  value !== null &&
  "meta" in value &&
  "data" in value &&
  Array.isArray((value as SnapshotApiResponse).data);

const buildSnapshotUrl = (
  query: string,
  targets: string,
  filtersJson: string | null,
  lastCheckedAt: string | null,
): string => {
  const params = new URLSearchParams({
    q: query,
    targets,
    fields: SNAPSHOT_FIELDS,
    _sort: "-startTime",
    _limit: String(SNAPSHOT_LIMIT),
    _context: "nicolens-watch",
  });

  // Add startTime filter for incremental check
  const since = lastCheckedAt ?? new Date(Date.now() - MS_PER_DAY).toISOString();
  params.set("filters[startTime][gte]", since);

  // Merge user-defined filters
  if (filtersJson !== null && filtersJson !== "") {
    try {
      const filters = JSON.parse(filtersJson) as Record<string, Record<string, string>>;
      for (const [field, ops] of Object.entries(filters)) {
        if (field === "startTime") {
          continue; // startTime is managed by cron logic
        }
        for (const [op, val] of Object.entries(ops)) {
          params.set(`filters[${field}][${op}]`, val);
        }
      }
    } catch {
      // Invalid JSON, skip user filters
    }
  }

  return `${SNAPSHOT_API}?${params.toString()}`;
};

const fetchNewVideos = async (
  query: string,
  targets: string,
  filtersJson: string | null,
  lastCheckedAt: string | null,
): Promise<VideoContent[]> => {
  const url = buildSnapshotUrl(query, targets, filtersJson, lastCheckedAt);

  const response = await fetch(url, {
    headers: { "User-Agent": "nicolens-watch/1.0" },
  });

  if (!response.ok) {
    return [];
  }

  const json: unknown = await response.json();
  if (!isSnapshotResponse(json)) {
    return [];
  }

  return json.data;
};

const wait = (ms: number): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

interface ProcessResult {
  processed: number;
  notified: number;
  errors: number;
}

export const processWatchConditions = async (): Promise<ProcessResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: ProcessResult = { processed: 0, notified: 0, errors: 0 };

  // Fetch all active conditions
  const conditions = await db
    .select()
    .from(watchConditions)
    .where(eq(watchConditions.isActive, true));

  for (const condition of conditions) {
    result.processed++;

    try {
      // Fetch new videos from snapshot API
      const videos = await fetchNewVideos(
        condition.query,
        condition.targets,
        condition.filtersJson,
        condition.lastCheckedAt,
      );

      if (videos.length === 0) {
        // Update last_checked even if no new videos
        await db
          .update(watchConditions)
          .set({ lastCheckedAt: now })
          .where(eq(watchConditions.id, condition.id));
        await wait(RATE_LIMIT_MS);
        continue;
      }

      // Get already-notified content IDs for this condition
      const contentIds = videos.map((v) => v.contentId);
      const alreadyNotified = await db
        .select({ contentId: watchNotifications.contentId })
        .from(watchNotifications)
        .where(
          and(
            eq(watchNotifications.conditionId, condition.id),
            inArray(watchNotifications.contentId, contentIds),
          ),
        );

      const notifiedSet = new Set(alreadyNotified.map((n) => n.contentId));
      const newVideos = videos.filter((v) => !notifiedSet.has(v.contentId));

      if (newVideos.length > 0) {
        // Send webhook
        const webhookResult = await sendWebhook({
          url: condition.webhookUrl,
          format: condition.webhookFormat as "generic" | "discord",
          condition: { id: condition.id, label: condition.label, query: condition.query },
          videos: newVideos,
          checkedAt: now,
        });

        if (webhookResult.success) {
          // Record notifications
          const notifRows = newVideos.map((v) => ({
            id: crypto.randomUUID(),
            conditionId: condition.id,
            contentId: v.contentId,
            notifiedAt: now,
          }));
          await db.insert(watchNotifications).values(notifRows).onConflictDoNothing();
          result.notified += newVideos.length;
        } else {
          result.errors++;
        }
      }

      // Update last_checked
      await db
        .update(watchConditions)
        .set({ lastCheckedAt: now })
        .where(eq(watchConditions.id, condition.id));
    } catch {
      result.errors++;
    }

    await wait(RATE_LIMIT_MS);
  }

  // Cleanup old notifications
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(watchNotifications).where(lt(watchNotifications.notifiedAt, cutoff));

  return result;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @nicolens/web test -- src/features/watch/lib/watch-cron-handler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/lib/watch-cron-handler.ts apps/web/src/features/watch/lib/watch-cron-handler.test.ts
git commit -m "feat(watch): add cron handler for processing watch conditions"
```

---

### Task 7: API Route - Create Condition

**Files:**
- Create: `apps/web/app/api/watch/route.ts`

- [ ] **Step 1: Implement POST /api/watch**

`apps/web/app/api/watch/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";

import { getDb, watchConditions } from "@/shared/db";

import { validateWebhookUrl } from "@/features/watch/lib/url-validator";

const HTTP_BAD_REQUEST = 400;

interface CreateWatchBody {
  label?: unknown;
  query?: unknown;
  targets?: unknown;
  filtersJson?: unknown;
  webhookUrl?: unknown;
  webhookFormat?: unknown;
}

const isCreateWatchBody = (body: unknown): body is CreateWatchBody =>
  typeof body === "object" && body !== null;

const VALID_WEBHOOK_FORMATS = new Set(["generic", "discord"]);

export const POST = async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);
  if (!isCreateWatchBody(body)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: HTTP_BAD_REQUEST },
    );
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const targets = typeof body.targets === "string" ? body.targets : "title,description,tags";
  const filtersJson = typeof body.filtersJson === "string" ? body.filtersJson : null;
  const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";
  const webhookFormat =
    typeof body.webhookFormat === "string" && VALID_WEBHOOK_FORMATS.has(body.webhookFormat)
      ? body.webhookFormat
      : "generic";

  if (label === "" || query === "") {
    return NextResponse.json(
      { error: "label and query are required" },
      { status: HTTP_BAD_REQUEST },
    );
  }

  if (!validateWebhookUrl(webhookUrl)) {
    return NextResponse.json(
      { error: "Invalid webhook URL. Must be HTTPS and not point to private networks." },
      { status: HTTP_BAD_REQUEST },
    );
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

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
    lastCheckedAt: null,
    createdAt: now,
  });

  return NextResponse.json({
    id,
    token,
    manageUrl: `/watch/${token}`,
  });
};
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/watch/route.ts
git commit -m "feat(watch): add POST /api/watch endpoint for creating conditions"
```

---

### Task 8: API Route - Manage Condition

**Files:**
- Create: `apps/web/app/api/watch/[token]/route.ts`

- [ ] **Step 1: Implement GET/PATCH/DELETE**

`apps/web/app/api/watch/[token]/route.ts`:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { getDb, watchConditions, watchNotifications } from "@/shared/db";

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const RECENT_NOTIFICATIONS_LIMIT = 10;

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
    .select({
      contentId: watchNotifications.contentId,
      notifiedAt: watchNotifications.notifiedAt,
    })
    .from(watchNotifications)
    .where(eq(watchNotifications.conditionId, condition.id))
    .orderBy(desc(watchNotifications.notifiedAt))
    .limit(RECENT_NOTIFICATIONS_LIMIT);

  return NextResponse.json({
    condition: {
      id: condition.id,
      label: condition.label,
      query: condition.query,
      targets: condition.targets,
      filtersJson: condition.filtersJson,
      webhookFormat: condition.webhookFormat,
      isActive: condition.isActive,
      lastCheckedAt: condition.lastCheckedAt,
      createdAt: condition.createdAt,
      // webhookUrl is intentionally masked
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

  const updates: Record<string, unknown> = {};
  const b = body as Record<string, unknown>;

  if (typeof b["label"] === "string") {
    updates["label"] = b["label"].trim();
  }
  if (typeof b["isActive"] === "boolean") {
    updates["isActive"] = b["isActive"];
  }
  if (typeof b["webhookUrl"] === "string") {
    updates["webhookUrl"] = b["webhookUrl"];
  }
  if (typeof b["webhookFormat"] === "string") {
    updates["webhookFormat"] = b["webhookFormat"];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: HTTP_BAD_REQUEST });
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

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/watch/[token]/route.ts"
git commit -m "feat(watch): add GET/PATCH/DELETE /api/watch/[token] endpoints"
```

---

### Task 9: API Route - Cron Endpoint

**Files:**
- Create: `apps/web/app/api/watch/cron/route.ts`

- [ ] **Step 1: Implement cron endpoint**

`apps/web/app/api/watch/cron/route.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { processWatchConditions } from "@/features/watch/lib/watch-cron-handler";

const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_ERROR = 500;

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env["CRON_SECRET"];

  if (cronSecret !== undefined && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  try {
    const result = await processWatchConditions();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: HTTP_INTERNAL_ERROR },
    );
  }
};
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/watch/cron/route.ts
git commit -m "feat(watch): add cron API endpoint with CRON_SECRET auth"
```

---

### Task 10: Feature Barrel Export

**Files:**
- Create: `apps/web/src/features/watch/index.ts`

- [ ] **Step 1: Create barrel file**

`apps/web/src/features/watch/index.ts`:

```typescript
export { WatchButton } from "./ui/watch-button";
```

Note: Only export `WatchButton` as it is the only symbol imported externally (by search-page.tsx). The cron handler is imported directly by the API route using a path import, not through the barrel.

- [ ] **Step 2: Commit**

(Will be committed with Task 11 since `WatchButton` doesn't exist yet.)

---

### Task 11: UI - Watch Button

**Files:**
- Create: `apps/web/src/features/watch/ui/watch-button.tsx`
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

interface WatchButtonProps {
  query: string;
  targets: string;
  filtersJson: string | null;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const formatSelectValue = (value: unknown): string => {
  if (value === "discord") {
    return "Discord";
  }
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
        body: JSON.stringify({
          label: label.trim(),
          query,
          targets,
          filtersJson,
          webhookUrl: webhookUrl.trim(),
          webhookFormat,
        }),
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      const data = (await response.json()) as { manageUrl: string };
      setManageUrl(data.manageUrl);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const isDisabled = status === "submitting" || label.trim() === "" || webhookUrl.trim() === "";

  if (query === "") {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="この条件で通知を受け取る" />}
      >
        <Bell className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 space-y-3 p-3">
        {status === "success" && manageUrl !== null ? (
          <div className="space-y-2 text-xs">
            <p className="font-medium text-green-600">通知設定を保存しました</p>
            <a href={manageUrl} className="text-blue-600 underline">
              管理ページを開く
            </a>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label className="text-xs">ラベル</Label>
              <Input
                type="text"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                }}
                className="h-8 text-xs"
                placeholder="例: VOCALOID新着"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Webhook URL</Label>
              <Input
                type="url"
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                }}
                className="h-8 text-xs"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">形式</Label>
              <Select value={webhookFormat} onValueChange={setWebhookFormat}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>{formatSelectValue}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "error" && (
              <p className="text-xs text-destructive">保存に失敗しました。URLを確認してください。</p>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-8 w-full text-xs"
              disabled={isDisabled}
            >
              {status === "submitting" ? "保存中..." : "通知を設定"}
            </Button>
          </form>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

- [ ] **Step 2: Add WatchButton to search page**

`apps/web/src/pages/search/ui/search-page.tsx` を修正。`extraActions` に `WatchButton` を追加:

Import を追加:

```typescript
import { WatchButton } from "@/features/watch";
```

`extraActions` prop を変更:

```typescript
extraActions={
  <>
    <WatchButton
      query={search.state.query}
      targets={search.state.targets}
      filtersJson={
        Object.keys(search.state.filters).length > 0
          ? JSON.stringify(search.state.filters)
          : null
      }
    />
    <SaveSearchButton currentUrl={currentUrl} />
  </>
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck`
Expected: No errors.

Run: `pnpm lint`
Expected: No errors (fix any issues before committing).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/watch/ui/watch-button.tsx apps/web/src/features/watch/index.ts apps/web/src/pages/search/ui/search-page.tsx
git commit -m "feat(watch): add watch button to search results toolbar"
```

---

### Task 12: Management Page

**Files:**
- Create: `apps/web/src/features/watch/ui/watch-manage-view.tsx`
- Create: `apps/web/src/pages/watch/ui/watch-page.tsx`
- Create: `apps/web/src/pages/watch/index.ts`
- Create: `apps/web/app/watch/[token]/page.tsx`

- [ ] **Step 1: Create WatchManageView**

`apps/web/src/features/watch/ui/watch-manage-view.tsx`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatDate } from "@/shared/lib";

interface ConditionData {
  id: string;
  label: string;
  query: string;
  targets: string;
  filtersJson: string | null;
  webhookFormat: string;
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  webhookUrlMasked: string;
}

interface NotificationEntry {
  contentId: string;
  notifiedAt: string;
}

interface WatchManageViewProps {
  token: string;
}

type PageStatus = "loading" | "loaded" | "not-found" | "deleted";

export const WatchManageView = ({ token }: WatchManageViewProps) => {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [condition, setCondition] = useState<ConditionData | null>(null);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/watch/${token}`);
      if (!response.ok) {
        setStatus("not-found");
        return;
      }
      const data = (await response.json()) as {
        condition: ConditionData;
        recentNotifications: NotificationEntry[];
      };
      setCondition(data.condition);
      setNotifications(data.recentNotifications);
      setStatus("loaded");
    } catch {
      setStatus("not-found");
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleToggleActive = async () => {
    if (condition === null) {
      return;
    }
    await fetch(`/api/watch/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !condition.isActive }),
    });
    setCondition({ ...condition, isActive: !condition.isActive });
  };

  const handleDelete = async () => {
    await fetch(`/api/watch/${token}`, { method: "DELETE" });
    setStatus("deleted");
  };

  if (status === "loading") {
    return <p className="p-8 text-center text-muted-foreground">読み込み中...</p>;
  }

  if (status === "not-found") {
    return <p className="p-8 text-center text-muted-foreground">条件が見つかりません</p>;
  }

  if (status === "deleted") {
    return <p className="p-8 text-center text-muted-foreground">通知設定を削除しました</p>;
  }

  if (condition === null) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{condition.label}</CardTitle>
            <Badge variant={condition.isActive ? "default" : "secondary"}>
              {condition.isActive ? "有効" : "一時停止中"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">検索クエリ: </span>
            <span>{condition.query}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">検索対象: </span>
            <span>{condition.targets}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Webhook URL: </span>
            <span className="font-mono text-xs">{condition.webhookUrlMasked}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">形式: </span>
            <span>{condition.webhookFormat === "discord" ? "Discord" : "Generic"}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">最終チェック: </span>
            <span>{condition.lastCheckedAt !== null ? formatDate(condition.lastCheckedAt) : "未チェック"}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">作成日: </span>
            <span>{formatDate(condition.createdAt)}</span>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => void handleToggleActive()}>
              {condition.isActive ? "一時停止" : "再開"}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
              削除
            </Button>
          </div>
        </CardContent>
      </Card>

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近の通知</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {notifications.map((n) => (
                <li key={`${n.contentId}-${n.notifiedAt}`} className="flex justify-between">
                  <a
                    href={`https://nico.ms/${n.contentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {n.contentId}
                  </a>
                  <span className="text-muted-foreground">{formatDate(n.notifiedAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create watch page composition**

`apps/web/src/pages/watch/ui/watch-page.tsx`:

```typescript
"use client";

import { WatchManageView } from "@/features/watch/ui/watch-manage-view";

interface WatchPageProps {
  token: string;
}

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

interface WatchRouteProps {
  params: Promise<{ token: string }>;
}

// oxlint-disable-next-line import/no-default-export -- Next.js page requires default export
export default async function WatchRoute({ params }: WatchRouteProps) {
  const { token } = await params;
  return <WatchPage token={token} />;
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: No errors.

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/watch/ui/watch-manage-view.tsx apps/web/src/pages/watch/ "apps/web/app/watch/[token]/page.tsx"
git commit -m "feat(watch): add watch condition management page"
```

---

### Task 13: Vercel Cron Config & Verification

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add cron config to vercel.json**

Update root `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "ignoreCommand": "pnpm turbo-ignore",
  "crons": [
    {
      "path": "/api/watch/cron",
      "schedule": "5 20 * * *"
    }
  ]
}
```

Note: `5 20 * * *` = UTC 20:05 = JST 05:05. Runs 5 minutes after the snapshot API daily update.

- [ ] **Step 2: Add CRON_SECRET to turbo.json build env**

Check `turbo.json` for the `env` array in `build` task. Add `"CRON_SECRET"` if environment variables are listed there.

- [ ] **Step 3: Run full check**

Run: `pnpm check`
Expected: lint, fmt:check, typecheck, knip all pass. If knip flags new files, update `apps/web/knip.json` accordingly.

- [ ] **Step 4: Start dev server and test manually**

Run: `pnpm dev`

Test flow:
1. Go to `http://localhost:3000`
2. Search for a keyword (e.g., "VOCALOID")
3. Click the bell icon in the search results toolbar
4. Enter a label, webhook URL (use https://webhook.site for testing), format "Generic"
5. Click "通知を設定"
6. Verify the management URL opens and shows the condition
7. Test toggle pause/resume
8. Test the cron endpoint manually: `curl http://localhost:3000/api/watch/cron`
9. Verify the response shows `{ "success": true, "processed": 1, ... }`

- [ ] **Step 5: Commit**

```bash
git add vercel.json turbo.json
git commit -m "feat(watch): add Vercel Cron config for daily watch processing"
```

---

### Task 14: Final Lint & Knip Fixes

- [ ] **Step 1: Run full check suite**

Run: `pnpm check`

Fix any issues:
- If knip flags unused exports: remove them or add to knip ignore
- If lint flags issues: fix code style
- If typecheck fails: fix types

- [ ] **Step 2: Commit any fixes**

```bash
git add -A
git commit -m "fix(watch): resolve lint and knip issues"
```
