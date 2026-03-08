import type { SemanticSearchResponse, SemanticSearchState } from "@/shared/types";

const PAGE_OFFSET_BASE = 1;

const parseSemanticResponse = async (response: Response): Promise<SemanticSearchResponse> => {
  const json: unknown = await response.json();
  if (typeof json !== "object" || json === null) {
    throw new Error("Unexpected response format from semantic search API");
  }
  return json as SemanticSearchResponse; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
};

export const searchSemantic = async (
  state: SemanticSearchState,
): Promise<SemanticSearchResponse> => {
  const params = new URLSearchParams({
    q: state.query, // oxlint-disable-line id-length -- URL query parameter
    page: String(state.page),
    limit: String(state.limit),
  });

  const response = await fetch(`/api/semantic-search?${params.toString()}`);

  if (!response.ok) {
    const body: { error?: string } | null = await response.json().catch(() => null); // oxlint-disable-line @typescript-eslint/no-unsafe-assignment
    throw new Error(body?.error ?? "セマンティック検索に失敗しました");
  }

  return parseSemanticResponse(response);
};

export const embedVideos = async (
  videos: {
    contentId: string;
    title: string;
    description?: string;
    tags?: string;
    genre?: string;
    thumbnailUrl: string;
    viewCounter: number;
    mylistCounter: number;
    likeCounter: number;
    commentCounter: number;
    lengthSeconds: number;
    startTime: string;
  }[],
): Promise<void> => {
  try {
    await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos }),
    });
  } catch {
    // Background embedding — silently ignore failures
  }
};

export { PAGE_OFFSET_BASE as SEMANTIC_PAGE_OFFSET_BASE };
