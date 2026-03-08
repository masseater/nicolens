import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SemanticSearchPage } from "@/pages/semantic-search";
import { getQueryClient, searchSemantic, semanticSearchKeys } from "@/shared/api";
import { parseSemanticParams, toURLSearchParams } from "@/shared/lib";

export const metadata: Metadata = {
  title: "意味合い検索 - nicolens",
};

interface SemanticSearchRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const prefetchSemantic = async (params: URLSearchParams) => {
  const state = parseSemanticParams(params);
  if (state.query.trim() === "") {
    return null;
  }
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: semanticSearchKeys.query(state),
    queryFn: () => searchSemantic(state),
  });
  return dehydrate(queryClient);
};

// oxlint-disable-next-line import/no-default-export -- Next.js pages require default export
export default async function SemanticSearchRoute({ searchParams }: SemanticSearchRouteProps) {
  const rawParams = await searchParams;
  const dehydratedState = await prefetchSemantic(toURLSearchParams(rawParams));

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense>
        <SemanticSearchPage />
      </Suspense>
    </HydrationBoundary>
  );
}
