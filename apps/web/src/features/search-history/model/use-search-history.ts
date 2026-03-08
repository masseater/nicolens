"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_HISTORY = 20;
const SLICE_START = 0;

interface HistoryEntry {
  query: string;
  timestamp: number;
}

interface SearchHistoryState {
  history: HistoryEntry[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
}

// Validate that a value is a HistoryEntry
const isHistoryEntry = (value: unknown): value is HistoryEntry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("query" in value) || !("timestamp" in value)) {
    return false;
  }
  const { query, timestamp } = value as { query: unknown; timestamp: unknown }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- narrowed by 'in' checks above
  return typeof query === "string" && typeof timestamp === "number";
};

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      addToHistory: (query: string) => {
        const trimmed = query.trim();
        if (trimmed === "") {
          return;
        }
        const current = get().history.filter((entry) => entry.query !== trimmed);
        current.unshift({ query: trimmed, timestamp: Date.now() });
        set({ history: current.slice(SLICE_START, MAX_HISTORY) });
      },
      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: "nicolens:search-history",
      merge: (persisted, current) => {
        const stored = persisted as Partial<SearchHistoryState>; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- zustand persist merge typing
        const validHistory = Array.isArray(stored.history)
          ? stored.history.filter((item: unknown) => isHistoryEntry(item))
          : [];
        return { ...current, history: validHistory };
      },
    },
  ),
);

// Standalone function for use outside React components
export const addToHistory = (query: string) => {
  useSearchHistoryStore.getState().addToHistory(query);
};
