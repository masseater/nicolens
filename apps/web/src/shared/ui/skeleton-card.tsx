const SkeletonCard = () => (
  <div className="overflow-hidden rounded-lg border bg-card">
    <div className="aspect-video w-full animate-pulse bg-muted" />
    <div className="space-y-2 p-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
    </div>
  </div>
);

const SKELETON_COUNT = 10;
const SKELETON_ITEMS = Array.from({ length: SKELETON_COUNT }, (_unused, index) => index);

export const SkeletonGrid = () => (
  <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
    {SKELETON_ITEMS.map((index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
);
