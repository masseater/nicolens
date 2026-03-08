import { JST_OFFSET_HOURS, MINUTES_PER_HOUR, MS_PER_SECOND, SECONDS_PER_MINUTE } from "./constants";

const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const HOURS_PER_DAY = 24;
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const JST_SNAPSHOT_UPDATE_HOUR = 5;
const DAY_ROLLBACK = 1;
const ZERO_MINUTES = 0;
const ZERO_SECONDS = 0;
const ZERO_MS = 0;
const MIN_CACHE_SECONDS = 60;

export const getLatestSnapshotUpdate = (): Date => {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const jst5am = new Date(jstNow);
  jst5am.setUTCHours(
    JST_SNAPSHOT_UPDATE_HOUR - JST_OFFSET_HOURS,
    ZERO_MINUTES,
    ZERO_SECONDS,
    ZERO_MS,
  );
  if (jst5am.getTime() > now.getTime()) {
    jst5am.setUTCDate(jst5am.getUTCDate() - DAY_ROLLBACK);
  }
  return jst5am;
};

export const getSecondsUntilNextSnapshot = (): number => {
  const now = Date.now();
  const nextUpdate = getLatestSnapshotUpdate().getTime() + MS_PER_DAY;
  const remainingMs = nextUpdate - now;
  const remainingSeconds = Math.floor(remainingMs / MS_PER_SECOND);
  return Math.max(remainingSeconds, MIN_CACHE_SECONDS);
};

export const getMsUntilNextSnapshot = (): number => getSecondsUntilNextSnapshot() * MS_PER_SECOND;

// Check if a cache entry (stored at `timestamp`) is still valid
// Valid = stored after the latest snapshot update (JST 5:00 AM)
export const isCacheStillValid = (timestamp: number): boolean =>
  timestamp > getLatestSnapshotUpdate().getTime();
