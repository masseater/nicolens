import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => {
  const mockSearchParams = new URLSearchParams({ q: "test" });
  return {
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => mockSearchParams,
  };
});

vi.mock("@/shared/api/search", () => ({
  searchVideos: vi.fn().mockResolvedValue({
    data: [
      {
        contentId: "sm1",
        title: "Test",
        viewCounter: 100,
        mylistCounter: 10,
        likeCounter: 5,
        lengthSeconds: 60,
        thumbnailUrl: "https://example.com/thumb.jpg",
        startTime: "2024-01-01",
        commentCounter: 50,
      },
    ],
    meta: { totalCount: 1 },
  }),
}));

vi.mock("@/features/search-history", () => ({
  addToHistory: vi.fn(),
}));

import { useSearch } from "./use-search";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return QueryClientProvider({ client: queryClient, children });
  };
};

describe("useSearch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with parsed search params", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    expect(result.current.state.query).toBe("test");
  });

  it("provides handler functions", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    expect(typeof result.current.handleFiltersChange).toBe("function");
    expect(typeof result.current.handleSortChange).toBe("function");
    expect(typeof result.current.handlePageChange).toBe("function");
  });

  it("fetches results on mount when query is non-empty", async () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.results).toHaveLength(1);
    expect(result.current.totalCount).toBe(1);
  });

  it("handles search error", async () => {
    const { searchVideos } = await import("@/shared/api/search");
    vi.mocked(searchVideos).mockRejectedValueOnce(new Error("API error"));

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("API error");
    expect(result.current.results).toEqual([]);
  });

  it("handles non-Error thrown value", async () => {
    const { searchVideos } = await import("@/shared/api/search");
    vi.mocked(searchVideos).mockRejectedValueOnce("string error");

    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("検索中にエラーが発生しました");
  });
});
