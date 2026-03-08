"use client";

import type { SearchFilters } from "@/shared/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { DateRangeFilter } from "./date-range-filter";
import { NumberRangeFilter } from "./number-range-filter";

interface FilterGridProps {
  filters: SearchFilters;
  updateFilter: <FilterKey extends keyof SearchFilters>(
    key: FilterKey,
    value: SearchFilters[FilterKey],
  ) => void;
}

type NumericFilterKey = {
  [Key in keyof SearchFilters]-?: SearchFilters[Key] extends number | undefined ? Key : never;
}[keyof SearchFilters];

interface CounterFilterConfig {
  label: string;
  gteKey: NumericFilterKey;
  lteKey: NumericFilterKey;
}

const COUNTER_FILTERS: readonly CounterFilterConfig[] = [
  { label: "再生数", gteKey: "viewCounterGte", lteKey: "viewCounterLte" },
  { label: "コメント数", gteKey: "commentCounterGte", lteKey: "commentCounterLte" },
  { label: "マイリスト数", gteKey: "mylistCounterGte", lteKey: "mylistCounterLte" },
  { label: "いいね数", gteKey: "likeCounterGte", lteKey: "likeCounterLte" },
  { label: "動画の長さ(秒)", gteKey: "lengthSecondsGte", lteKey: "lengthSecondsLte" },
];

const getNumericFilter = (filters: SearchFilters, key: NumericFilterKey): number | undefined =>
  filters[key];

const CounterFilterItem = ({
  config,
  filters,
  updateFilter,
}: {
  config: CounterFilterConfig;
  filters: SearchFilters;
  updateFilter: FilterGridProps["updateFilter"];
}) => (
  <NumberRangeFilter
    label={config.label}
    gteValue={getNumericFilter(filters, config.gteKey)}
    lteValue={getNumericFilter(filters, config.lteKey)}
    onGteChange={(value) => {
      updateFilter(config.gteKey, value);
    }}
    onLteChange={(value) => {
      updateFilter(config.lteKey, value);
    }}
  />
);

export const FilterGrid = ({ filters, updateFilter }: FilterGridProps) => (
  <div className="grid gap-4 p-3">
    {COUNTER_FILTERS.map((config) => (
      <CounterFilterItem
        key={config.gteKey}
        config={config}
        filters={filters}
        updateFilter={updateFilter}
      />
    ))}
    <DateRangeFilter
      label="投稿日"
      gteValue={filters.startTimeGte}
      lteValue={filters.startTimeLte}
      onGteChange={(value) => {
        updateFilter("startTimeGte", value);
      }}
      onLteChange={(value) => {
        updateFilter("startTimeLte", value);
      }}
    />
    <div>
      <Label className="text-xs font-medium">ジャンル</Label>
      <Input
        type="text"
        placeholder="ジャンル名"
        value={filters.genre ?? ""}
        onChange={(event) => {
          updateFilter("genre", event.target.value === "" ? undefined : event.target.value);
        }}
        className="mt-1 h-8 text-xs"
      />
    </div>
  </div>
);
