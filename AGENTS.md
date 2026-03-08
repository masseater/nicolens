<!-- HUMAN WRITE START --- DO NOT EDIT BETWEEN BELOW HUMAN WRITE END -->

# Project

ニコニコ動画のsnapshot apiを用いて公式よりも軽量な検索ができるWebサイトを作成する。

# important

ユーザーは何もしていません。全てAIにより構成されています。全て責任を持って対応すること。

ニコニコ動画への負荷がかからないようにすることを第一にすること。必ずあらゆるものにキャッシュが効かないか検討して実装に反映すること。

# 技術スタック

nextjsを使用する。ディレクトリ構成はFSDにすること。API通信が必要な場合はnextjsのみで行うこと。DBが必要な場合はPostgreSQl使用すること。linterはoxlintを使用すること。typescriptのみを使用すること。tscではなくtsgoを使用すること。全てのコードはAIが生成したものなので、今回触れた地点以外にエラーが起きた際でも責任を持ってそのエラーや警告を解消すること。停止時に必ずlint, typecheck, knipを行うこと。

上記以外にも開発時に必要なものやあった方が良いものがあれば適宜追加して良いです。

snapshot apiはこれ https://site.nicovideo.jp/search-api-docs/snapshot

shadcnを用いること。

linterで機械的に弾けるかどうかを常に意識すること。必要に応じてカスタムルールを作成して良い。

<!-- HUMAN WRITE END --- DO NOT EDIT BETWEEN OVER HUMAN WRITE START -->

<!-- AI GENERATED SECTION --- auto-maintained by Claude Code -->

# Commands

```bash
# Development
pnpm dev              # Start dev server (turbopack)
pnpm build            # Production build
pnpm check            # Run lint + fmt:check + typecheck + knip (all at once)
pnpm lint             # oxlint -c .oxlintrc.json --deny-warnings --tsconfig tsconfig.json .
pnpm typecheck        # tsgo --noEmit
pnpm knip             # Dead code detection
pnpm fmt              # Format with oxfmt
pnpm fmt:check        # Check formatting (CI mode)

# Testing (run from apps/web/ or use --filter)
pnpm --filter @nicolens/web test           # vitest run (single run)
pnpm --filter @nicolens/web test:watch     # vitest (watch mode)
pnpm --filter @nicolens/web test:coverage  # vitest run --coverage

# Single package (from repo root)
pnpm --filter @nicolens/web dev
pnpm --filter @nicolens/web lint
pnpm --filter @nicolens/web start   # next start (production server)

# Database (run from apps/web/ or use --filter)
pnpm --filter @nicolens/web db:generate   # drizzle-kit generate
pnpm --filter @nicolens/web db:migrate    # drizzle-kit migrate
pnpm --filter @nicolens/web db:push       # drizzle-kit push
pnpm --filter @nicolens/web db:studio     # drizzle-kit studio

# Add a shadcn component (run from apps/web/)
pnpm shadcn add <component-name>
```

# Architecture

pnpm workspace monorepo managed by Turborepo.

```
apps/web/          — Next.js 16 app (main application)
packages/tsconfig/ — Shared TypeScript config
docs/              — API docs (snapshot-api.md, spec.md, niconico-unofficial-api.md, api-limitations.md, design-system.md)
```

## FSD Structure (apps/web/)

Feature-Sliced Design layers. `app/` はNext.js App Router用（薄いラッパー）、FSD全レイヤーは `src/` 配下。

- `app/` — Next.js routing only. Pages are thin wrappers importing from `@/pages/*`. API routes live here (`app/api/search/route.ts`, `app/api/tagless/route.ts`, `app/api/semantic-search/route.ts`, `app/api/embed/route.ts`).
- `src/pages/` — Page composition (home, search, tagless, semantic-search). Each page composes widgets/features.
- `src/widgets/` — Multi-feature composition (app-header, filter-layout)
- `src/features/` — User-facing features (search-form, search-filters, search-guide, search-history, search-results, tagless-search-form, tagless-results, semantic-search, saved-searches, theme-toggle)
- `src/entities/` — Domain entities (video: card, grid, list-item, stats, tags, thumbnail-image)
- `src/shared/` — Cross-cutting code
  - `shared/types/` — API types (`VideoContent`, `SearchState`, `SearchFilters`, `ViewMode`, semantic types, etc.)
  - `shared/api/` — Client-side API call functions (`searchVideos`, `searchTagless`, `semanticSearch`), `useSearchQuery` hook, and prefetch hooks
  - `shared/lib/` — Utilities (format helpers, URL search params builder/parser, highlight, query-parser, snapshot-schedule, embedding, export, constants)
  - `shared/ui/` — shadcn components + shared UI (button, card, badge, select, input, label, pagination, dropdown-menu, separator, skeleton-card, providers)
  - `shared/hooks/` — Cross-cutting hooks (`useViewMode`, `useEmbedResults`)
  - `shared/db/` — PostgreSQL database connection and schema (Drizzle ORM)

Slices use internal segments: `ui/`, `model/`, `lib/`, `__tests__/` with `index.ts` as public API (except pages which have no barrel file).
Import direction: `app → pages → widgets → features → entities → shared` (enforced by oxlint boundaries plugin).

## Data Flow

1. User submits search → `SearchForm` calls router navigation → URL params updated
2. `useSearch` hook reads URL params via `useSearchParams` → parsed by `parseSearchParams` → `useSearchQuery` (TanStack Query) calls `searchVideos`
3. Navigation actions (filters/sort/page change) go through `useSearchNavigation` (`src/pages/search/model/`) → `buildSearchParams` → `router.push` updates URL → triggers re-render of step 2
4. `searchVideos` fetches `/api/search` (internal Next.js route)
5. `app/api/search/route.ts` proxies to niconico Snapshot API with in-memory cache (TTL = time until next snapshot update at JST 5:00, minimum 60s), rate limiting (1req/sec), and deep pagination support

## Dev Server

- デフォルトポートは3000（`apps/web/package.json`の`dev`スクリプトにポート指定なし）
- `pnpm dev`でTurbopack dev server起動

## Key Conventions

- Path alias: `@/*` maps to `apps/web/src/*`
- shadcn config: style `base-nova`, components install to `@/shared/ui`, utils to `@/shared/lib/utils`
- TypeScript: strict mode, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- Linter: oxlint with `--deny-warnings` (warnings are errors), type-aware mode enabled
  - Plugins: import, typescript, unicorn, react, nextjs, jsx-a11y, react-perf, promise, node
  - jsPlugins: `eslint-plugin-boundaries` (FSD layer boundary enforcement)
  - `any` and non-null assertions are errors; `consistent-type-imports` enforced (as warn, promoted to error by `--deny-warnings`)
  - `import/no-default-export: error` (Next.js pages/layouts/config are exempted via overrides)
- Formatter: oxfmt (not prettier)
- Type checker: `tsgo` (not `tsc`)
- knip: `ignoreDependencies` includes shadcn, tw-animate-css, tailwindcss, postcss, eslint-plugin-boundaries, eslint-import-resolver-typescript. When adding new shadcn components that knip flags as unused, add to `apps/web/knip.json` "ignore" array
- FSD import rules: `import/no-cycle: error` for circular dependency prevention; `boundaries/element-types: error` for layer boundary enforcement
- Design system: See `docs/design-system.md`. Key rules: z-index via `@theme` tokens (`z-header`, `z-sticky`, `z-filter`, `z-dropdown`), icon sizing via `size-*` (not `h-* w-*`), no arbitrary font sizes (`text-[10px]` etc.), sidebar width via `--sidebar-width` CSS var
