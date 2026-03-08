"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import { isSortField } from "../lib/sort-field-guard";
import type { SortField, SortOrder } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const SORT_LABELS: Record<SortField, string> = {
  viewCounter: "再生数",
  startTime: "投稿日",
  commentCounter: "コメント数",
  mylistCounter: "マイリスト数",
  likeCounter: "いいね数",
  lengthSeconds: "動画の長さ",
  lastCommentTime: "最新コメント日時",
};

const SORT_ENTRIES: readonly SortField[] = [
  "viewCounter",
  "startTime",
  "commentCounter",
  "mylistCounter",
  "likeCounter",
  "lengthSeconds",
  "lastCommentTime",
];

const formatSortValue = (value: unknown): string => {
  if (typeof value === "string" && isSortField(value)) {
    return SORT_LABELS[value];
  }
  return "選択してください";
};

interface SortToolbarProps {
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export const SortToolbar = ({ sortField, sortOrder, onSortChange }: SortToolbarProps) => {
  const handleSortFieldChange = (selectedValue: string | null) => {
    if (selectedValue !== null && isSortField(selectedValue)) {
      onSortChange(selectedValue, sortOrder);
    }
  };

  const handleSortOrderToggle = () => {
    onSortChange(sortField, sortOrder === "-" ? "+" : "-");
  };

  const isDescending = sortOrder === "-";

  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="text-xs font-semibold text-muted-foreground">並び替え</h3>
      <div className="flex items-center gap-1.5">
        <Select value={sortField} onValueChange={handleSortFieldChange}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue>{formatSortValue}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_ENTRIES.map((field) => (
              <SelectItem key={field} value={field}>
                {SORT_LABELS[field]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSortOrderToggle}
          title={isDescending ? "降順(クリックで昇順に切替)" : "昇順(クリックで降順に切替)"}
          aria-label={isDescending ? "降順(クリックで昇順に切替)" : "昇順(クリックで降順に切替)"}
        >
          {isDescending ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
    </div>
  );
};
