"use client";

import { Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSearchHistoryStore } from "../model/use-search-history";
import { Button } from "@/shared/ui/button";

const EMPTY_LENGTH = 0;

export const SearchHistory = function SearchHistory() {
  const history = useSearchHistoryStore((state) => state.history);
  const clearHistory = useSearchHistoryStore((state) => state.clearHistory);
  const router = useRouter();

  if (history.length === EMPTY_LENGTH) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">検索履歴</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            clearHistory();
          }}
        >
          <Trash2 className="mr-1 size-3" />
          クリア
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {history.map((entry) => (
          <button
            key={entry.timestamp}
            type="button"
            className="group flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              router.push(`/search?q=${encodeURIComponent(entry.query)}`);
            }}
          >
            <Search className="size-3 text-muted-foreground group-hover:text-primary-foreground" />
            {entry.query}
          </button>
        ))}
      </div>
    </div>
  );
};
