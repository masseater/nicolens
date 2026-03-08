"use client";

import { useSemanticSearch } from "../model/use-semantic-search";
import { SearchForm } from "@/features/search-form";
import { SemanticSearchResults } from "@/features/semantic-search";

export const SemanticSearchPage = () => {
  const search = useSemanticSearch();

  return (
    <div className="mx-auto max-w-[1920px] px-4">
      <div className="py-3">
        <SearchForm defaultValue={search.state.query} size="sm" />
      </div>
      <SemanticSearchResults
        loading={search.loading}
        error={search.error}
        results={search.results}
        totalCount={search.totalCount}
        indexedCount={search.indexedCount}
        query={search.state.query}
        currentPage={search.state.page}
        limit={search.state.limit}
        viewMode={search.viewMode}
        buildPageHref={search.buildPageHref}
        onPageChange={search.handlePageChange}
        onViewModeChange={search.handleViewModeChange}
        onLimitChange={search.handleLimitChange}
      />
    </div>
  );
};
