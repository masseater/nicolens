"use client";

import { useTaglessSearch } from "../model/use-tagless-search";
import { SearchFiltersPanel } from "@/features/search-filters";
import { TaglessResults } from "@/features/tagless-results";
import { TaglessSearchForm } from "@/features/tagless-search-form";
import { FilterLayout } from "@/widgets/filter-layout";

export const TaglessPage = () => {
  const search = useTaglessSearch();

  const sidebar = (
    <SearchFiltersPanel
      filters={search.state.filters}
      sortField={search.state.sortField}
      sortOrder={search.state.sortOrder}
      onFiltersChange={search.handleFiltersChange}
      onSortChange={search.handleSortChange}
    />
  );

  return (
    <div className="mx-auto flex h-full max-w-[1920px] flex-col overflow-hidden px-4">
      <div className="shrink-0 py-4">
        <TaglessSearchForm
          query={search.state.query}
          month={search.state.month}
          onQueryChange={search.handleQueryChange}
          onMonthChange={search.handleMonthChange}
        />
      </div>
      <FilterLayout sidebar={sidebar}>
        <TaglessResults
          loading={search.loading}
          error={search.error}
          results={search.results}
          totalCount={search.totalCount}
          query={search.state.query}
          month={search.state.month}
          currentPage={search.state.page}
          limit={search.state.limit}
          viewMode={search.viewMode}
          buildPageHref={search.buildPageHref}
          onPageChange={search.handlePageChange}
          onViewModeChange={search.handleViewModeChange}
          onLimitChange={search.handleLimitChange}
          onRetry={search.handleRetry}
        />
      </FilterLayout>
    </div>
  );
};
