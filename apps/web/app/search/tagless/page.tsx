import type { Metadata } from "next";
import { Suspense } from "react";

import { TaglessPage } from "@/pages/tagless";

export const metadata: Metadata = {
  title: "タグなし動画 - nicolens",
};

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default function TaglessRoute() {
  return (
    <Suspense>
      <TaglessPage />
    </Suspense>
  );
}
