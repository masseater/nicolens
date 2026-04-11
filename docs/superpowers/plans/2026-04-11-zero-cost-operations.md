# Zero-Cost Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all operational costs by removing Vercel Image Optimization dependency, adding Gemini API usage monitoring with auto-stop, and implementing DB storage controls.

**Architecture:** Four independent changes: (1) replace `next/image` with native `<img>`, (2) new usage-monitor module for Gemini API rate control, (3) tagless data retention cleanup in crawl-db, (4) DB storage size monitoring. All changes are server-side except the image component.

**Tech Stack:** Next.js 16, Drizzle ORM, Vitest, TypeScript strict mode, oxlint

**Spec:** `docs/superpowers/specs/2026-04-11-zero-cost-operations-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `apps/web/src/entities/video/ui/video-thumbnail-image.tsx` | Replace `next/image` with `<img>` |
| Modify | `apps/web/src/entities/video/ui/video-thumbnail-image.test.tsx` | Remove `next/image` mock |
| Modify | `apps/web/next.config.ts` | Remove `images` config |
| Create | `apps/web/src/shared/lib/usage-monitor.ts` | Daily Gemini API usage counter with auto-stop |
| Create | `apps/web/src/shared/lib/usage-monitor.test.ts` | Unit tests for usage monitor |
| Modify | `apps/web/app/api/semantic-search/route.ts` | Check usage limit before embedding generation |
| Modify | `apps/web/app/api/embed/route.ts` | Check usage limit before each embedding |
| Modify | `apps/web/app/api/tagless/crawl-db.ts` | Add data retention cleanup + storage monitoring |
| Create | `apps/web/app/api/tagless/crawl-db.test.ts` | Tests for cleanup + monitoring (if not exists, extend existing) |

---

### Task 1: Replace `next/image` with native `<img>`

**Files:**
- Modify: `apps/web/src/entities/video/ui/video-thumbnail-image.tsx`
- Modify: `apps/web/src/entities/video/ui/video-thumbnail-image.test.tsx`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Update `video-thumbnail-image.tsx` to use native `<img>`**

Replace the entire file content. Key changes: remove `import Image from "next/image"`, use `<img>` with `loading="lazy"` and `decoding="async"`. Keep all existing behavior (shimmer placeholder, error fallback, opacity transition).

```tsx
"use client";

import { useCallback, useState } from "react";

import { toLargeThumbnailUrl } from "../lib/video-url";

interface VideoThumbnailImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export const VideoThumbnailImage = ({
  src,
  alt,
  width,
  height,
  className,
}: VideoThumbnailImageProps) => {
  const [imgSrc, setImgSrc] = useState(() => toLargeThumbnailUrl(src));
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    setImgSrc((current) => {
      if (current !== src) {
        return src;
      }
      return current;
    });
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
          <span className="text-xs text-muted-foreground">読み込み中...</span>
        </div>
      )}
      {/* oxlint-disable-next-line nextjs/no-img-element -- intentionally avoid next/image to eliminate Vercel Image Optimization costs */}
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className ?? ""} transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        decoding="async"
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  );
};
```

- [ ] **Step 2: Update test to remove `next/image` mock**

Replace `video-thumbnail-image.test.tsx`. The `vi.mock("next/image", ...)` block is no longer needed since the component uses native `<img>`.

```tsx
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VideoThumbnailImage } from "./video-thumbnail-image";

describe("VideoThumbnailImage", () => {
  it("renders image with large thumbnail URL (.L suffix) initially", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.L");
  });

  it("shows loading state before image loads", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    expect(view.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("image has opacity-0 class before loading completes", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img.className).toContain("opacity-0");
  });

  it("applies custom className to img element", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
        className="custom-class"
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img.className).toContain("custom-class");
  });

  it("sets width and height attributes on img", () => {
    const { container } = render(
      <VideoThumbnailImage
        src="https://example.com/thumb"
        alt="Test Video"
        width={352}
        height={198}
      />,
    );
    const view = within(container);

    const img = view.getByAltText("Test Video");
    expect(img).toHaveAttribute("width", "352");
    expect(img).toHaveAttribute("height", "198");
  });
});
```

- [ ] **Step 3: Remove `images` config from `next.config.ts`**

Remove the `images` block and the two unused constants (`SECONDS_PER_HOUR`, `THUMBNAIL_CACHE_HOURS`):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

// oxlint-disable-next-line import/no-default-export -- Next.js requires default export for config
export default nextConfig;
```

- [ ] **Step 4: Run tests and lint**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm --filter @nicolens/web test -- --run apps/web/src/entities/video/ui/video-thumbnail-image.test.tsx`
Expected: All 5 tests pass.

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/entities/video/ui/video-thumbnail-image.tsx apps/web/src/entities/video/ui/video-thumbnail-image.test.tsx apps/web/next.config.ts
git commit -m "perf: replace next/image with native img to eliminate Vercel Image Optimization costs"
```

---

### Task 2: Create Gemini API usage monitor

**Files:**
- Create: `apps/web/src/shared/lib/usage-monitor.ts`
- Create: `apps/web/src/shared/lib/usage-monitor.test.ts`

- [ ] **Step 1: Write the failing tests for usage monitor**

Create `apps/web/src/shared/lib/usage-monitor.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUsageStats, recordUsage, resetUsageForTesting } from "./usage-monitor";

describe("usage-monitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2025-01-15 10:00:00 JST = 2025-01-15 01:00:00 UTC
    vi.setSystemTime(new Date("2025-01-15T01:00:00Z"));
    resetUsageForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("recordUsage", () => {
    it("allows usage when under limit", () => {
      const result = recordUsage();
      expect(result.allowed).toBe(true);
    });

    it("increments count on each call", () => {
      recordUsage();
      recordUsage();
      recordUsage();
      const stats = getUsageStats();
      expect(stats.count).toBe(3);
    });

    it("rejects usage when daily limit is reached", () => {
      vi.stubEnv("GEMINI_DAILY_LIMIT", "3");
      resetUsageForTesting();

      expect(recordUsage().allowed).toBe(true);
      expect(recordUsage().allowed).toBe(true);
      expect(recordUsage().allowed).toBe(true);
      expect(recordUsage().allowed).toBe(false);
    });

    it("resets counter when JST date changes", () => {
      vi.stubEnv("GEMINI_DAILY_LIMIT", "3");
      resetUsageForTesting();

      recordUsage();
      recordUsage();
      recordUsage();
      expect(recordUsage().allowed).toBe(false);

      // Advance to next JST day (15:00 UTC = 00:00 JST next day)
      vi.setSystemTime(new Date("2025-01-15T15:00:00Z"));
      expect(recordUsage().allowed).toBe(true);
    });
  });

  describe("getUsageStats", () => {
    it("returns current count and limit", () => {
      recordUsage();
      const stats = getUsageStats();
      expect(stats.count).toBe(1);
      expect(stats.limit).toBe(1000);
      expect(stats.date).toBe("2025-01-15");
    });

    it("respects GEMINI_DAILY_LIMIT env var", () => {
      vi.stubEnv("GEMINI_DAILY_LIMIT", "500");
      resetUsageForTesting();

      const stats = getUsageStats();
      expect(stats.limit).toBe(500);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm --filter @nicolens/web test -- --run apps/web/src/shared/lib/usage-monitor.test.ts`
Expected: FAIL — module `./usage-monitor` not found.

- [ ] **Step 3: Implement usage monitor**

Create `apps/web/src/shared/lib/usage-monitor.ts`:

```ts
import { JST_OFFSET_HOURS, MINUTES_PER_HOUR, MS_PER_SECOND, SECONDS_PER_MINUTE } from "./constants";

const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const DEFAULT_DAILY_LIMIT = 1000;
const WARN_THRESHOLD = 0.8;
const PAD_WIDTH = 2;
const MONTH_OFFSET = 1;

const getDailyLimit = (): number => {
  const env = process.env["GEMINI_DAILY_LIMIT"];
  if (env === undefined || env === "") {
    return DEFAULT_DAILY_LIMIT;
  }
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_LIMIT;
};

const getJstDateString = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  const day = String(jst.getUTCDate()).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}-${day}`;
};

let currentDate = "";
let requestCount = 0;

const ensureDateCurrent = (): void => {
  const today = getJstDateString();
  if (today !== currentDate) {
    currentDate = today;
    requestCount = 0;
  }
};

export const recordUsage = (): { allowed: boolean } => {
  ensureDateCurrent();
  const limit = getDailyLimit();

  if (requestCount >= limit) {
    console.error(`[usage-monitor] Gemini API daily limit reached: ${String(requestCount)}/${String(limit)} (${currentDate})`);
    return { allowed: false };
  }

  requestCount++;

  const ratio = requestCount / limit;
  if (ratio >= WARN_THRESHOLD) {
    console.warn(`[usage-monitor] Gemini API usage at ${String(Math.round(ratio * 100))}%: ${String(requestCount)}/${String(limit)} (${currentDate})`);
  }

  return { allowed: true };
};

export const getUsageStats = (): { count: number; limit: number; date: string } => {
  ensureDateCurrent();
  return { count: requestCount, limit: getDailyLimit(), date: currentDate };
};

/** Reset internal state. Only for use in tests. */
export const resetUsageForTesting = (): void => {
  currentDate = "";
  requestCount = 0;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm --filter @nicolens/web test -- --run apps/web/src/shared/lib/usage-monitor.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shared/lib/usage-monitor.ts apps/web/src/shared/lib/usage-monitor.test.ts
git commit -m "feat: add Gemini API daily usage monitor with auto-stop"
```

---

### Task 3: Integrate usage monitor into API routes

**Files:**
- Modify: `apps/web/app/api/semantic-search/route.ts`
- Modify: `apps/web/app/api/embed/route.ts`

- [ ] **Step 1: Add usage check to semantic-search route**

In `apps/web/app/api/semantic-search/route.ts`, add import and check before embedding generation.

Add import at top (after existing imports):

```ts
import { recordUsage } from "@/shared/lib/usage-monitor";
```

Add a new constant:

```ts
const HTTP_SERVICE_UNAVAILABLE = 503;
```

Modify `executeSemanticSearch` to check usage before calling `generateQueryEmbedding`. Replace the function's first two lines:

```ts
// Old:
const executeSemanticSearch = async (params: {
  query: string;
  page: number;
  limit: number;
}): Promise<SemanticSearchResponse> => {
  const queryEmbedding = await generateQueryEmbedding(params.query);

// New:
const executeSemanticSearch = async (params: {
  query: string;
  page: number;
  limit: number;
}): Promise<SemanticSearchResponse | null> => {
  const usage = recordUsage();
  if (!usage.allowed) {
    return null;
  }
  const queryEmbedding = await generateQueryEmbedding(params.query);
```

Modify `processSemanticRequest` to handle the `null` return. After the `executeSemanticSearch` call:

```ts
// Old:
  const response = await executeSemanticSearch(params);
  return storeSemanticCache(cacheKey, response);

// New:
  const response = await executeSemanticSearch(params);
  if (response === null) {
    return NextResponse.json(
      { error: "API利用制限に達しました。明日再度お試しください。" },
      { status: HTTP_SERVICE_UNAVAILABLE },
    );
  }
  return storeSemanticCache(cacheKey, response);
```

- [ ] **Step 2: Add usage check to embed route**

In `apps/web/app/api/embed/route.ts`, add import and check before each embedding.

Add import at top (after existing imports):

```ts
import { recordUsage } from "@/shared/lib/usage-monitor";
```

Add a new constant:

```ts
const HTTP_SERVICE_UNAVAILABLE = 503;
```

Modify `embedAndStore` to check usage before calling `generateDocumentEmbedding`. Add the check after the existing-check guard:

```ts
// Old (after the existing.length check):
  const embedding = await generateDocumentEmbedding({

// New:
  const usage = recordUsage();
  if (!usage.allowed) {
    return;
  }

  const embedding = await generateDocumentEmbedding({
```

Add a top-level usage check in the `POST` handler to fail fast when limit is already reached. Add before `processVideoBatch`:

```ts
// Old:
    const result = await processVideoBatch(body.videos);
    return NextResponse.json(result);

// New:
    const preCheck = recordUsage();
    if (!preCheck.allowed) {
      return NextResponse.json(
        { error: "API利用制限に達しました。明日再度お試しください。" },
        { status: HTTP_SERVICE_UNAVAILABLE },
      );
    }

    const result = await processVideoBatch(body.videos);
    return NextResponse.json(result);
```

Note: The `POST` handler does a pre-check (`recordUsage()` increments the counter), and each individual `embedAndStore` also checks. This is intentional — the pre-check catches "already exhausted" early, while the per-video check catches mid-batch exhaustion.

- [ ] **Step 3: Run tests and lint**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm --filter @nicolens/web test -- --run && pnpm lint`
Expected: All tests pass, no lint errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/semantic-search/route.ts apps/web/app/api/embed/route.ts
git commit -m "feat: integrate Gemini API usage monitor into semantic-search and embed routes"
```

---

### Task 4: Add tagless data retention + DB storage monitoring

**Files:**
- Modify: `apps/web/app/api/tagless/crawl-db.ts`

- [ ] **Step 1: Add `cleanupOldMonths` and `checkStorageUsage` to `crawl-db.ts`**

Add imports at the top:

```ts
import { eq, inArray, sql } from "drizzle-orm";
```

(Replace the existing `import { eq } from "drizzle-orm";`)

Add constants:

```ts
const DEFAULT_RETENTION_MONTHS = 6;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;
const MONTHS_PER_YEAR = 12;
const BYTES_PER_MB = 1024 * 1024;
const STORAGE_WARN_MB = 400;
```

Add `cleanupOldMonths` function before the `isCrawlFresh` export:

```ts
const getRetentionCutoff = (): string => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - DEFAULT_RETENTION_MONTHS);
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}`;
};

const cleanupOldMonths = async (): Promise<void> => {
  const db = getDb();
  const cutoff = getRetentionCutoff();

  const allStatuses = await db.select({ month: taglessCrawlStatus.month }).from(taglessCrawlStatus);
  const oldMonths = allStatuses
    .map((row) => row.month)
    .filter((month) => month < cutoff);

  if (oldMonths.length === 0) {
    return;
  }

  await db.delete(taglessVideos).where(inArray(taglessVideos.month, oldMonths));
  await db.delete(taglessCrawlStatus).where(inArray(taglessCrawlStatus.month, oldMonths));

  console.info(`[crawl-db] Cleaned up ${String(oldMonths.length)} old month(s): ${oldMonths.join(", ")}`);
};
```

Add `checkStorageUsage` function:

```ts
const checkStorageUsage = async (): Promise<void> => {
  const db = getDb();
  const result = await db
    .select({ size: sql<number>`pg_database_size(current_database())` })
    .from(sql`(SELECT 1) as _dummy`);
  const sizeBytes = result[0]?.size ?? 0;
  const sizeMb = sizeBytes / BYTES_PER_MB;

  if (sizeMb > STORAGE_WARN_MB) {
    console.warn(`[crawl-db] DB storage at ${String(Math.round(sizeMb))}MB — approaching Neon free tier limit (500MB)`);
  }
};
```

- [ ] **Step 2: Call cleanup and monitoring from `saveVideosToDb`**

Modify `saveVideosToDb` to call both functions after saving:

```ts
// Old (end of saveVideosToDb):
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

// New:
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

  await cleanupOldMonths();
  await checkStorageUsage();
```

- [ ] **Step 3: Run tests and lint**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm --filter @nicolens/web test -- --run && pnpm lint`
Expected: All tests pass, no lint errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/tagless/crawl-db.ts
git commit -m "feat: add tagless data retention cleanup and DB storage monitoring"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full check suite**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm check`
Expected: lint + fmt:check + typecheck + knip all pass.

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/pc386/ghq/github.com/masseater/nicolens=refine && pnpm --filter @nicolens/web test -- --run`
Expected: All tests pass.

- [ ] **Step 3: Verify no `next/image` usage remains**

Run: `grep -r "from \"next/image\"" apps/web/src/`
Expected: No output (no imports of `next/image` in src/).

- [ ] **Step 4: Verify usage monitor is integrated**

Run: `grep -r "recordUsage" apps/web/`
Expected: Matches in `usage-monitor.ts`, `usage-monitor.test.ts`, `semantic-search/route.ts`, `embed/route.ts`.
