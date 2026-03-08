import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const FIRST_EMBEDDING_INDEX = 0;
const SLICE_START = 0;

const getGeminiClient = () => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

const MAX_DESCRIPTION_LENGTH = 200;

const buildDocumentText = (video: {
  title: string;
  tags?: string;
  genre?: string;
  description?: string;
}): string => {
  const parts = [video.title];
  if (video.tags !== undefined && video.tags !== "") {
    parts.push(video.tags);
  }
  if (video.genre !== undefined && video.genre !== "") {
    parts.push(video.genre);
  }
  if (video.description !== undefined && video.description !== "") {
    parts.push(video.description.slice(SLICE_START, MAX_DESCRIPTION_LENGTH));
  }
  return parts.join(" ");
};

const extractValues = (response: { embeddings?: { values?: number[] }[] }): number[] => {
  const values = response.embeddings?.[FIRST_EMBEDDING_INDEX]?.values;
  if (values === undefined) {
    throw new Error("Failed to generate embedding: no values returned");
  }
  return values;
};

export const generateDocumentEmbedding = async (video: {
  title: string;
  tags?: string;
  genre?: string;
  description?: string;
}): Promise<number[]> => {
  const ai = getGeminiClient();
  const text = buildDocumentText(video);
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });
  return extractValues(response);
};

export const generateQueryEmbedding = async (query: string): Promise<number[]> => {
  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });
  return extractValues(response);
};

export { EMBEDDING_DIMENSIONS };
