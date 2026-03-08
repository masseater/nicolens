"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ViewMode } from "@/shared/types";

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const useViewMode = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: "grid",
      setViewMode: (mode) => {
        set({ viewMode: mode });
      },
    }),
    { name: "nicolens-view-mode" },
  ),
);
