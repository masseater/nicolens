"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/shared/ui/button";

const URL_PREFIX_LENGTH = 20;
const URL_SUFFIX_LENGTH = 6;
const URL_MASK_THRESHOLD = URL_PREFIX_LENGTH + URL_SUFFIX_LENGTH;
const EMPTY_LENGTH = 0;
const SLICE_START = 0;

const FORMAT_LABELS: Record<string, string> = {
  generic: "汎用 JSON",
  discord: "Discord",
};

const formatLabel = (format: string): string => FORMAT_LABELS[format] ?? format;

const maskUrl = (url: string): string => {
  if (url.length <= URL_MASK_THRESHOLD) {
    return url;
  }
  return `${url.slice(SLICE_START, URL_PREFIX_LENGTH)}...${url.slice(-URL_SUFFIX_LENGTH)}`;
};

export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  format: string;
}

interface WebhookListProps {
  webhooks: readonly WebhookEntry[];
}

interface WebhookItemProps {
  entry: WebhookEntry;
  deleting: boolean;
  onDelete: (id: string) => void;
}

const WebhookItem = ({ entry, deleting, onDelete }: WebhookItemProps) => (
  <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium">{entry.name}</span>
      <span className="truncate text-xs text-muted-foreground">{maskUrl(entry.url)}</span>
      <span className="text-xs text-muted-foreground">{formatLabel(entry.format)}</span>
    </div>
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        onDelete(entry.id);
      }}
      disabled={deleting}
      aria-label={`「${entry.name}」を削除`}
    >
      <Trash2 className="size-3.5" />
      削除
    </Button>
  </li>
);

const deleteWebhook = async (id: string): Promise<boolean> => {
  const response = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
  return response.ok;
};

export const WebhookList = ({ webhooks }: WebhookListProps) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");

  const performDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteWebhook(id);
    setDeletingId("");
    if (success) {
      router.refresh();
    }
  };

  const handleDelete = (id: string) => {
    // oxlint-disable-next-line no-alert -- confirm dialog is the simplest UX for destructive action
    const ok = globalThis.confirm("この Webhook を削除しますか?");
    if (!ok) {
      return;
    }
    void performDelete(id);
  };

  if (webhooks.length === EMPTY_LENGTH) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        まだ Webhook がありません
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {webhooks.map((entry) => (
        <WebhookItem
          key={entry.id}
          entry={entry}
          deleting={deletingId === entry.id}
          onDelete={handleDelete}
        />
      ))}
    </ul>
  );
};
