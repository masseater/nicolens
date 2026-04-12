import { getDb, tagTriggers } from "@nicolens/datastore";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const NO_ROWS = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TagTriggerUpdates {
  isActive?: boolean;
}

const buildUpdatesFromRecord = (record: Record<string, unknown>): TagTriggerUpdates => {
  const updates: TagTriggerUpdates = {};
  if (typeof record["isActive"] === "boolean") {
    updates.isActive = record["isActive"];
  }
  return updates;
};

const parseUpdateInput = (value: unknown): TagTriggerUpdates | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>; // oxlint-disable-line @typescript-eslint/no-unsafe-type-assertion -- safe after object check
  const updates = buildUpdatesFromRecord(record);
  if (Object.keys(updates).length === NO_ROWS) {
    return undefined;
  }
  return updates;
};

const applyUpdate = async (
  id: string,
  userId: string,
  updates: TagTriggerUpdates,
): Promise<boolean> => {
  const db = getDb();
  const result = await db
    .update(tagTriggers)
    .set(updates)
    .where(and(eq(tagTriggers.id, id), eq(tagTriggers.userId, userId)))
    .returning({ id: tagTriggers.id });
  return result.length > NO_ROWS;
};

const applyDelete = async (id: string, userId: string): Promise<boolean> => {
  const db = getDb();
  const result = await db
    .delete(tagTriggers)
    .where(and(eq(tagTriggers.id, id), eq(tagTriggers.userId, userId)))
    .returning({ id: tagTriggers.id });
  return result.length > NO_ROWS;
};

const performUpdate = async (id: string, userId: string, body: unknown): Promise<NextResponse> => {
  const updates = parseUpdateInput(body);
  if (updates === undefined) {
    return NextResponse.json({ error: "Invalid body" }, { status: HTTP_BAD_REQUEST });
  }
  const ok = await applyUpdate(id, userId, updates);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }
  return NextResponse.json({ success: true });
};

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  return performUpdate(id, session.user.id, body);
};

export const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  const session = await auth();
  if (session?.user?.id === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
  }

  const { id } = await params;
  const ok = await applyDelete(id, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: HTTP_NOT_FOUND });
  }
  return NextResponse.json({ success: true });
};
