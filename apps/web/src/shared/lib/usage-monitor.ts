import { JST_OFFSET_HOURS, MINUTES_PER_HOUR, MS_PER_SECOND, SECONDS_PER_MINUTE } from "./constants";

const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const DEFAULT_DAILY_LIMIT = 1000;
const WARN_THRESHOLD = 0.8;
const PERCENTAGE_SCALE = 100;
const PAD_WIDTH = 2;
const MONTH_OFFSET = 1;
const INITIAL_COUNT = 0;

const getDailyLimit = (): number => {
  const env = process.env["GEMINI_DAILY_LIMIT"];
  if (env === undefined || env === "") {
    return DEFAULT_DAILY_LIMIT;
  }
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > INITIAL_COUNT
    ? Math.floor(parsed)
    : DEFAULT_DAILY_LIMIT;
};

const getJstDateString = (): string => {
  const now = new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, "0");
  const day = String(jst.getUTCDate()).padStart(PAD_WIDTH, "0");
  return `${String(year)}-${month}-${day}`;
};

let currentDate = "";
let requestCount = INITIAL_COUNT;

const ensureDateCurrent = (): void => {
  const today = getJstDateString();
  if (today !== currentDate) {
    currentDate = today;
    requestCount = INITIAL_COUNT;
  }
};

export const recordUsage = (): { allowed: boolean } => {
  ensureDateCurrent();
  const limit = getDailyLimit();

  if (requestCount >= limit) {
    // oxlint-disable-next-line no-console -- intentional: alert visible in Vercel logs for cost monitoring
    console.error(
      `[usage-monitor] Gemini API daily limit reached: ${String(requestCount)}/${String(limit)} (${currentDate})`,
    );
    return { allowed: false };
  }

  requestCount++;

  const ratio = requestCount / limit;
  if (ratio >= WARN_THRESHOLD) {
    // oxlint-disable-next-line no-console -- intentional: alert visible in Vercel logs for cost monitoring
    console.warn(
      `[usage-monitor] Gemini API usage at ${String(Math.round(ratio * PERCENTAGE_SCALE))}%: ${String(requestCount)}/${String(limit)} (${currentDate})`,
    );
  }

  return { allowed: true };
};

export const getUsageStats = (): { count: number; limit: number; date: string } => {
  ensureDateCurrent();
  return { count: requestCount, limit: getDailyLimit(), date: currentDate };
};

/** Reset internal state. Only for use in tests. */
export const resetUsageForTesting = (): void => {
  currentDate = "";
  requestCount = INITIAL_COUNT;
};
