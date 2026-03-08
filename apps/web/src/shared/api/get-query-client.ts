import { QueryClient } from "@tanstack/react-query";

import {
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  getMsUntilNextSnapshot,
} from "@/shared/lib";

const HOURS_PER_DAY = 24;
const GC_MULTIPLIER = 2;
const GC_TIME =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND * GC_MULTIPLIER;

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: getMsUntilNextSnapshot,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });

let browserQueryClient: QueryClient | null = null;

export const getQueryClient = (): QueryClient => {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
