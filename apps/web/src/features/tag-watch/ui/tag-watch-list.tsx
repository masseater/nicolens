"use client";

import { ArrowRight, Pause, Play, Trash2 } from "lucide-react";

import { useTagWatchActions } from "../model/use-tag-watch-actions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const EMPTY_LENGTH = 0;

export interface TagTriggerEntry {
  id: string;
  tag: string;
  webhookName: string;
  isActive: boolean;
  createdAt: string;
}

interface TagWatchListProps {
  triggers: readonly TagTriggerEntry[];
}

interface TagTriggerItemProps {
  entry: TagTriggerEntry;
  toggling: boolean;
  deleting: boolean;
  onToggle: (entry: TagTriggerEntry) => void;
  onDelete: (id: string) => void;
}

const TagTriggerItem = ({ entry, toggling, deleting, onToggle, onDelete }: TagTriggerItemProps) => (
  <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium">#{entry.tag}</span>
        <Badge variant={entry.isActive ? "default" : "secondary"}>
          {entry.isActive ? "有効" : "停止中"}
        </Badge>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowRight className="size-3" />
        <span className="truncate">{entry.webhookName}</span>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onToggle(entry);
        }}
        disabled={toggling}
        aria-label={entry.isActive ? `「${entry.tag}」を停止` : `「${entry.tag}」を再開`}
      >
        {entry.isActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {entry.isActive ? "停止" : "再開"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          onDelete(entry.id);
        }}
        disabled={deleting}
        aria-label={`「${entry.tag}」を削除`}
      >
        <Trash2 className="size-3.5" />
        削除
      </Button>
    </div>
  </li>
);

export const TagWatchList = ({ triggers }: TagWatchListProps) => {
  const { togglingId, deletingId, handleToggle, handleDelete } = useTagWatchActions();

  if (triggers.length === EMPTY_LENGTH) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        まだタグ監視がありません
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {triggers.map((entry) => (
        <TagTriggerItem
          key={entry.id}
          entry={entry}
          toggling={togglingId === entry.id}
          deleting={deletingId === entry.id}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );
};
