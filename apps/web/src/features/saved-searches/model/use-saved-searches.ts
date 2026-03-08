"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_SAVED = 50;
const SLICE_START = 0;

interface SavedSearch {
  name: string;
  url: string;
  createdAt: number;
}

interface SavedSearchesState {
  saved: SavedSearch[];
  addSaved: (name: string, url: string) => void;
  removeSaved: (createdAt: number) => void;
  clearSaved: () => void;
}

const isSavedSearch = (value: unknown): value is SavedSearch => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("name" in value) || !("url" in value) || !("createdAt" in value)) {
    return false;
  }
  const record = value as { name: unknown; url: unknown; createdAt: unknown }; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- narrowed by 'in' checks above
  return (
    typeof record.name === "string" &&
    typeof record.url === "string" &&
    typeof record.createdAt === "number"
  );
};

export const useSavedSearchesStore = create<SavedSearchesState>()(
  persist(
    (set, get) => ({
      saved: [],
      addSaved: (name: string, url: string) => {
        const current = get().saved;
        const entry: SavedSearch = { name, url, createdAt: Date.now() };
        set({ saved: [entry, ...current].slice(SLICE_START, MAX_SAVED) });
      },
      removeSaved: (createdAt: number) => {
        set({ saved: get().saved.filter((entry) => entry.createdAt !== createdAt) });
      },
      clearSaved: () => {
        set({ saved: [] });
      },
    }),
    {
      name: "nicolens:saved-searches",
      merge: (persisted, current) => {
        const stored = persisted as Partial<SavedSearchesState>; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- zustand persist merge typing
        const validSaved = Array.isArray(stored.saved)
          ? stored.saved.filter((item: unknown) => isSavedSearch(item))
          : [];
        return { ...current, saved: validSaved };
      },
    },
  ),
);
