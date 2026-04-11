# Zero-Cost Operations Design

## Goal

Reduce operational costs to 0 yen/month while keeping all features (normal search, tagless search, semantic search).

## Cost Drivers

| Driver | Current State | Free Tier Limit | Risk |
|---|---|---|---|
| Vercel Image Optimization | `next/image` proxies Niconico CDN thumbnails | Hobby: 5,000 transformations/month | HIGH - 50-200 searches exhaust quota, 402 errors break thumbnails |
| Gemini Embedding API | `gemini-embedding-001` for semantic search | Free: 10M tokens/min (no daily cap) | LOW - but no monitoring means bugs/abuse go unnoticed |
| PostgreSQL (Neon) | pgvector for embeddings + tagless crawl data | Free: 0.5GB storage, 100 CU-hours/month | MEDIUM - monthly crawl data accumulates without cleanup |

## Changes

### 1. Replace `next/image` with native `<img>`

**File:** `apps/web/src/entities/video/ui/video-thumbnail-image.tsx`

Remove `import Image from "next/image"` and use a native `<img>` tag. Niconico CDN already serves appropriately-sized thumbnails via the `.L` suffix (352x198). No server-side image transformation is needed.

Also remove `images` config from `apps/web/next.config.ts` since no remote patterns are needed without `next/image`.

Maintain existing behavior:
- Shimmer loading placeholder before image loads
- Fallback from `.L` URL to original URL on error
- `loading="lazy"` for native lazy loading
- Opacity transition on load

**Test update:** `video-thumbnail-image.test.tsx` currently mocks `next/image` as `<img>`. Remove the mock since the component will use `<img>` directly.

### 2. Gemini API Usage Monitor + Auto-Stop

**New file:** `apps/web/src/shared/lib/usage-monitor.ts`

In-memory daily request counter for Gemini API calls:

- Tracks request count per JST day (resets at JST 00:00)
- Default daily limit: 1,000 requests
- At 80% (800 requests): `console.warn` alert (visible in Vercel logs)
- At 100% (1,000 requests): `console.error` + reject further requests
- Configurable via `GEMINI_DAILY_LIMIT` env var (optional)

API:
- `recordUsage(): { allowed: boolean }` - call before each Gemini API request
- `getUsageStats(): { count: number; limit: number; date: string }` - for diagnostics

**Integration points:**
- `apps/web/app/api/semantic-search/route.ts`: check before `generateQueryEmbedding()`
- `apps/web/app/api/embed/route.ts`: check before each `generateDocumentEmbedding()` call in the loop

When limit is reached, return HTTP 503 with message: "API usage limit reached for today. Please try again tomorrow."

### 3. Tagless Data Retention Limit

**File:** `apps/web/app/api/tagless/crawl-db.ts`

Add `cleanupOldMonths(retentionMonths: number)` function:

- Query all months from `tagless_crawl_status`
- Identify months older than `retentionMonths` (default: 6) from current month
- DELETE from `tagless_videos` WHERE month IN (old months)
- DELETE from `tagless_crawl_status` WHERE month IN (old months)
- Call at the end of `saveVideosToDb()`

Storage estimate with 6-month retention:
- ~5,000 tagless videos/month * ~200 bytes/row = ~1MB/month
- 6 months = ~6MB (well within 0.5GB)

### 4. DB Storage Monitoring

**File:** `apps/web/app/api/tagless/crawl-db.ts`

Add `checkStorageUsage()` function:

- Execute `SELECT pg_database_size(current_database())` via Drizzle's `sql` template
- Warn threshold: 400MB (80% of 0.5GB Neon free tier)
- `console.warn` when exceeded
- Call after `saveVideosToDb()` completes

## What Does NOT Change

- Gemini API model (`gemini-embedding-001`) - free tier is sufficient
- PostgreSQL + pgvector architecture - Neon free tier supports it
- Vercel Hobby plan - sufficient after Image Optimization removal
- Normal search - already zero cost (free Snapshot API)
- All user-facing features - no functionality removed

## Verification

- `pnpm check` passes (lint + typecheck + knip)
- Existing tests pass, updated tests pass
- Manual verification: thumbnails render without `next/image`
- Usage monitor unit tests: counter increment, daily reset, threshold alerts
