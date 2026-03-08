import Link from "next/link";

const NotFoundPage = () => (
  <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-6xl font-bold tracking-tight text-muted-foreground">404</h1>
    <p className="text-lg text-muted-foreground">ページが見つかりませんでした</p>
    <Link
      href="/"
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      トップページに戻る
    </Link>
  </div>
);

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default NotFoundPage;
