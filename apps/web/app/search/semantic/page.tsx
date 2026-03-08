import type { Metadata } from "next";
import { Suspense } from "react";

import { SemanticSearchPage } from "@/pages/semantic-search";

export const metadata: Metadata = {
  title: "意味合い検索 - nicolens",
};

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default function SemanticSearchRoute() {
  return (
    <Suspense>
      <SemanticSearchPage />
    </Suspense>
  );
}
