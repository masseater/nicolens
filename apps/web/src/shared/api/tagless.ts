import type { SearchFilters, SnapshotSearchResponse, TaglessSearchState } from "@/shared/types";

const HTTP_BAD_REQUEST = 400;
const HTTP_SERVICE_UNAVAILABLE = 503;

const getErrorMessage = (status: number): string => {
  if (status === HTTP_BAD_REQUEST) {
    return "リクエストパラメータに誤りがあります。";
  }
  if (status === HTTP_SERVICE_UNAVAILABLE) {
    return "サービスはメンテナンス中です。しばらくお待ちください。";
  }
  return "サーバーエラーが発生しました。しばらくしてから再度お試しください。";
};

const setIfDefined = (
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void => {
  if (value !== undefined && value !== "") {
    params.set(key, String(value));
  }
};

const buildBaseParams = (state: TaglessSearchState): URLSearchParams => {
  const params = new URLSearchParams({
    month: state.month,
    sort: state.sortField,
    order: state.sortOrder,
    page: String(state.page),
    limit: String(state.limit),
  });
  if (state.query !== "") {
    params.set("q", state.query);
  }
  return params;
};

const FILTER_PARAM_ENTRIES: readonly (readonly [string, keyof SearchFilters])[] = [
  ["vcGte", "viewCounterGte"],
  ["vcLte", "viewCounterLte"],
  ["ccGte", "commentCounterGte"],
  ["ccLte", "commentCounterLte"],
  ["mlGte", "mylistCounterGte"],
  ["mlLte", "mylistCounterLte"],
  ["lkGte", "likeCounterGte"],
  ["lkLte", "likeCounterLte"],
  ["lsGte", "lengthSecondsGte"],
  ["lsLte", "lengthSecondsLte"],
  ["stGte", "startTimeGte"],
  ["stLte", "startTimeLte"],
  ["genre", "genre"],
];

const appendFilterParams = (params: URLSearchParams, state: TaglessSearchState): void => {
  const { filters } = state;
  for (const [paramKey, filterKey] of FILTER_PARAM_ENTRIES) {
    setIfDefined(params, paramKey, filters[filterKey]);
  }
};

const buildTaglessUrl = (state: TaglessSearchState): string => {
  const params = buildBaseParams(state);
  appendFilterParams(params, state);
  return `/api/tagless?${params.toString()}`;
};

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body: { meta?: { errorMessage?: string } } | null = await response.json(); // oxlint-disable-line @typescript-eslint/no-unsafe-assignment
    return body?.meta?.errorMessage ?? getErrorMessage(response.status);
  } catch {
    return getErrorMessage(response.status);
  }
};

const validateResponseFormat = (json: unknown): SnapshotSearchResponse => {
  if (typeof json !== "object" || json === null) {
    throw new Error("Unexpected response format from tagless API");
  }
  return json as SnapshotSearchResponse; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion
};

export const searchTaglessVideos = async (
  state: TaglessSearchState,
): Promise<SnapshotSearchResponse> => {
  const url = buildTaglessUrl(state);
  const response = await fetch(url);

  if (!response.ok) {
    const message = await parseErrorBody(response);
    throw new Error(message);
  }

  const json: unknown = await response.json();
  return validateResponseFormat(json);
};
