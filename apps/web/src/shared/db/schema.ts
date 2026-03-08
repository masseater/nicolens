import { index, integer, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";

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
