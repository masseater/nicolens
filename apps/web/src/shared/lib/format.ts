const MAN_THRESHOLD = 10_000;
const FIXED_DECIMAL_PLACES = 1;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const PAD_LENGTH = 2;
const PAD_CHAR = "0";
const ZERO = 0;

export const formatNumber = (num: number): string => {
  if (num >= MAN_THRESHOLD) {
    return `${(num / MAN_THRESHOLD).toFixed(FIXED_DECIMAL_PLACES)}万`;
  }
  return num.toLocaleString("ja-JP");
};

const formatHMS = (hours: number, minutes: number, secs: number): string => {
  const paddedMin = String(minutes).padStart(PAD_LENGTH, PAD_CHAR);
  const paddedSec = String(secs).padStart(PAD_LENGTH, PAD_CHAR);
  return `${hours}:${paddedMin}:${paddedSec}`;
};

const formatMS = (minutes: number, secs: number): string => {
  const paddedSec = String(secs).padStart(PAD_LENGTH, PAD_CHAR);
  return `${minutes}:${paddedSec}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const secs = seconds % SECONDS_PER_MINUTE;
  if (hours > ZERO) {
    return formatHMS(hours, minutes, secs);
  }
  return formatMS(minutes, secs);
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
