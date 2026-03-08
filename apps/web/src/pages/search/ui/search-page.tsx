"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { useSearch } from "../model/use-search";
import { SaveSearchButton } from "@/features/saved-searches";
import { SearchFiltersPanel } from "@/features/search-filters";
import { SearchForm } from "@/features/search-form";
import { SearchResults } from "@/features/search-results";
import { formatQueryDisplay } from "@/shared/lib";
import { FilterLayout } from "@/widgets/filter-layout";

export const SearchPage = () => {
  const search = useSearch();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUrl = `${pathname}?${searchParams?.toString() ?? ""}`;

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
    <div className="mx-auto flex h-[calc(100svh-var(--header-height))] max-w-[1920px] flex-col overflow-hidden px-4">
      <div className="shrink-0 border-b border-border py-3">
        <SearchForm
          defaultValue={formatQueryDisplay(
            search.state.query,
            search.state.targets,
            search.state.tags,
          )}
          size="sm"
        />
      </div>
      <FilterLayout sidebar={sidebar}>
        <SearchResults
          loading={search.loading}
          error={search.error}
          results={search.results}
          totalCount={search.totalCount}
          query={search.state.query}
          currentPage={search.state.page}
          limit={search.state.limit}
          viewMode={search.viewMode}
          extraActions={<SaveSearchButton currentUrl={currentUrl} />}
          buildPageHref={search.buildPageHref}
          onPageChange={search.handlePageChange}
          onViewModeChange={search.handleViewModeChange}
          onLimitChange={search.handleLimitChange}
        />
      </FilterLayout>
    </div>
  );
};
