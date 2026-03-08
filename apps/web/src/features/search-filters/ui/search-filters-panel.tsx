"use client";

import { RotateCcw } from "lucide-react";

import type { SearchFilters, SortField, SortOrder } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";

import { FilterGrid } from "./filter-grid";
import { SortToolbar } from "./sort-toolbar";

const ResetButton = ({ onReset }: { onReset: () => void }) => (
  <div className="flex justify-end p-3 pt-0">
    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onReset}>
      <RotateCcw className="mr-1 size-3" />
      リセット
    </Button>
  </div>
);

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  sortField: SortField;
  sortOrder: SortOrder;
  onFiltersChange: (filters: SearchFilters) => void;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export const SearchFiltersPanel = ({
  filters,
  sortField,
  sortOrder,
  onFiltersChange,
  onSortChange,
}: SearchFiltersPanelProps) => {
  const updateFilter = <FilterKey extends keyof SearchFilters>(
    key: FilterKey,
    value: SearchFilters[FilterKey],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="rounded-lg border bg-card">
      <SortToolbar sortField={sortField} sortOrder={sortOrder} onSortChange={onSortChange} />
      <Separator />
      <FilterGrid filters={filters} updateFilter={updateFilter} />
      <ResetButton
        onReset={() => {
          onFiltersChange({});
        }}
      />
    </div>
  );
};
