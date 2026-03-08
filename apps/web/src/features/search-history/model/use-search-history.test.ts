import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addToHistory, useSearchHistoryStore } from "./use-search-history";

// Reset zustand store between tests
const resetStore = () => {
  useSearchHistoryStore.setState({ history: [] });
};

describe("useSearchHistoryStore", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
    });
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty history initially", () => {
    const { result } = renderHook(() => useSearchHistoryStore((s) => s.history));
    expect(result.current).toEqual([]);
  });

  it("provides addToHistory and clearHistory functions", () => {
    const { result } = renderHook(() => useSearchHistoryStore());
    expect(typeof result.current.addToHistory).toBe("function");
    expect(typeof result.current.clearHistory).toBe("function");
  });

  it("clearHistory empties history", () => {
    const { result } = renderHook(() => useSearchHistoryStore());
    act(() => {
      result.current.addToHistory("test");
    });
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.history).toEqual([]);
  });
});

describe("addToHistory", () => {
  beforeEach(() => {
    const storage: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
    });
    resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds a query to history", () => {
    act(() => {
      addToHistory("test query");
    });
    const state = useSearchHistoryStore.getState();
    expect(state.history[0]?.query).toBe("test query");
  });

  it("does not add empty query", () => {
    act(() => {
      addToHistory("");
    });
    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual([]);
  });

  it("does not add whitespace-only query", () => {
    act(() => {
      addToHistory("   ");
    });
    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual([]);
  });

  it("deduplicates queries", () => {
    act(() => {
      addToHistory("query1");
      addToHistory("query2");
      addToHistory("query1");
    });
    const state = useSearchHistoryStore.getState();
    expect(state.history).toHaveLength(2);
    expect(state.history[0]?.query).toBe("query1");
    expect(state.history[1]?.query).toBe("query2");
  });

  it("limits history to 20 entries", () => {
    act(() => {
      for (let i = 0; i < 25; i++) {
        addToHistory(`query${String(i)}`);
      }
    });
    const state = useSearchHistoryStore.getState();
    expect(state.history).toHaveLength(20);
  });

  it("trims query before adding", () => {
    act(() => {
      addToHistory("  trimmed  ");
    });
    const state = useSearchHistoryStore.getState();
    expect(state.history[0]?.query).toBe("trimmed");
  });
});
