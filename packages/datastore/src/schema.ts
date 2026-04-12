import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

export const taglessVideos = pgTable(
  "tagless_videos",
  {
    contentId: text("content_id").primaryKey(),
    month: text("month").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    userId: integer("user_id"),
    channelId: integer("channel_id"),
    viewCounter: integer("view_counter").notNull(),
    mylistCounter: integer("mylist_counter").notNull(),
    likeCounter: integer("like_counter").notNull(),
    lengthSeconds: integer("length_seconds").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    startTime: timestamp("start_time", { withTimezone: true, mode: "string" }).notNull(),
    lastResBody: text("last_res_body"),
    commentCounter: integer("comment_counter").notNull(),
    lastCommentTime: timestamp("last_comment_time", { withTimezone: true, mode: "string" }),
    categoryTags: text("category_tags"),
    tags: text("tags"),
    genre: text("genre"),
  },
  (table) => [index("idx_tagless_videos_month").on(table.month)],
);

const EMBEDDING_DIMENSIONS = 768;

export const videoEmbeddings = pgTable(
  "video_embeddings",
  {
    contentId: text("content_id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    tags: text("tags"),
    genre: text("genre"),
    thumbnailUrl: text("thumbnail_url").notNull(),
    viewCounter: integer("view_counter").notNull(),
    mylistCounter: integer("mylist_counter").notNull(),
    likeCounter: integer("like_counter").notNull(),
    commentCounter: integer("comment_counter").notNull(),
    lengthSeconds: integer("length_seconds").notNull(),
    startTime: timestamp("start_time", { withTimezone: true, mode: "string" }).notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    embeddedAt: timestamp("embedded_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("idx_video_embeddings_cosine").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const taglessCrawlStatus = pgTable("tagless_crawl_status", {
  month: text("month").primaryKey(),
  crawledAt: timestamp("crawled_at", { withTimezone: true, mode: "string" }).notNull(),
  videoCount: integer("video_count").notNull(),
});

// Auth.js standard tables
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true, mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    format: text("format").notNull(),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("idx_webhooks_user").on(table.userId)],
);

export const tagTriggers = pgTable(
  "tag_triggers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    index("idx_tag_triggers_user").on(table.userId),
    uniqueIndex("idx_tag_triggers_unique").on(table.userId, table.tag, table.webhookId),
  ],
);

export const watchResults = pgTable(
  "watch_results",
  {
    tag: text("tag").notNull(),
    contentId: text("content_id").notNull(),
    videoData: text("video_data").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tag, table.contentId] }),
    index("idx_watch_results_discovered_at").on(table.discoveredAt),
  ],
);

export const pendingNotifications = pgTable(
  "pending_notifications",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    triggerType: text("trigger_type").notNull(),
    triggerId: text("trigger_id").notNull(),
    contentId: text("content_id").notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [index("idx_pending_notifications_created_at").on(table.createdAt)],
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id").primaryKey(),
    webhookId: text("webhook_id").notNull(),
    triggerType: text("trigger_type").notNull(),
    triggerId: text("trigger_id").notNull(),
    contentId: text("content_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }).notNull(),
    success: boolean("success").notNull(),
  },
  (table) => [
    uniqueIndex("idx_notification_log_unique").on(table.triggerId, table.contentId),
    index("idx_notification_log_sent_at").on(table.sentAt),
  ],
);
