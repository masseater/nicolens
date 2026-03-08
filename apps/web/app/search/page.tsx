import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchPage } from "@/pages/search";
import { getQueryClient, searchKeys, searchVideos } from "@/shared/api";
import { parseSearchParams, toURLSearchParams } from "@/shared/lib";

export const metadata: Metadata = {
  title: "検索結果 - nicolens",
};

interface SearchRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const prefetchSearch = async (params: URLSearchParams) => {
  const state = parseSearchParams(params);
  if (state.query.trim() === "") {
    return null;
  }
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: searchKeys.query(state),
    queryFn: () => searchVideos(state),
  });
  return dehydrate(queryClient);
};

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default async function SearchRoute({ searchParams }: SearchRouteProps) {
  const rawParams = await searchParams;
  const dehydratedState = await prefetchSearch(toURLSearchParams(rawParams));

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense>
        <SearchPage />
      </Suspense>
    </HydrationBoundary>
  );
}
