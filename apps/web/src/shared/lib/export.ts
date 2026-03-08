import type { VideoContent } from "@/shared/types";

import { formatDate, formatDuration } from "./format";

const CSV_HEADERS = [
  "コンテンツID",
  "タイトル",
  "URL",
  "再生数",
  "コメント数",
  "マイリスト数",
  "いいね数",
  "再生時間",
  "投稿日",
  "ジャンル",
  "タグ",
  "最新コメント",
] as const;

const NICO_MS_BASE = "https://nico.ms/";

const escapeCsvField = (value: string): string => {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
};

const videoToCsvRow = (video: VideoContent): string => {
  const fields = [
    video.contentId,
    video.title,
    `${NICO_MS_BASE}${video.contentId}`,
    String(video.viewCounter),
    String(video.commentCounter),
    String(video.mylistCounter),
    String(video.likeCounter),
    formatDuration(video.lengthSeconds),
    formatDate(video.startTime),
    video.genre ?? "",
    video.tags ?? "",
    video.lastResBody ?? "",
  ];
  return fields.map((field) => escapeCsvField(field)).join(",");
};

export const exportToCsv = (videos: VideoContent[]): void => {
  const header = CSV_HEADERS.join(",");
  const rows = videos.map((video) => videoToCsvRow(video));
  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  downloadBlob(csv, "nicolens-export.csv", "text/csv;charset=utf-8");
};

const JSON_INDENT = 2;

export const exportToJson = (videos: VideoContent[]): void => {
  const json = JSON.stringify(videos, null, JSON_INDENT);
  downloadBlob(json, "nicolens-export.json", "application/json;charset=utf-8");
};

const downloadBlob = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
