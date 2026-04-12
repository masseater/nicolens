# Tag Watch & Webhook Implementation Plan (v3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub OAuth 認証を導入し、ユーザーが Webhook と Tag Trigger を独立に管理できるようにする。バックエンドは 3 つの独立サービス (snapshot-syncer, tag-scanner, webhook-dispatcher) を GitHub Actions パイプラインで順次実行する。

**Architecture:** 4 apps + 1 shared datastore package。`snapshot-syncer (API→DB) → tag-scanner (DB→DB) → webhook-dispatcher (DB→HTTP)` の3段パイプライン。各サービスの外部依存は片方向に最大1つ。

**Tech Stack:** Turborepo, Next.js 16, Auth.js v5, Drizzle ORM (Neon PostgreSQL), tsx, Vitest, GitHub Actions

---

## File Map

### New Packages

| Path | Responsibility |
|------|---------------|
| `packages/datastore/` | 共有 DB schema (Auth.js + watch 関連すべて) + connection |
| `packages/nicovideo-snapshot-api/` | Snapshot API クライアント (fetch, 型, クエリビルダ) |

### New Apps

| Path | Responsibility |
|------|---------------|
| `apps/snapshot-syncer/` | Snapshot API → `watch_results` |
| `apps/tag-scanner/` | `watch_results` → `pending_notifications` |
| `apps/webhook-dispatcher/` | `pending_notifications` → Webhook endpoints |

### New Files in apps/web

| Path | Responsibility |
|------|---------------|
| `src/auth.ts` | Auth.js 設定 (providers, adapter) |
| `src/middleware.ts` | 保護ルーティング |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js route handler |
| `app/api/webhooks/route.ts` | GET, POST |
| `app/api/webhooks/[id]/route.ts` | PATCH, DELETE |
| `app/api/watches/route.ts` | GET, POST |
| `app/api/watches/[id]/route.ts` | PATCH, DELETE |
| `app/webhooks/page.tsx` | /webhooks ページ |
| `app/watches/page.tsx` | /watches ページ |
| `src/features/auth/ui/auth-button.tsx` | ログイン/ログアウト |
| `src/features/auth/ui/user-menu.tsx` | ユーザーメニュー |
| `src/features/auth/index.ts` | barrel |
| `src/features/webhook/ui/webhook-list.tsx` | 一覧 |
| `src/features/webhook/ui/webhook-form.tsx` | 追加フォーム |
| `src/features/webhook/index.ts` | barrel |
| `src/features/tag-watch/ui/tag-watch-list.tsx` | 一覧 |
| `src/features/tag-watch/ui/tag-watch-form.tsx` | 追加フォーム |
| `src/features/tag-watch/index.ts` | barrel |
| `src/pages/webhooks/ui/webhooks-page.tsx` | ページ構成 |
| `src/pages/webhooks/index.ts` | barrel |
| `src/pages/watches/ui/watches-page.tsx` | ページ構成 |
| `src/pages/watches/index.ts` | barrel |

### New Workflow

| Path | Responsibility |
|------|---------------|
| `.github/workflows/tag-watch.yml` | Daily: sync → scan → dispatch |

### Deleted Files

| Path | Reason |
|------|--------|
| `apps/web/src/shared/db/schema.ts` | `packages/datastore` に移動 |
| `apps/web/src/shared/db/connection.ts` | `packages/datastore` に移動 |
| `apps/web/src/shared/db/index.ts` | 不要 (re-export しない) |
| `apps/web/drizzle.config.ts` | `packages/datastore` に移動 |

### Modified Files

| Path | Change |
|------|--------|
| `apps/web/package.json` | `@nicolens/datastore` + auth 系依存追加、db:* scripts 削除 |
| `apps/web/app/api/tagless/tagless-filters.ts` | `@/shared/db` → `@nicolens/datastore` |
| `apps/web/app/api/tagless/route.ts` | 同上 |
| `apps/web/app/api/tagless/crawl-db.ts` | 同上 |
| `apps/web/app/api/tagless/route.test.ts` | 同上 (vi.mock も) |
| `apps/web/app/api/semantic-search/route.ts` | 同上 |
| `apps/web/app/api/embed/route.ts` | 同上 |
| `apps/web/src/widgets/app-header/` | UserMenu / AuthButton 追加 |
| `turbo.json` | start task 追加 |

---

### Task 1: Extract packages/datastore

既存の DB 層を `packages/datastore` に抽出し、`apps/web/src/shared/db/` を完全削除する。re-export shim は作らない。

**Files:**
- Create: `packages/datastore/package.json`
- Create: `packages/datastore/tsconfig.json`
- Create: `packages/datastore/src/schema.ts` (moved)
- Create: `packages/datastore/src/connection.ts` (moved)
- Create: `packages/datastore/src/index.ts`
- Create: `packages/datastore/drizzle.config.ts`
- Delete: `apps/web/src/shared/db/`
- Delete: `apps/web/drizzle.config.ts`
- Modify: `apps/web/package.json`
- Modify: 6 existing files with `@/shared/db` imports

- [ ] **Step 1: Create packages/datastore/package.json**

```json
{
  "name": "@nicolens/datastore",
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
    "typecheck": "tsgo --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.1",
    "postgres": "^3.4.8"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "@typescript/native-preview": "7.0.0-dev.20260307.1",
    "drizzle-kit": "^0.31.9",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create packages/datastore/tsconfig.json**

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

- [ ] **Step 3: Move schema.ts and connection.ts**

```bash
mv apps/web/src/shared/db/schema.ts packages/datastore/src/schema.ts
mv apps/web/src/shared/db/connection.ts packages/datastore/src/connection.ts
```

Content remains identical at this step. New tables are added in Task 2.

- [ ] **Step 4: Create packages/datastore/src/index.ts**

```typescript
export { getDb } from "./connection";
export {
  taglessCrawlStatus,
  taglessVideos,
  videoEmbeddings,
} from "./schema";
```

- [ ] **Step 5: Move drizzle.config.ts**

```bash
mv apps/web/drizzle.config.ts packages/datastore/drizzle.config.ts
```

Edit `packages/datastore/drizzle.config.ts` to use the new schema path:

```typescript
import { defineConfig } from "drizzle-kit";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
```

- [ ] **Step 6: Delete apps/web/src/shared/db/ directory**

```bash
rm -rf apps/web/src/shared/db/
```

- [ ] **Step 7: Update apps/web/package.json**

Add to `dependencies`:
```json
"@nicolens/datastore": "workspace:*"
```

Remove from `devDependencies`:
```json
"drizzle-kit": "^0.31.9"
```

Remove from `scripts` (now delegated to packages/datastore):
```json
"db:generate": ...
"db:migrate": ...
"db:push": ...
"db:studio": ...
```

- [ ] **Step 8: Update 6 files' imports**

In each file below, replace `from "@/shared/db"` with `from "@nicolens/datastore"`:

1. `apps/web/app/api/tagless/tagless-filters.ts`
2. `apps/web/app/api/tagless/route.ts`
3. `apps/web/app/api/tagless/crawl-db.ts`
4. `apps/web/app/api/tagless/route.test.ts` — **also** update `vi.mock("@/shared/db", ...)` to `vi.mock("@nicolens/datastore", ...)`
5. `apps/web/app/api/semantic-search/route.ts`
6. `apps/web/app/api/embed/route.ts`

- [ ] **Step 9: Install & verify**

```bash
pnpm install
pnpm typecheck
pnpm --filter @nicolens/datastore db:push
```

Expected: No typecheck errors. Schema push reports no changes (existing tables unchanged).

- [ ] **Step 10: Commit**

```bash
git add packages/datastore/ apps/web/ pnpm-lock.yaml
git commit -m "refactor: extract database layer to packages/datastore"
```

---

### Task 2: Add Auth.js + Watch Tables to Schema

Drizzle adapter の標準テーブル (users, accounts, sessions, verificationTokens) と watch 関連テーブルをスキーマに追加する。

**Files:**
- Modify: `packages/datastore/src/schema.ts`
- Modify: `packages/datastore/src/index.ts`

- [ ] **Step 1: Update imports in schema.ts**

```typescript
import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, vector } from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Add Auth.js tables at the end of schema.ts**

```typescript
// Auth.js standard tables
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true, mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);
```

- [ ] **Step 3: Add watch tables at the end of schema.ts**

```typescript
export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    format: text("format").notNull(),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("idx_webhooks_user").on(table.userId)],
);

export const tagTriggers = pgTable(
  "tag_triggers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("idx_tag_triggers_user").on(table.userId),
    uniqueIndex("idx_tag_triggers_unique").on(table.userId, table.tag, table.webhookId),
  ],
);

export const watchResults = pgTable(
  "watch_results",
  {
    tag: text("tag").notNull(),
    contentId: text("content_id").notNull(),
    videoData: text("video_data").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tag, table.contentId] }),
    index("idx_watch_results_discovered_at").on(table.discoveredAt),
  ],
);

export const pendingNotifications = pgTable(
  "pending_notifications",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    triggerType: text("trigger_type").notNull(),
    triggerId: text("trigger_id").notNull(),
    contentId: text("content_id").notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("idx_pending_notifications_created_at").on(table.createdAt)],
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id").notNull(),
    triggerType: text("trigger_type").notNull(),
    triggerId: text("trigger_id").notNull(),
    contentId: text("content_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }).notNull(),
    success: boolean("success").notNull(),
  },
  (table) => [
    uniqueIndex("idx_notification_log_unique").on(table.triggerId, table.contentId),
    index("idx_notification_log_sent_at").on(table.sentAt),
  ],
);
```

- [ ] **Step 4: Export all new tables from index.ts**

```typescript
export { getDb } from "./connection";
export {
  accounts,
  notificationLog,
  pendingNotifications,
  sessions,
  tagTriggers,
  taglessCrawlStatus,
  taglessVideos,
  users,
  verificationTokens,
  videoEmbeddings,
  watchResults,
  webhooks,
} from "./schema";
```

- [ ] **Step 5: Push schema**

```bash
pnpm --filter @nicolens/datastore db:push
```

Expected: 9 new tables created (user, account, session, verificationToken, webhooks, tag_triggers, watch_results, pending_notifications, notification_log).

- [ ] **Step 6: Commit**

```bash
git add packages/datastore/src/schema.ts packages/datastore/src/index.ts
git commit -m "feat(datastore): add Auth.js and watch tables to schema"
```

---

### Task 3: Install & Configure Auth.js

GitHub OAuth による認証。

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/auth.ts`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/.env.example` (update)

- [ ] **Step 1: Install Auth.js packages**

```bash
pnpm --filter @nicolens/web add next-auth@beta @auth/drizzle-adapter
```

- [ ] **Step 2: Create auth config**

`apps/web/src/auth.ts`:

```typescript
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

import { accounts, getDb, sessions, users, verificationTokens } from "@nicolens/datastore";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: "database" },
});
```

- [ ] **Step 3: Create middleware**

`apps/web/src/middleware.ts`:

```typescript
export { auth as middleware } from "./auth";

export const config = {
  matcher: ["/watches/:path*", "/webhooks/:path*", "/api/watches/:path*", "/api/webhooks/:path*"],
};
```

- [ ] **Step 4: Create Auth.js route handler**

`apps/web/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 5: Update .env.example**

Add to `apps/web/.env.example`:

```
AUTH_SECRET=your-auth-secret-here
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret
```

- [ ] **Step 6: Generate AUTH_SECRET for local dev**

```bash
pnpm --filter @nicolens/web dlx auth secret
```

Follow instructions to add it to `.env.local`.

- [ ] **Step 7: Manual setup — Create GitHub OAuth App**

Developer must:
1. Go to https://github.com/settings/developers → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID → `AUTH_GITHUB_ID` in `.env.local`
5. Generate Client Secret → `AUTH_GITHUB_SECRET` in `.env.local`

- [ ] **Step 8: Verify**

```bash
pnpm typecheck
pnpm dev
```

Navigate to `http://localhost:3000/api/auth/signin`. GitHub OAuth flow should work. After login, check DB: `SELECT * FROM "user"` should have one row.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/auth.ts apps/web/src/middleware.ts "apps/web/app/api/auth/[...nextauth]/route.ts" apps/web/.env.example apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): integrate Auth.js v5 with GitHub OAuth"
```

---

### Task 4: Auth UI — Button & User Menu

**Files:**
- Create: `apps/web/src/features/auth/ui/auth-button.tsx`
- Create: `apps/web/src/features/auth/ui/user-menu.tsx`
- Create: `apps/web/src/features/auth/index.ts`
- Modify: `apps/web/src/widgets/app-header/ui/app-header.tsx` (add AuthSlot)

- [ ] **Step 1: Create AuthButton (server action based)**

`apps/web/src/features/auth/ui/auth-button.tsx`:

```typescript
import { Github } from "lucide-react";

import { signIn } from "@/auth";
import { Button } from "@/shared/ui/button";

export const AuthButton = () => {
  const handleSignIn = async () => {
    "use server";
    await signIn("github", { redirectTo: "/" });
  };

  return (
    <form action={handleSignIn}>
      <Button type="submit" variant="outline" size="sm">
        <Github className="mr-2 size-4" />
        GitHubでログイン
      </Button>
    </form>
  );
};
```

- [ ] **Step 2: Create UserMenu**

`apps/web/src/features/auth/ui/user-menu.tsx`:

```typescript
import { LogOut } from "lucide-react";
import Link from "next/link";

import { auth, signOut } from "@/auth";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export const UserMenu = async () => {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  const initial = session.user.name?.[0] ?? session.user.email?.[0] ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon-sm" aria-label="User menu">
            {session.user.image !== null && session.user.image !== undefined ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="size-6 rounded-full"
              />
            ) : (
              <span className="text-xs font-medium">{initial}</span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {session.user.name ?? session.user.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/webhooks">Webhooks</Link>} />
        <DropdownMenuItem render={<Link href="/watches">Tag Watches</Link>} />
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form action={handleSignOut} className="flex w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="size-4" />
              ログアウト
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

- [ ] **Step 3: Create feature barrel**

`apps/web/src/features/auth/index.ts`:

```typescript
export { AuthButton } from "./ui/auth-button";
export { UserMenu } from "./ui/user-menu";
```

- [ ] **Step 4: Add AuthSlot to header**

Check current structure of `apps/web/src/widgets/app-header/ui/app-header.tsx`. Add an auth slot that conditionally renders AuthButton or UserMenu:

```typescript
// In app-header.tsx, add to the header's right side:
import { AuthButton, UserMenu } from "@/features/auth";
import { auth } from "@/auth";

// In the component (make it async):
const session = await auth();

// In JSX, add to the right-side slot:
{session?.user ? <UserMenu /> : <AuthButton />}
```

Note: `app-header.tsx` must become an async server component for this.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint
pnpm dev
```

Visit `http://localhost:3000`, click GitHub login, verify UserMenu appears after login.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/auth/ apps/web/src/widgets/app-header/
git commit -m "feat(web): add auth button and user menu to header"
```

---

### Task 5: Webhook CRUD API

**Files:**
- Create: `apps/web/app/api/webhooks/route.ts`
- Create: `apps/web/app/api/webhooks/[id]/route.ts`

- [ ] **Step 1: Implement GET & POST /api/webhooks**

`apps/web/app/api/webhooks/route.ts`:

```typescript
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getDb, webhooks } from "@nicolens/datastore";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;
const BLOCKED = new Set(["localhost", "0.0.0.0", "[::1]"]);
const VALID_FORMATS = new Set(["generic", "discord"]);

const isValidHttpsUrl = (url: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const h = parsed.hostname;
  if (BLOCKED.has(h)) return false;
  if (h.startsWith("127.") || h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
};

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, session.user.id))
    .orderBy(desc(webhooks.createdAt));

  return NextResponse.json({ webhooks: rows });
};

export const POST = async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b["name"] === "string" ? b["name"].trim() : "";
  const url = typeof b["url"] === "string" ? b["url"].trim() : "";
  const format = typeof b["format"] === "string" && VALID_FORMATS.has(b["format"]) ? b["format"] : "generic";

  if (name === "") {
    return NextResponse.json({ error: "name required" }, { status: HTTP_BAD_REQUEST });
  }
  if (!isValidHttpsUrl(url)) {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: HTTP_BAD_REQUEST });
  }

  const id = crypto.randomUUID();
  const db = getDb();
  await db.insert(webhooks).values({
    id,
    userId: session.user.id,
    name,
    url,
    format,
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id });
};
```

- [ ] **Step 2: Implement PATCH & DELETE /api/webhooks/[id]**

`apps/web/app/api/webhooks/[id]/route.ts`:

```typescript
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getDb, webhooks } from "@nicolens/datastore";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (typeof b["name"] === "string") updates["name"] = b["name"].trim();
  if (typeof b["isActive"] === "boolean") updates["isActive"] = b["isActive"];

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: HTTP_BAD_REQUEST });
  }

  const db = getDb();
  const result = await db
    .update(webhooks)
    .set(updates)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, session.user.id)))
    .returning({ id: webhooks.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }
  return NextResponse.json({ success: true });
};

export const DELETE = async (_request: NextRequest, { params }: RouteParams) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const { id } = await params;
  const db = getDb();
  const result = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, session.user.id)))
    .returning({ id: webhooks.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }
  return NextResponse.json({ success: true });
};
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/webhooks/
git commit -m "feat(web): add webhooks CRUD API routes"
```

---

### Task 6: Tag Trigger CRUD API

**Files:**
- Create: `apps/web/app/api/watches/route.ts`
- Create: `apps/web/app/api/watches/[id]/route.ts`

- [ ] **Step 1: Implement GET & POST /api/watches**

`apps/web/app/api/watches/route.ts`:

```typescript
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getDb, tagTriggers, webhooks } from "@nicolens/datastore";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
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

export const POST = async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }

  const b = body as Record<string, unknown>;
  const tag = typeof b["tag"] === "string" ? b["tag"].trim() : "";
  const webhookId = typeof b["webhookId"] === "string" ? b["webhookId"] : "";

  if (tag === "" || webhookId === "") {
    return NextResponse.json({ error: "tag and webhookId required" }, { status: HTTP_BAD_REQUEST });
  }

  // Verify webhook ownership
  const db = getDb();
  const ownedWebhook = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.userId, session.user.id)))
    .limit(1);

  if (ownedWebhook.length === 0) {
    return NextResponse.json({ error: "Webhook not found" }, { status: HTTP_BAD_REQUEST });
  }

  const id = crypto.randomUUID();
  await db
    .insert(tagTriggers)
    .values({
      id,
      userId: session.user.id,
      tag,
      webhookId,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();

  return NextResponse.json({ id });
};
```

- [ ] **Step 2: Implement PATCH & DELETE /api/watches/[id]**

`apps/web/app/api/watches/[id]/route.ts`:

```typescript
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getDb, tagTriggers } from "@nicolens/datastore";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = async (request: NextRequest, { params }: RouteParams) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (typeof b["isActive"] === "boolean") updates["isActive"] = b["isActive"];

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: HTTP_BAD_REQUEST });
  }

  const db = getDb();
  const result = await db
    .update(tagTriggers)
    .set(updates)
    .where(and(eq(tagTriggers.id, id), eq(tagTriggers.userId, session.user.id)))
    .returning({ id: tagTriggers.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }
  return NextResponse.json({ success: true });
};

export const DELETE = async (_request: NextRequest, { params }: RouteParams) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const { id } = await params;
  const db = getDb();
  const result = await db
    .delete(tagTriggers)
    .where(and(eq(tagTriggers.id, id), eq(tagTriggers.userId, session.user.id)))
    .returning({ id: tagTriggers.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }
  return NextResponse.json({ success: true });
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/watches/
git commit -m "feat(web): add tag trigger CRUD API routes"
```

---

### Task 7: /webhooks Page

**Files:**
- Create: `apps/web/src/features/webhook/ui/webhook-list.tsx`
- Create: `apps/web/src/features/webhook/ui/webhook-form.tsx`
- Create: `apps/web/src/features/webhook/index.ts`
- Create: `apps/web/src/pages/webhooks/ui/webhooks-page.tsx`
- Create: `apps/web/src/pages/webhooks/index.ts`
- Create: `apps/web/app/webhooks/page.tsx`

- [ ] **Step 1: Create WebhookForm (client)**

`apps/web/src/features/webhook/ui/webhook-form.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const formatSelectValue = (value: unknown): string => {
  if (value === "discord") return "Discord";
  return "Generic";
};

export const WebhookForm = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("generic");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), url: url.trim(), format }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to create webhook");
      setSubmitting(false);
      return;
    }

    setName("");
    setUrl("");
    setSubmitting(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-medium">Webhookを追加</h3>
      <div className="space-y-1">
        <Label className="text-xs">名前</Label>
        <Input value={name} onChange={(e) => { setName(e.target.value); }} placeholder="My Discord" required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">URL (https only)</Label>
        <Input type="url" value={url} onChange={(e) => { setUrl(e.target.value); }} placeholder="https://discord.com/api/webhooks/..." required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">形式</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger><SelectValue>{formatSelectValue}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="generic">Generic</SelectItem>
            <SelectItem value="discord">Discord</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error !== null && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>{submitting ? "追加中..." : "追加"}</Button>
    </form>
  );
};
```

- [ ] **Step 2: Create WebhookList (client)**

`apps/web/src/features/webhook/ui/webhook-list.tsx`:

```typescript
"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/ui/button";

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  format: string;
  isActive: boolean;
  createdAt: string;
}

interface WebhookListProps {
  webhooks: WebhookEntry[];
}

const maskUrl = (url: string): string => {
  if (url.length <= 30) return url;
  return `${url.slice(0, 20)}...${url.slice(-6)}`;
};

export const WebhookList = ({ webhooks }: WebhookListProps) => {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!globalThis.confirm("削除しますか?")) return;
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    router.refresh();
  };

  if (webhooks.length === 0) {
    return <p className="text-sm text-muted-foreground">Webhookが登録されていません</p>;
  }

  return (
    <ul className="space-y-2">
      {webhooks.map((w) => (
        <li key={w.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
          <div className="flex-1 space-y-1">
            <div className="font-medium">{w.name}</div>
            <div className="font-mono text-xs text-muted-foreground">{maskUrl(w.url)}</div>
            <div className="text-xs text-muted-foreground">形式: {w.format === "discord" ? "Discord" : "Generic"}</div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => void handleDelete(w.id)} aria-label="削除">
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
};
```

- [ ] **Step 3: Create feature barrel**

`apps/web/src/features/webhook/index.ts`:

```typescript
export { WebhookForm } from "./ui/webhook-form";
export { WebhookList } from "./ui/webhook-list";
```

- [ ] **Step 4: Create page composition (server component)**

`apps/web/src/pages/webhooks/ui/webhooks-page.tsx`:

```typescript
import { desc, eq } from "drizzle-orm";

import { getDb, webhooks } from "@nicolens/datastore";

import { auth } from "@/auth";
import { WebhookForm, WebhookList } from "@/features/webhook";

export const WebhooksPage = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return <p className="p-8 text-center">ログインが必要です</p>;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, session.user.id))
    .orderBy(desc(webhooks.createdAt));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Webhooks</h1>
      <WebhookForm />
      <WebhookList webhooks={rows} />
    </div>
  );
};
```

`apps/web/src/pages/webhooks/index.ts`:

```typescript
export { WebhooksPage } from "./ui/webhooks-page";
```

- [ ] **Step 5: Create app router page**

`apps/web/app/webhooks/page.tsx`:

```typescript
import { WebhooksPage } from "@/pages/webhooks";

// oxlint-disable-next-line import/no-default-export -- Next.js page requires default export
export default function WebhooksRoute() {
  return <WebhooksPage />;
}
```

- [ ] **Step 6: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/webhook/ apps/web/src/pages/webhooks/ apps/web/app/webhooks/
git commit -m "feat(web): add webhooks management page"
```

---

### Task 8: /watches Page

**Files:**
- Create: `apps/web/src/features/tag-watch/ui/tag-watch-list.tsx`
- Create: `apps/web/src/features/tag-watch/ui/tag-watch-form.tsx`
- Create: `apps/web/src/features/tag-watch/index.ts`
- Create: `apps/web/src/pages/watches/ui/watches-page.tsx`
- Create: `apps/web/src/pages/watches/index.ts`
- Create: `apps/web/app/watches/page.tsx`

- [ ] **Step 1: Create TagWatchForm**

`apps/web/src/features/tag-watch/ui/tag-watch-form.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

interface WebhookOption {
  id: string;
  name: string;
}

interface TagWatchFormProps {
  webhooks: WebhookOption[];
}

const makeFormatSelectValue = (webhooks: WebhookOption[]) => (value: unknown): string => {
  if (typeof value !== "string") return "Webhookを選択";
  return webhooks.find((w) => w.id === value)?.name ?? "Webhookを選択";
};

export const TagWatchForm = ({ webhooks }: TagWatchFormProps) => {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [webhookId, setWebhookId] = useState(webhooks[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: tag.trim(), webhookId }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed");
      setSubmitting(false);
      return;
    }

    setTag("");
    setSubmitting(false);
    router.refresh();
  };

  if (webhooks.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm">
        <p>まず <a href="/webhooks" className="underline">Webhooks</a> を登録してください</p>
      </div>
    );
  }

  const formatValue = makeFormatSelectValue(webhooks);

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-medium">タグ監視を追加</h3>
      <div className="space-y-1">
        <Label className="text-xs">タグ</Label>
        <Input value={tag} onChange={(e) => { setTag(e.target.value); }} placeholder="VOCALOID" required />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">通知先 Webhook</Label>
        <Select value={webhookId} onValueChange={setWebhookId}>
          <SelectTrigger><SelectValue>{formatValue}</SelectValue></SelectTrigger>
          <SelectContent>
            {webhooks.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error !== null && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>{submitting ? "追加中..." : "追加"}</Button>
    </form>
  );
};
```

- [ ] **Step 2: Create TagWatchList**

`apps/web/src/features/tag-watch/ui/tag-watch-list.tsx`:

```typescript
"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface TagWatchEntry {
  id: string;
  tag: string;
  webhookName: string;
  isActive: boolean;
  createdAt: string;
}

interface TagWatchListProps {
  triggers: TagWatchEntry[];
}

export const TagWatchList = ({ triggers }: TagWatchListProps) => {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!globalThis.confirm("削除しますか?")) return;
    await fetch(`/api/watches/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/watches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  };

  if (triggers.length === 0) {
    return <p className="text-sm text-muted-foreground">タグ監視が登録されていません</p>;
  }

  return (
    <ul className="space-y-2">
      {triggers.map((t) => (
        <li key={t.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">#{t.tag}</span>
              <Badge variant={t.isActive ? "default" : "secondary"}>
                {t.isActive ? "有効" : "停止中"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">→ {t.webhookName}</div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => void handleToggle(t.id, t.isActive)}>
              {t.isActive ? "停止" : "再開"}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => void handleDelete(t.id)} aria-label="削除">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
};
```

- [ ] **Step 3: Create feature barrel**

`apps/web/src/features/tag-watch/index.ts`:

```typescript
export { TagWatchForm } from "./ui/tag-watch-form";
export { TagWatchList } from "./ui/tag-watch-list";
```

- [ ] **Step 4: Create page composition**

`apps/web/src/pages/watches/ui/watches-page.tsx`:

```typescript
import { desc, eq } from "drizzle-orm";

import { getDb, tagTriggers, webhooks } from "@nicolens/datastore";

import { auth } from "@/auth";
import { TagWatchForm, TagWatchList } from "@/features/tag-watch";

export const WatchesPage = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return <p className="p-8 text-center">ログインが必要です</p>;
  }

  const db = getDb();
  const [userWebhooks, triggers] = await Promise.all([
    db
      .select({ id: webhooks.id, name: webhooks.name })
      .from(webhooks)
      .where(eq(webhooks.userId, session.user.id)),
    db
      .select({
        id: tagTriggers.id,
        tag: tagTriggers.tag,
        webhookName: webhooks.name,
        isActive: tagTriggers.isActive,
        createdAt: tagTriggers.createdAt,
      })
      .from(tagTriggers)
      .innerJoin(webhooks, eq(tagTriggers.webhookId, webhooks.id))
      .where(eq(tagTriggers.userId, session.user.id))
      .orderBy(desc(tagTriggers.createdAt)),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Tag Watches</h1>
      <TagWatchForm webhooks={userWebhooks} />
      <TagWatchList triggers={triggers} />
    </div>
  );
};
```

`apps/web/src/pages/watches/index.ts`:

```typescript
export { WatchesPage } from "./ui/watches-page";
```

- [ ] **Step 5: Create app router page**

`apps/web/app/watches/page.tsx`:

```typescript
import { WatchesPage } from "@/pages/watches";

// oxlint-disable-next-line import/no-default-export -- Next.js page requires default export
export default function WatchesRoute() {
  return <WatchesPage />;
}
```

- [ ] **Step 6: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/tag-watch/ apps/web/src/pages/watches/ apps/web/app/watches/
git commit -m "feat(web): add tag watches management page"
```

---

### Task 9: packages/nicovideo-snapshot-api

Snapshot API クライアントを共有パッケージとして抽出する。apps/snapshot-syncer がこれを利用する。

**Files:**
- Create: `packages/nicovideo-snapshot-api/package.json`
- Create: `packages/nicovideo-snapshot-api/tsconfig.json`
- Create: `packages/nicovideo-snapshot-api/vitest.config.ts`
- Create: `packages/nicovideo-snapshot-api/src/types.ts`
- Create: `packages/nicovideo-snapshot-api/src/query-builder.ts`
- Create: `packages/nicovideo-snapshot-api/src/query-builder.test.ts`
- Create: `packages/nicovideo-snapshot-api/src/client.ts`
- Create: `packages/nicovideo-snapshot-api/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@nicolens/nicovideo-snapshot-api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsgo --noEmit"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "@typescript/native-preview": "7.0.0-dev.20260307.1",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Create tsconfig.json and vitest.config.ts**

`packages/nicovideo-snapshot-api/tsconfig.json`:
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

`packages/nicovideo-snapshot-api/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 3: Create types.ts**

`packages/nicovideo-snapshot-api/src/types.ts`:

```typescript
export interface VideoContent {
  contentId: string;
  title: string;
  description?: string;
  userId?: number;
  channelId?: number;
  viewCounter: number;
  mylistCounter: number;
  likeCounter: number;
  lengthSeconds: number;
  thumbnailUrl: string;
  startTime: string;
  lastResBody?: string;
  commentCounter: number;
  lastCommentTime?: string;
  categoryTags?: string;
  tags?: string;
  genre?: string;
}

export interface SnapshotMeta {
  status: number;
  totalCount: number;
  id?: string;
}

export interface SnapshotSearchResponse {
  meta: SnapshotMeta;
  data: VideoContent[];
}

export interface SnapshotErrorResponse {
  meta: {
    status: number;
    errorCode: string;
    errorMessage: string;
  };
}

export interface SearchFilters {
  [field: string]: Record<string, string>;
}

export interface SearchOptions {
  query: string;
  targets: string;
  fields?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
  context?: string;
  userAgent: string;
}
```

- [ ] **Step 4: Write failing test for query-builder**

`packages/nicovideo-snapshot-api/src/query-builder.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildSearchUrl } from "./query-builder";

describe("buildSearchUrl", () => {
  it("builds URL with required params", () => {
    const url = buildSearchUrl({
      query: "VOCALOID",
      targets: "tagsExact",
      userAgent: "test/1.0",
    });
    expect(url).toContain("q=VOCALOID");
    expect(url).toContain("targets=tagsExact");
  });

  it("includes sort and limit when provided", () => {
    const url = buildSearchUrl({
      query: "test",
      targets: "title",
      sort: "-startTime",
      limit: 50,
      userAgent: "test/1.0",
    });
    expect(url).toContain("_sort=-startTime");
    expect(url).toContain("_limit=50");
  });

  it("encodes filters as filters[field][op]=value", () => {
    const url = buildSearchUrl({
      query: "test",
      targets: "title",
      filters: {
        startTime: { gte: "2026-04-11T00:00:00+09:00" },
        viewCounter: { gte: "1000" },
      },
      userAgent: "test/1.0",
    });
    expect(decodeURIComponent(url)).toContain("filters[startTime][gte]=2026-04-11T00:00:00+09:00");
    expect(decodeURIComponent(url)).toContain("filters[viewCounter][gte]=1000");
  });

  it("uses default context when not provided", () => {
    const url = buildSearchUrl({
      query: "test",
      targets: "title",
      userAgent: "test/1.0",
    });
    expect(url).toContain("_context=");
  });
});
```

- [ ] **Step 5: Run test to verify failure**

```bash
pnpm --filter @nicolens/nicovideo-snapshot-api test
```

Expected: FAIL.

- [ ] **Step 6: Implement query-builder.ts**

`packages/nicovideo-snapshot-api/src/query-builder.ts`:

```typescript
import type { SearchOptions } from "./types";

const SNAPSHOT_API = "https://snapshot.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
const DEFAULT_FIELDS = "contentId,title,description,userId,channelId,viewCounter,mylistCounter,likeCounter,lengthSeconds,thumbnailUrl,startTime,lastResBody,commentCounter,lastCommentTime,categoryTags,tags,genre";
const DEFAULT_CONTEXT = "nicolens";

export const buildSearchUrl = (options: SearchOptions): string => {
  const params = new URLSearchParams({
    q: options.query,
    targets: options.targets,
    fields: options.fields ?? DEFAULT_FIELDS,
    _context: options.context ?? DEFAULT_CONTEXT,
  });

  if (options.sort !== undefined) {
    params.set("_sort", options.sort);
  }
  if (options.limit !== undefined) {
    params.set("_limit", String(options.limit));
  }
  if (options.offset !== undefined) {
    params.set("_offset", String(options.offset));
  }

  if (options.filters !== undefined) {
    for (const [field, ops] of Object.entries(options.filters)) {
      for (const [op, val] of Object.entries(ops)) {
        params.set(`filters[${field}][${op}]`, val);
      }
    }
  }

  return `${SNAPSHOT_API}?${params.toString()}`;
};
```

- [ ] **Step 7: Run test to verify pass**

```bash
pnpm --filter @nicolens/nicovideo-snapshot-api test
```

Expected: PASS.

- [ ] **Step 8: Implement client.ts**

`packages/nicovideo-snapshot-api/src/client.ts`:

```typescript
import { buildSearchUrl } from "./query-builder";
import type { SearchOptions, SnapshotErrorResponse, SnapshotSearchResponse } from "./types";

const isSearchResponse = (value: unknown): value is SnapshotSearchResponse =>
  typeof value === "object" &&
  value !== null &&
  "meta" in value &&
  "data" in value &&
  Array.isArray((value as SnapshotSearchResponse).data);

const isErrorResponse = (value: unknown): value is SnapshotErrorResponse =>
  typeof value === "object" &&
  value !== null &&
  "meta" in value &&
  typeof (value as SnapshotErrorResponse).meta.errorCode === "string";

export class SnapshotApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = "SnapshotApiError";
  }
}

export const searchSnapshot = async (
  options: SearchOptions,
): Promise<SnapshotSearchResponse> => {
  const url = buildSearchUrl(options);

  const response = await fetch(url, {
    headers: { "User-Agent": options.userAgent },
  });

  const json: unknown = await response.json();

  if (isErrorResponse(json)) {
    throw new SnapshotApiError(json.meta.status, json.meta.errorCode, json.meta.errorMessage);
  }

  if (!isSearchResponse(json)) {
    throw new SnapshotApiError(response.status, "INVALID_RESPONSE", "Invalid API response format");
  }

  return json;
};
```

- [ ] **Step 9: Create index.ts**

`packages/nicovideo-snapshot-api/src/index.ts`:

```typescript
export { SnapshotApiError, searchSnapshot } from "./client";
export { buildSearchUrl } from "./query-builder";
export type {
  SearchFilters,
  SearchOptions,
  SnapshotErrorResponse,
  SnapshotMeta,
  SnapshotSearchResponse,
  VideoContent,
} from "./types";
```

- [ ] **Step 10: Verify**

```bash
pnpm install
pnpm --filter @nicolens/nicovideo-snapshot-api test
pnpm --filter @nicolens/nicovideo-snapshot-api typecheck
```

- [ ] **Step 11: Commit**

```bash
git add packages/nicovideo-snapshot-api/ pnpm-lock.yaml
git commit -m "feat: add packages/nicovideo-snapshot-api client package"
```

---

### Task 10: apps/snapshot-syncer

**Files:**
- Create: `apps/snapshot-syncer/package.json`
- Create: `apps/snapshot-syncer/tsconfig.json`
- Create: `apps/snapshot-syncer/src/sync-handler.ts`
- Create: `apps/snapshot-syncer/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@nicolens/snapshot-syncer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsgo --noEmit"
  },
  "dependencies": {
    "@nicolens/datastore": "workspace:*",
    "@nicolens/nicovideo-snapshot-api": "workspace:*",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "@typescript/native-preview": "7.0.0-dev.20260307.1",
    "tsx": "^4.19.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

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

- [ ] **Step 3: Implement sync-handler.ts**

`apps/snapshot-syncer/src/sync-handler.ts`:

```typescript
import { eq, lt } from "drizzle-orm";

import { getDb, tagTriggers, watchResults } from "@nicolens/datastore";
import { SnapshotApiError, searchSnapshot } from "@nicolens/nicovideo-snapshot-api";

const LIMIT = 100;
const RETENTION_DAYS = 90;
const MS_PER_DAY = 86400000;
const RATE_LIMIT_MS = 200;
const USER_AGENT = "nicolens-snapshot-syncer/1.0";

const wait = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

interface SyncResult {
  tagsProcessed: number;
  videosStored: number;
  errors: number;
}

export const runSync = async (): Promise<SyncResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const since = new Date(Date.now() - MS_PER_DAY).toISOString();
  const result: SyncResult = { tagsProcessed: 0, videosStored: 0, errors: 0 };

  // Get distinct active tags
  const activeTagRows = await db
    .selectDistinct({ tag: tagTriggers.tag })
    .from(tagTriggers)
    .where(eq(tagTriggers.isActive, true));

  const tags = activeTagRows.map((r) => r.tag);
  console.log(`[snapshot-syncer] Processing ${String(tags.length)} unique tags`);

  for (const tag of tags) {
    result.tagsProcessed++;
    try {
      const response = await searchSnapshot({
        query: tag,
        targets: "tagsExact",
        sort: "-startTime",
        limit: LIMIT,
        filters: { startTime: { gte: since } },
        context: "nicolens-snapshot-syncer",
        userAgent: USER_AGENT,
      });

      if (response.data.length > 0) {
        const rows = response.data.map((video) => ({
          tag,
          contentId: video.contentId,
          videoData: JSON.stringify(video),
          discoveredAt: now,
        }));

        await db.insert(watchResults).values(rows).onConflictDoNothing();
        result.videosStored += response.data.length;
        console.log(`[snapshot-syncer] tag "${tag}": ${String(response.data.length)} videos stored`);
      }
    } catch (error) {
      if (error instanceof SnapshotApiError) {
        console.error(`[snapshot-syncer] Snapshot API error for tag "${tag}": ${error.errorCode}`);
      } else {
        console.error(`[snapshot-syncer] Error for tag "${tag}":`, error);
      }
      result.errors++;
    }

    await wait(RATE_LIMIT_MS);
  }

  // Cleanup
  const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(watchResults).where(lt(watchResults.discoveredAt, cutoff));

  return result;
};
```

- [ ] **Step 4: Implement index.ts**

`apps/snapshot-syncer/src/index.ts`:

```typescript
import { runSync } from "./sync-handler";

const main = async () => {
  console.log("[snapshot-syncer] Starting...");
  const result = await runSync();
  console.log("[snapshot-syncer] Complete:", JSON.stringify(result));
  if (result.errors > 0) {
    process.exitCode = 1;
  }
};

void main();
```

- [ ] **Step 5: Verify**

```bash
pnpm install
pnpm --filter @nicolens/snapshot-syncer typecheck
```

- [ ] **Step 6: Commit**

```bash
git add apps/snapshot-syncer/ pnpm-lock.yaml
git commit -m "feat: add apps/snapshot-syncer using nicovideo-snapshot-api"
```

---

### Task 11: apps/tag-scanner

**Files:**
- Create: `apps/tag-scanner/package.json`
- Create: `apps/tag-scanner/tsconfig.json`
- Create: `apps/tag-scanner/src/scan-handler.ts`
- Create: `apps/tag-scanner/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@nicolens/tag-scanner",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "typecheck": "tsgo --noEmit"
  },
  "dependencies": {
    "@nicolens/datastore": "workspace:*",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "@typescript/native-preview": "7.0.0-dev.20260307.1",
    "tsx": "^4.19.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Same as snapshot-syncer's tsconfig.

- [ ] **Step 3: Implement scan-handler.ts**

`apps/tag-scanner/src/scan-handler.ts`:

```typescript
import { and, eq, notInArray } from "drizzle-orm";

import {
  getDb,
  notificationLog,
  pendingNotifications,
  tagTriggers,
  watchResults,
} from "@nicolens/datastore";

interface VideoContent {
  contentId: string;
  title: string;
  thumbnailUrl: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  startTime: string;
  [key: string]: unknown;
}

interface ScanResult {
  triggersProcessed: number;
  pendingCreated: number;
  errors: number;
}

export const runScan = async (): Promise<ScanResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: ScanResult = { triggersProcessed: 0, pendingCreated: 0, errors: 0 };

  const activeTriggers = await db
    .select()
    .from(tagTriggers)
    .where(eq(tagTriggers.isActive, true));

  console.log(`[tag-scanner] Processing ${String(activeTriggers.length)} triggers`);

  for (const trigger of activeTriggers) {
    result.triggersProcessed++;

    try {
      // Find already-notified content IDs for this trigger
      const alreadyNotified = await db
        .select({ contentId: notificationLog.contentId })
        .from(notificationLog)
        .where(eq(notificationLog.triggerId, trigger.id));

      const notifiedIds = alreadyNotified.map((n) => n.contentId);

      // Find unnotified videos in watch_results for this tag
      const unnotifiedResults = await db
        .select()
        .from(watchResults)
        .where(
          notifiedIds.length > 0
            ? and(eq(watchResults.tag, trigger.tag), notInArray(watchResults.contentId, notifiedIds))
            : eq(watchResults.tag, trigger.tag),
        );

      if (unnotifiedResults.length === 0) {
        continue;
      }

      // Build pending notifications (one per video for simplicity)
      // Actually: batch all videos into one payload per trigger
      const videos: VideoContent[] = [];
      for (const row of unnotifiedResults) {
        try {
          videos.push(JSON.parse(row.videoData) as VideoContent);
        } catch {
          // skip invalid
        }
      }

      if (videos.length === 0) {
        continue;
      }

      const payload = {
        trigger: { type: "tag" as const, tag: trigger.tag },
        videos: videos.map((v) => ({
          contentId: v.contentId,
          title: v.title,
          url: `https://nico.ms/${v.contentId}`,
          thumbnailUrl: v.thumbnailUrl,
          viewCounter: v.viewCounter,
          likeCounter: v.likeCounter,
          commentCounter: v.commentCounter,
          startTime: v.startTime,
        })),
        totalNew: videos.length,
      };

      // One pending row per video (so dispatcher can log individually)
      const pendingRows = videos.map((v) => ({
        id: crypto.randomUUID(),
        webhookId: trigger.webhookId,
        triggerType: "tag",
        triggerId: trigger.id,
        contentId: v.contentId,
        payload: JSON.stringify(payload), // same payload for all rows of this batch
        createdAt: now,
      }));

      await db.insert(pendingNotifications).values(pendingRows);
      result.pendingCreated += pendingRows.length;
      console.log(`[tag-scanner] trigger ${trigger.id} (#${trigger.tag}): ${String(videos.length)} pending`);
    } catch (error) {
      console.error(`[tag-scanner] Error for trigger ${trigger.id}:`, error);
      result.errors++;
    }
  }

  return result;
};
```

- [ ] **Step 4: Implement index.ts**

`apps/tag-scanner/src/index.ts`:

```typescript
import { runScan } from "./scan-handler";

const main = async () => {
  console.log("[tag-scanner] Starting...");
  const result = await runScan();
  console.log("[tag-scanner] Complete:", JSON.stringify(result));
  if (result.errors > 0) {
    process.exitCode = 1;
  }
};

void main();
```

- [ ] **Step 5: Verify & Commit**

```bash
pnpm install
pnpm --filter @nicolens/tag-scanner typecheck
git add apps/tag-scanner/
git commit -m "feat: add apps/tag-scanner (watch_results to pending_notifications)"
```

---

### Task 12: apps/webhook-dispatcher

**Files:**
- Create: `apps/webhook-dispatcher/package.json`
- Create: `apps/webhook-dispatcher/tsconfig.json`
- Create: `apps/webhook-dispatcher/vitest.config.ts`
- Create: `apps/webhook-dispatcher/src/url-validator.ts`
- Create: `apps/webhook-dispatcher/src/url-validator.test.ts`
- Create: `apps/webhook-dispatcher/src/webhook-formats.ts`
- Create: `apps/webhook-dispatcher/src/webhook-formats.test.ts`
- Create: `apps/webhook-dispatcher/src/webhook-sender.ts`
- Create: `apps/webhook-dispatcher/src/dispatcher-handler.ts`
- Create: `apps/webhook-dispatcher/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@nicolens/webhook-dispatcher",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsgo --noEmit"
  },
  "dependencies": {
    "@nicolens/datastore": "workspace:*",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "@nicolens/tsconfig": "workspace:*",
    "@typescript/native-preview": "7.0.0-dev.20260307.1",
    "tsx": "^4.19.0",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Create tsconfig.json and vitest.config.ts**

`apps/webhook-dispatcher/tsconfig.json`:
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

`apps/webhook-dispatcher/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 3: Write failing test for url-validator**

`apps/webhook-dispatcher/src/url-validator.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { validateWebhookUrl } from "./url-validator";

describe("validateWebhookUrl", () => {
  it("accepts valid https URL", () => {
    expect(validateWebhookUrl("https://discord.com/api/webhooks/123/abc")).toBe(true);
  });

  it("rejects http", () => {
    expect(validateWebhookUrl("http://example.com/webhook")).toBe(false);
  });

  it("rejects empty", () => {
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

  it("rejects link-local", () => {
    expect(validateWebhookUrl("https://169.254.1.1/webhook")).toBe(false);
  });
});
```

- [ ] **Step 4: Run to verify failure, then implement**

```bash
pnpm --filter @nicolens/webhook-dispatcher test
```

Expected: FAIL.

Create `apps/webhook-dispatcher/src/url-validator.ts`:

```typescript
const BLOCKED = new Set(["localhost", "0.0.0.0", "[::1]"]);

const isPrivate = (h: string): boolean => {
  if (BLOCKED.has(h)) return true;
  if (h.startsWith("127.")) return true;
  if (h.startsWith("10.")) return true;
  if (h.startsWith("192.168.")) return true;
  if (h.startsWith("169.254.")) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(h);
};

export const validateWebhookUrl = (url: string): boolean => {
  if (url === "") return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return !isPrivate(parsed.hostname);
};
```

Run: `pnpm --filter @nicolens/webhook-dispatcher test` → Expected: PASS.

- [ ] **Step 5: Write failing test for webhook-formats**

`apps/webhook-dispatcher/src/webhook-formats.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { formatDiscord, formatGeneric } from "./webhook-formats";

const payloadStr = JSON.stringify({
  trigger: { type: "tag", tag: "VOCALOID" },
  videos: [
    {
      contentId: "sm123",
      title: "Test",
      url: "https://nico.ms/sm123",
      thumbnailUrl: "https://example.com/t.jpg",
      viewCounter: 1000,
      likeCounter: 50,
      commentCounter: 10,
      startTime: "2026-04-12T10:00:00+09:00",
    },
  ],
  totalNew: 1,
});

describe("formatGeneric", () => {
  it("returns the payload as-is", () => {
    const result = formatGeneric(payloadStr);
    expect(result).toEqual(JSON.parse(payloadStr));
  });
});

describe("formatDiscord", () => {
  it("builds embed with video info", () => {
    const result = formatDiscord(payloadStr);
    expect(result.content).toContain("VOCALOID");
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0].url).toBe("https://nico.ms/sm123");
  });

  it("limits to 10 embeds", () => {
    const videos = Array.from({ length: 15 }, (_, i) => ({
      contentId: `sm${String(i)}`,
      title: `Test ${String(i)}`,
      url: `https://nico.ms/sm${String(i)}`,
      thumbnailUrl: "https://example.com/t.jpg",
      viewCounter: 1,
      likeCounter: 1,
      commentCounter: 1,
      startTime: "2026-04-12T10:00:00+09:00",
    }));
    const big = JSON.stringify({ trigger: { type: "tag", tag: "T" }, videos, totalNew: 15 });
    const result = formatDiscord(big);
    expect(result.embeds).toHaveLength(10);
  });
});
```

Run: FAIL.

Create `apps/webhook-dispatcher/src/webhook-formats.ts`:

```typescript
interface VideoEntry {
  contentId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  startTime: string;
}

interface Payload {
  trigger: { type: string; tag: string };
  videos: VideoEntry[];
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

const DISCORD_MAX = 10;

const fmt = (n: number): string => n.toLocaleString("ja-JP");

const parsePayload = (payloadStr: string): Payload => JSON.parse(payloadStr) as Payload;

export const formatGeneric = (payloadStr: string): Payload => parsePayload(payloadStr);

export const formatDiscord = (payloadStr: string): DiscordPayload => {
  const p = parsePayload(payloadStr);
  return {
    content: `**#${p.trigger.tag}** - ${String(p.totalNew)}件の新着動画`,
    embeds: p.videos.slice(0, DISCORD_MAX).map((v) => ({
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnailUrl !== "" ? { url: v.thumbnailUrl } : undefined,
      fields: [
        { name: "再生", value: fmt(v.viewCounter), inline: true },
        { name: "いいね", value: fmt(v.likeCounter), inline: true },
        { name: "コメント", value: fmt(v.commentCounter), inline: true },
      ],
      timestamp: v.startTime,
    })),
  };
};
```

Run: PASS.

- [ ] **Step 6: Implement webhook-sender.ts**

`apps/webhook-dispatcher/src/webhook-sender.ts`:

```typescript
import { formatDiscord, formatGeneric } from "./webhook-formats";
import { validateWebhookUrl } from "./url-validator";

interface SendParams {
  url: string;
  format: string;
  payloadStr: string;
}

interface SendResult {
  success: boolean;
}

export const sendWebhook = async (params: SendParams): Promise<SendResult> => {
  if (!validateWebhookUrl(params.url)) {
    return { success: false };
  }

  const payload = params.format === "discord" ? formatDiscord(params.payloadStr) : formatGeneric(params.payloadStr);

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

- [ ] **Step 7: Implement dispatcher-handler.ts**

`apps/webhook-dispatcher/src/dispatcher-handler.ts`:

```typescript
import { eq, lt } from "drizzle-orm";

import { getDb, notificationLog, pendingNotifications, webhooks } from "@nicolens/datastore";

import { sendWebhook } from "./webhook-sender";

const RETENTION_DAYS = 90;
const MS_PER_DAY = 86400000;

interface DispatchResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export const runDispatch = async (): Promise<DispatchResult> => {
  const db = getDb();
  const now = new Date().toISOString();
  const result: DispatchResult = { processed: 0, succeeded: 0, failed: 0 };

  const pending = await db.select().from(pendingNotifications);

  console.log(`[webhook-dispatcher] Processing ${String(pending.length)} pending notifications`);

  for (const entry of pending) {
    result.processed++;

    try {
      const [webhook] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, entry.webhookId))
        .limit(1);

      if (webhook === undefined || !webhook.isActive) {
        // Webhook deleted or inactive; drop pending
        await db.delete(pendingNotifications).where(eq(pendingNotifications.id, entry.id));
        continue;
      }

      const sendResult = await sendWebhook({
        url: webhook.url,
        format: webhook.format,
        payloadStr: entry.payload,
      });

      // Record in notification_log
      await db
        .insert(notificationLog)
        .values({
          id: crypto.randomUUID(),
          webhookId: entry.webhookId,
          triggerType: entry.triggerType,
          triggerId: entry.triggerId,
          contentId: entry.contentId,
          sentAt: now,
          success: sendResult.success,
        })
        .onConflictDoNothing();

      // Remove from pending regardless (log records outcome)
      await db.delete(pendingNotifications).where(eq(pendingNotifications.id, entry.id));

      if (sendResult.success) {
        result.succeeded++;
      } else {
        result.failed++;
      }
    } catch (error) {
      console.error(`[webhook-dispatcher] Error processing ${entry.id}:`, error);
      result.failed++;
    }
  }

  // Cleanup old logs
  const cutoff = new Date(Date.now() - RETENTION_DAYS * MS_PER_DAY).toISOString();
  await db.delete(notificationLog).where(lt(notificationLog.sentAt, cutoff));

  return result;
};
```

- [ ] **Step 8: Implement index.ts**

`apps/webhook-dispatcher/src/index.ts`:

```typescript
import { runDispatch } from "./dispatcher-handler";

const main = async () => {
  console.log("[webhook-dispatcher] Starting...");
  const result = await runDispatch();
  console.log("[webhook-dispatcher] Complete:", JSON.stringify(result));
  if (result.failed > 0) {
    process.exitCode = 1;
  }
};

void main();
```

- [ ] **Step 9: Verify**

```bash
pnpm install
pnpm --filter @nicolens/webhook-dispatcher test
pnpm --filter @nicolens/webhook-dispatcher typecheck
```

- [ ] **Step 10: Commit**

```bash
git add apps/webhook-dispatcher/
git commit -m "feat: add apps/webhook-dispatcher (pending_notifications to HTTP)"
```

---

### Task 13: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/tag-watch.yml`
- Modify: `turbo.json`

- [ ] **Step 1: Update turbo.json**

Add `start` task to the `tasks` object:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": {
      "dependsOn": ["^build"],
      "env": ["DATABASE_URL", "GEMINI_API_KEY", "AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "start": { "cache": false },
    "lint": {},
    "fmt": {},
    "fmt:check": {},
    "typecheck": {},
    "knip": {}
  }
}
```

- [ ] **Step 2: Create workflow**

`.github/workflows/tag-watch.yml`:

```yaml
name: Tag Watch Pipeline

on:
  schedule:
    - cron: '10 20 * * *' # UTC 20:10 = JST 5:10
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nicolens/snapshot-syncer start
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  scan:
    needs: sync
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nicolens/tag-scanner start
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  dispatch:
    needs: scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nicolens/webhook-dispatcher start
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

- [ ] **Step 3: Manual setup — Add DATABASE_URL to GitHub Secrets**

Developer must: Repo Settings → Secrets and variables → Actions → New repository secret → `DATABASE_URL` = Neon connection string.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/tag-watch.yml turbo.json
git commit -m "ci: add daily tag watch pipeline workflow"
```

---

### Task 14: Final Verification

- [ ] **Step 1: Run full check suite**

```bash
pnpm check
```

Fix any lint, format, typecheck, or knip issues. Common fixes:
- Unused imports: remove
- knip unused: add to `apps/web/knip.json` ignore list
- Type errors: fix

- [ ] **Step 2: Manual E2E test**

1. `pnpm dev` → http://localhost:3000
2. Click "GitHubでログイン" → OAuth → redirect back
3. Click avatar → "Webhooks" → add webhook (use https://webhook.site URL)
4. Click avatar → "Tag Watches" → add "VOCALOID" watch pointing to the webhook
5. Run services manually:
   ```bash
   pnpm --filter @nicolens/snapshot-syncer start
   pnpm --filter @nicolens/tag-scanner start
   pnpm --filter @nicolens/webhook-dispatcher start
   ```
6. Check webhook.site for the test payload

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint and type issues for tag watch feature"
```

- [ ] **Step 4: Trigger workflow manually on GitHub**

Actions tab → "Tag Watch Pipeline" → "Run workflow" → verify all 3 jobs succeed
