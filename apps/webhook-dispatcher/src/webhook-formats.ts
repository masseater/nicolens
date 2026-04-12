const DISCORD_EMBED_LIMIT = 10;
// Discord embed color: #FF6699 (16_737_945 decimal)
const DISCORD_EMBED_COLOR = 16_737_945;

interface PayloadVideo {
  contentId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  viewCounter: number;
  likeCounter: number;
  commentCounter: number;
  startTime: string;
}

interface PayloadTrigger {
  type: string;
  tag: string;
}

interface NotificationPayload {
  trigger: PayloadTrigger;
  videos: PayloadVideo[];
  totalNew: number;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface DiscordEmbed {
  title: string;
  url: string;
  thumbnail: { url: string };
  fields: DiscordEmbedField[];
  color: number;
  timestamp: string;
}

interface DiscordMessage {
  content: string;
  embeds: DiscordEmbed[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toPayloadVideo = (value: unknown): PayloadVideo | undefined => {
  if (!isObject(value)) {
    return undefined;
  }
  const {
    contentId,
    title,
    url,
    thumbnailUrl,
    viewCounter,
    likeCounter,
    commentCounter,
    startTime,
  } = value;
  if (
    typeof contentId !== "string" ||
    typeof title !== "string" ||
    typeof url !== "string" ||
    typeof thumbnailUrl !== "string" ||
    typeof viewCounter !== "number" ||
    typeof likeCounter !== "number" ||
    typeof commentCounter !== "number" ||
    typeof startTime !== "string"
  ) {
    return undefined;
  }
  return {
    contentId,
    title,
    url,
    thumbnailUrl,
    viewCounter,
    likeCounter,
    commentCounter,
    startTime,
  };
};

const toPayloadTrigger = (value: unknown): PayloadTrigger | undefined => {
  if (!isObject(value)) {
    return undefined;
  }
  const { type, tag } = value;
  if (typeof type !== "string" || typeof tag !== "string") {
    return undefined;
  }
  return { type, tag };
};

const toPayloadVideos = (value: unknown): PayloadVideo[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const videos: PayloadVideo[] = [];
  for (const item of value) {
    const video = toPayloadVideo(item);
    if (video === undefined) {
      return undefined;
    }
    videos.push(video);
  }
  return videos;
};

const buildNotificationPayload = (
  trigger: PayloadTrigger,
  videos: PayloadVideo[],
  totalNew: unknown,
): NotificationPayload | undefined => {
  if (typeof totalNew !== "number") {
    return undefined;
  }
  return { trigger, videos, totalNew };
};

const toNotificationPayload = (value: unknown): NotificationPayload | undefined => {
  if (!isObject(value)) {
    return undefined;
  }
  const trigger = toPayloadTrigger(value["trigger"]);
  if (trigger === undefined) {
    return undefined;
  }
  const videos = toPayloadVideos(value["videos"]);
  if (videos === undefined) {
    return undefined;
  }
  return buildNotificationPayload(trigger, videos, value["totalNew"]);
};

const parsePayload = (raw: string): NotificationPayload => {
  const parsed: unknown = JSON.parse(raw);
  const payload = toNotificationPayload(parsed);
  if (payload === undefined) {
    throw new Error("Invalid notification payload");
  }
  return payload;
};

export const formatGeneric = (payloadStr: string): NotificationPayload => parsePayload(payloadStr);

const buildEmbed = (video: PayloadVideo): DiscordEmbed => ({
  title: video.title,
  url: video.url,
  thumbnail: { url: video.thumbnailUrl },
  fields: [
    { name: "Views", value: String(video.viewCounter), inline: true },
    { name: "Likes", value: String(video.likeCounter), inline: true },
    { name: "Comments", value: String(video.commentCounter), inline: true },
  ],
  color: DISCORD_EMBED_COLOR,
  timestamp: video.startTime,
});

export const formatDiscord = (payloadStr: string): DiscordMessage => {
  const payload = parsePayload(payloadStr);
  const embeds = payload.videos.slice(0, DISCORD_EMBED_LIMIT).map((video) => buildEmbed(video));
  const content = `New videos for #${payload.trigger.tag} (${String(payload.totalNew)} new)`;
  return { content, embeds };
};
