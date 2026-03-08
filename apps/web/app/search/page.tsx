import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchPage } from "@/pages/search";

export const metadata: Metadata = {
  title: "検索結果 - nicolens",
};

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default function SearchRoute() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
