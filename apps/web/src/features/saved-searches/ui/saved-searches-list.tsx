"use client";

import { Bookmark, Trash2, X } from "lucide-react";
import Link from "next/link";

import { useSavedSearchesStore } from "../model/use-saved-searches";
import { Button } from "@/shared/ui/button";

const EMPTY_LENGTH = 0;

interface SavedEntry {
  name: string;
  url: string;
  createdAt: number;
}

const SavedSearchItem = ({
  entry,
  onRemove,
}: {
  entry: SavedEntry;
  onRemove: (createdAt: number) => void;
}) => (
  <div className="group flex items-center gap-0">
    <Link
      href={entry.url}
      className="flex items-center gap-1.5 rounded-l-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <Bookmark className="size-3 text-muted-foreground group-hover:text-primary-foreground" />
      {entry.name}
    </Link>
    <button
      type="button"
      className="flex items-center rounded-r-full bg-secondary py-1.5 pr-2 text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
      onClick={() => {
        onRemove(entry.createdAt);
      }}
      aria-label={`「${entry.name}」を削除`}
    >
      <X className="size-3" />
    </button>
  </div>
);

export const SavedSearchesList = () => {
  const saved = useSavedSearchesStore((state) => state.saved);
  const removeSaved = useSavedSearchesStore((state) => state.removeSaved);
  const clearSaved = useSavedSearchesStore((state) => state.clearSaved);

  if (saved.length === EMPTY_LENGTH) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">保存した検索</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            clearSaved();
          }}
        >
          <Trash2 className="mr-1 size-3" />
          クリア
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {saved.map((entry) => (
          <SavedSearchItem key={entry.createdAt} entry={entry} onRemove={removeSaved} />
        ))}
      </div>
    </div>
  );
};
