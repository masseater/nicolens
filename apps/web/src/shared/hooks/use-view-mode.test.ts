import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useViewMode } from "./use-view-mode";

// Reset zustand store between tests
const resetStore = () => {
  useViewMode.setState({ viewMode: "grid" });
};

describe("useViewMode", () => {
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

  it("returns grid as default view mode", () => {
    const { result } = renderHook(() => useViewMode());
    expect(result.current.viewMode).toBe("grid");
  });

  it("provides setViewMode function", () => {
    const { result } = renderHook(() => useViewMode());
    expect(typeof result.current.setViewMode).toBe("function");
  });

  it("updates view mode to list via setViewMode", () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode("list");
    });
    expect(result.current.viewMode).toBe("list");
  });

  it("updates view mode back to grid", () => {
    const { result } = renderHook(() => useViewMode());
    act(() => {
      result.current.setViewMode("list");
    });
    act(() => {
      result.current.setViewMode("grid");
    });
    expect(result.current.viewMode).toBe("grid");
  });

  it("uses zustand persist with nicolens-view-mode storage key", () => {
    // Verify store is configured with persist middleware by checking
    // That the persist API exists (zustand persist exposes .persist on the store)
    expect(useViewMode.persist).toBeDefined();
    expect(useViewMode.persist.getOptions().name).toBe("nicolens-view-mode");
  });

  it("shares state across multiple hook instances", () => {
    const { result: result1 } = renderHook(() => useViewMode());
    const { result: result2 } = renderHook(() => useViewMode());
    act(() => {
      result1.current.setViewMode("list");
    });
    expect(result2.current.viewMode).toBe("list");
  });

  it("can read state directly via getState", () => {
    act(() => {
      useViewMode.getState().setViewMode("list");
    });
    expect(useViewMode.getState().viewMode).toBe("list");
  });
});
