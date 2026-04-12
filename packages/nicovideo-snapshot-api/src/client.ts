import { buildSearchUrl } from "./query-builder";
import type { SearchOptions, SnapshotErrorResponse, SnapshotSearchResponse } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSearchResponse = (value: unknown): value is SnapshotSearchResponse => {
  if (!isObject(value)) {
    return false;
  }
  if (!("meta" in value) || !("data" in value)) {
    return false;
  }
  return Array.isArray(value.data);
};

const isErrorResponse = (value: unknown): value is SnapshotErrorResponse => {
  if (!isObject(value)) {
    return false;
  }
  const { meta } = value;
  if (!isObject(meta)) {
    return false;
  }
  return typeof meta.errorCode === "string";
};

export class SnapshotApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = "SnapshotApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

export const searchSnapshot = async (options: SearchOptions): Promise<SnapshotSearchResponse> => {
  const url = buildSearchUrl(options);

  const response = await fetch(url, {
    headers: { "User-Agent": options.userAgent },
  });

  const json: unknown = await response.json();

  if (isErrorResponse(json)) {
    throw new SnapshotApiError(json.meta.status, json.meta.errorCode, json.meta.errorMessage);
  }

  if (!isSearchResponse(json)) {
    throw new SnapshotApiError(response.status, "INVALID_RESPONSE", "Invalid API response format");
  }

  return json;
};
