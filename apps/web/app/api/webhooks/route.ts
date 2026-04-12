import { getDb, webhooks } from "@nicolens/datastore";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;

const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "[::1]"]);
const VALID_FORMATS = new Set<WebhookFormat>(["generic", "discord"]);

const PRIVATE_HOST_PREFIXES = ["127.", "10.", "192.168.", "169.254."];
const PRIVATE_172_PATTERN = /^172\.(?:1[6-9]|2\d|3[01])\./;

type WebhookFormat = "discord" | "generic";

interface CreateWebhookInput {
  format: WebhookFormat;
  name: string;
  url: string;
}

const isWebhookFormat = (value: unknown): value is WebhookFormat =>
  typeof value === "string" && VALID_FORMATS.has(value as WebhookFormat); // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- narrowing guard

const tryParseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

const isPrivateHost = (host: string): boolean => {
  if (BLOCKED_HOSTS.has(host)) {
    return true;
  }
  if (PRIVATE_HOST_PREFIXES.some((prefix) => host.startsWith(prefix))) {
    return true;
  }
  return PRIVATE_172_PATTERN.test(host);
};

const isValidHttpsUrl = (url: string): boolean => {
  const parsed = tryParseUrl(url);
  if (parsed === undefined) {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  return !isPrivateHost(parsed.hostname);
};

const buildInputFromRecord = (record: Record<string, unknown>): CreateWebhookInput | undefined => {
  const rawName = record["name"];
  const rawUrl = record["url"];
  if (typeof rawName !== "string" || typeof rawUrl !== "string") {
    return undefined;
  }
  const name = rawName.trim();
  if (name === "") {
    return undefined;
  }
  const format: WebhookFormat = isWebhookFormat(record["format"]) ? record["format"] : "generic";
  return { format, name, url: rawUrl.trim() };
};

const parseCreateWebhookInput = (value: unknown): CreateWebhookInput | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- safe after object check
  return buildInputFromRecord(record);
};

const insertWebhook = async (userId: string, input: CreateWebhookInput): Promise<string> => {
  const id = crypto.randomUUID();
  const db = getDb();
  await db.insert(webhooks).values({
    id,
    userId,
    name: input.name,
    url: input.url,
    format: input.format,
    isActive: true,
    createdAt: new Date().toISOString(),
  });
  return id;
};

export const GET = async () => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, session.user.id))
    .orderBy(desc(webhooks.createdAt));

  return NextResponse.json({ webhooks: rows });
};

const createWebhookForUser = async (userId: string, body: unknown): Promise<NextResponse> => {
  const input = parseCreateWebhookInput(body);
  if (input === undefined) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }
  if (!isValidHttpsUrl(input.url)) {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: HTTP_BAD_REQUEST });
  }
  const id = await insertWebhook(userId, input);
  return NextResponse.json({ id });
};

export const POST = async (request: NextRequest) => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }
  const body: unknown = await request.json().catch(() => null);
  return createWebhookForUser(session.user.id, body);
};
