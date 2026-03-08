import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { TaglessPage } from "@/pages/tagless";
import { getQueryClient, searchTaglessVideos, taglessKeys } from "@/shared/api";
import { parseTaglessParams, toURLSearchParams } from "@/shared/lib";

export const metadata: Metadata = {
  title: "タグなし動画 - nicolens",
};

interface TaglessRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const prefetchTagless = async (params: URLSearchParams) => {
  const state = parseTaglessParams(params);
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: taglessKeys.query(state),
    queryFn: () => searchTaglessVideos(state),
  });
  return dehydrate(queryClient);
};

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default async function TaglessRoute({ searchParams }: TaglessRouteProps) {
  const rawParams = await searchParams;
  const dehydratedState = await prefetchTagless(toURLSearchParams(rawParams));

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense>
        <TaglessPage />
      </Suspense>
    </HydrationBoundary>
  );
}
