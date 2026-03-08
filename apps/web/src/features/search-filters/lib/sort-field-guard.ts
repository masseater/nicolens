import type { SortField } from "@/shared/types";

const VALID_SORT_FIELDS: ReadonlySet<string> = new Set<string>([
  "viewCounter",
  "mylistCounter",
  "likeCounter",
  "lengthSeconds",
  "startTime",
  "commentCounter",
  "lastCommentTime",
]);

export const isSortField = (value: string): value is SortField => VALID_SORT_FIELDS.has(value);
