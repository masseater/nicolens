"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TagTriggerEntry } from "../ui/tag-watch-list";

const toggleTagTrigger = async (id: string, isActive: boolean): Promise<boolean> => {
  const response = await fetch(`/api/watches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  return response.ok;
};

const deleteTagTrigger = async (id: string): Promise<boolean> => {
  const response = await fetch(`/api/watches/${id}`, { method: "DELETE" });
  return response.ok;
};

export interface UseTagWatchActions {
  togglingId: string;
  deletingId: string;
  handleToggle: (entry: TagTriggerEntry) => void;
  handleDelete: (id: string) => void;
}

export const useTagWatchActions = (): UseTagWatchActions => {
  const router = useRouter();
  const [togglingId, setTogglingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const performToggle = async (entry: TagTriggerEntry) => {
    setTogglingId(entry.id);
    const success = await toggleTagTrigger(entry.id, !entry.isActive);
    setTogglingId("");
    if (success) {
      router.refresh();
    }
  };

  const performDelete = async (id: string) => {
    setDeletingId(id);
    const success = await deleteTagTrigger(id);
    setDeletingId("");
    if (success) {
      router.refresh();
    }
  };

  const handleToggle = (entry: TagTriggerEntry) => {
    void performToggle(entry);
  };

  const handleDelete = (id: string) => {
    // oxlint-disable-next-line no-alert -- confirm dialog is the simplest UX for destructive action
    const ok = globalThis.confirm("このタグ監視を削除しますか?");
    if (!ok) {
      return;
    }
    void performDelete(id);
  };

  return { togglingId, deletingId, handleToggle, handleDelete };
};
