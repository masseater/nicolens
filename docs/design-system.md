# nicolens Design System

Monochrome-minimal design. Content is the hero, UI is the tool.

## Design Tokens (CSS Custom Properties)

All tokens are defined in `apps/web/app/globals.css` under `@theme inline` and `:root` / `.dark`.

### Z-index Layers

Strictly layered. Never use arbitrary z-index values.

| Token         | Value | Usage                            |
|---------------|-------|----------------------------------|
| `--z-dropdown`| 50    | Popover, Select, Dropdown        |
| `--z-header`  | 40    | AppHeader (sticky)               |
| `--z-sticky`  | 30    | Sticky search form, form wrapper |
| `--z-filter`  | 20    | Mobile filter panel              |

Tailwind usage: `z-header`, `z-sticky`, `z-filter`, `z-dropdown`

### Layout

| Token              | Value    | Usage                        |
|--------------------|----------|------------------------------|
| `--header-height`  | 3.5rem   | AppHeader height             |
| `--sidebar-width`  | 18rem    | Filter sidebar (72 = 18rem)  |
| `--content-max-w`  | 80rem    | max-w-7xl equivalent         |

Tailwind usage: `h-(--header-height)`, `w-(--sidebar-width)`

### Colors

Monochrome palette using oklch. No brand/accent color beyond grayscale.

- **Semantic tokens** follow shadcn convention: `--background`, `--foreground`, `--card`, `--muted`, `--border`, etc.
- **Header** has a subtle tint: `--header-bg`, `--header-border`
- Light/dark themes defined in `:root` / `.dark`

### Spacing Scale (Tailwind default)

Use consistently:

| Context               | Value      |
|-----------------------|------------|
| Section gap           | `gap-4`    |
| Component internal    | `gap-2`, `gap-3` |
| Inline elements       | `gap-1`, `gap-1.5` |
| Card padding          | `p-3` (compact), `p-4` (default) |
| Page horizontal pad   | `px-4`     |

### Typography Scale

| Role              | Classes                                    |
|-------------------|--------------------------------------------|
| App title         | `text-lg font-bold`                        |
| Section heading   | `text-xs font-semibold text-muted-foreground` |
| Card title        | `text-sm font-semibold leading-tight`      |
| Body              | `text-sm`                                  |
| Caption / stats   | `text-xs text-muted-foreground`            |

Never use `text-[10px]` or other arbitrary font sizes.

### Component Heights

| Size    | Height | Usage                          |
|---------|--------|--------------------------------|
| xs      | `h-6`  | Compact buttons                |
| sm      | `h-7`  | Small buttons, pagination      |
| default | `h-8`  | Buttons, inputs, selects       |
| lg      | `h-9`  | Large buttons                  |
| hero    | `h-12` | Home page search input         |

### Border Radius

| Context       | Class          |
|---------------|----------------|
| Container     | `rounded-xl`   |
| Component     | `rounded-lg`   |
| Small element | `rounded-md`   |
| Pill/badge    | `rounded-4xl`  |

### Elevation (Shadows)

| Level | Class        | Usage                      |
|-------|-------------|----------------------------|
| 0     | (none)      | Default state              |
| 1     | `shadow-sm`  | Sticky bar on scroll       |
| 2     | `shadow-md`  | Dropdown/popover           |
| 3     | `shadow-lg`  | Hover cards, floating form |

### Transitions

| Speed   | Class          | Usage                    |
|---------|---------------|--------------------------|
| Fast    | `duration-100` | Dropdown open/close      |
| Default | `duration-200` | Hover, scale transforms  |
| Slow    | `duration-300` | Fade, opacity changes    |

### Grid System (Video Results)

```
grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5
```

This grid definition is the single source of truth for video grid layout. Used in `VideoGrid` and `SkeletonGrid`.

### Icon Sizing

| Context       | Class        |
|---------------|-------------|
| Inline stats  | `size-3`    |
| Button icon   | `size-4`    |
| Decorative    | `size-6`    |

Use `size-*` (width + height) instead of separate `h-* w-*`.
