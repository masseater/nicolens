"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const FIRST_PAGE = 1;
const SINGLE_PAGE = 1;
const PAGE_STEP = 1;
const NEIGHBOR_COUNT = 2;
const CONSECUTIVE_GAP = 1;
const EMPTY_LENGTH = 0;
const LAST_INDEX_OFFSET = 1;
const JUMP_THRESHOLD = 20;
const SMALL_JUMP = 10;
const LARGE_JUMP = 100;
const LARGE_JUMP_THRESHOLD = 200;
const RADIX = 10;
const DISABLED_TAB_INDEX = -1;

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  limit: number;
  buildHref: (page: number) => string;
  onPageChange: (page: number) => void;
}

interface EllipsisItem {
  kind: "ellipsis";
  before: number;
  after: number;
}
interface PageItem {
  kind: "page";
  value: number;
}
type PageEntry = PageItem | EllipsisItem;

const collectPages = function collectPages(currentPage: number, totalPages: number): Set<number> {
  const pageSet = new Set<number>();

  const addPage = function addPage(page: number) {
    if (page >= FIRST_PAGE && page <= totalPages) {
      pageSet.add(page);
    }
  };

  addPage(FIRST_PAGE);
  addPage(totalPages);

  for (let offset = -NEIGHBOR_COUNT; offset <= NEIGHBOR_COUNT; offset++) {
    addPage(currentPage + offset);
  }

  return pageSet;
};

const buildPageEntries = function buildPageEntries(
  currentPage: number,
  totalPages: number,
): PageEntry[] {
  const pageSet = collectPages(currentPage, totalPages);
  const sorted = [...pageSet].toSorted((left, right) => left - right);
  const result: PageEntry[] = [];
  for (const page of sorted) {
    if (result.length > EMPTY_LENGTH) {
      const prev = result.at(-LAST_INDEX_OFFSET);
      if (prev?.kind === "page" && page - prev.value > CONSECUTIVE_GAP) {
        result.push({ kind: "ellipsis", before: prev.value, after: page });
      }
    }
    result.push({ kind: "page", value: page });
  }
  return result;
};

const PageJumpInput = function PageJumpInput({
  totalPages,
  onPageChange,
}: {
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const page = Number.parseInt(inputValue, RADIX);
    if (!Number.isNaN(page) && page >= FIRST_PAGE && page <= totalPages) {
      onPageChange(page);
      setInputValue("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <Input
        type="number"
        min={FIRST_PAGE}
        max={totalPages}
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
        }}
        placeholder={`1-${String(totalPages)}`}
        className="h-7 w-20 text-xs text-center"
      />
      <Button type="submit" variant="outline" size="sm" className="h-7 text-xs">
        Go
      </Button>
    </form>
  );
};

const JumpBackButtons = function JumpBackButtons({
  currentPage,
  showSmallJump,
  showLargeJump,
  buildHref,
}: {
  currentPage: number;
  showSmallJump: boolean;
  showLargeJump: boolean;
  buildHref: (page: number) => string;
}) {
  return (
    <>
      {showLargeJump && (
        <Link
          href={buildHref(Math.max(FIRST_PAGE, currentPage - LARGE_JUMP))}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden h-8 text-xs sm:inline-flex",
            currentPage - LARGE_JUMP < FIRST_PAGE && "pointer-events-none opacity-50",
          )}
          aria-disabled={currentPage - LARGE_JUMP < FIRST_PAGE}
          tabIndex={currentPage - LARGE_JUMP < FIRST_PAGE ? DISABLED_TAB_INDEX : undefined}
        >
          <ChevronsLeft className="size-3" />
          {LARGE_JUMP}
        </Link>
      )}
      {showSmallJump && (
        <Link
          href={buildHref(Math.max(FIRST_PAGE, currentPage - SMALL_JUMP))}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden h-8 text-xs sm:inline-flex",
            currentPage - SMALL_JUMP < FIRST_PAGE && "pointer-events-none opacity-50",
          )}
          aria-disabled={currentPage - SMALL_JUMP < FIRST_PAGE}
          tabIndex={currentPage - SMALL_JUMP < FIRST_PAGE ? DISABLED_TAB_INDEX : undefined}
        >
          <ChevronLeft className="size-3" />
          {SMALL_JUMP}
        </Link>
      )}
    </>
  );
};

const JumpForwardButtons = function JumpForwardButtons({
  currentPage,
  totalPages,
  showSmallJump,
  showLargeJump,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  showSmallJump: boolean;
  showLargeJump: boolean;
  buildHref: (page: number) => string;
}) {
  return (
    <>
      {showSmallJump && (
        <Link
          href={buildHref(Math.min(totalPages, currentPage + SMALL_JUMP))}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden h-8 text-xs sm:inline-flex",
            currentPage + SMALL_JUMP > totalPages && "pointer-events-none opacity-50",
          )}
          aria-disabled={currentPage + SMALL_JUMP > totalPages}
          tabIndex={currentPage + SMALL_JUMP > totalPages ? DISABLED_TAB_INDEX : undefined}
        >
          {SMALL_JUMP}
          <ChevronRight className="size-3" />
        </Link>
      )}
      {showLargeJump && (
        <Link
          href={buildHref(Math.min(totalPages, currentPage + LARGE_JUMP))}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "hidden h-8 text-xs sm:inline-flex",
            currentPage + LARGE_JUMP > totalPages && "pointer-events-none opacity-50",
          )}
          aria-disabled={currentPage + LARGE_JUMP > totalPages}
          tabIndex={currentPage + LARGE_JUMP > totalPages ? DISABLED_TAB_INDEX : undefined}
        >
          {LARGE_JUMP}
          <ChevronsRight className="size-3" />
        </Link>
      )}
    </>
  );
};

const renderEntry = function renderEntry(
  entry: PageEntry,
  currentPage: number,
  buildHref: (page: number) => string,
) {
  if (entry.kind === "ellipsis") {
    return (
      <span
        key={`ellipsis-${String(entry.before)}-${String(entry.after)}`}
        className="px-2 text-sm text-muted-foreground"
      >
        ...
      </span>
    );
  }
  const isActive = entry.value === currentPage;
  return (
    <Link
      key={entry.value}
      href={buildHref(entry.value)}
      className={cn(
        buttonVariants({ variant: isActive ? "default" : "outline", size: "sm" }),
        "h-8 min-w-8 text-xs sm:h-7 sm:min-w-7",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {entry.value}
    </Link>
  );
};

const PrevNextButtons = function PrevNextButtons({
  currentPage,
  totalPages,
  entries,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  entries: PageEntry[];
  buildHref: (page: number) => string;
}) {
  const isPrevDisabled = currentPage <= FIRST_PAGE;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <>
      <Link
        href={buildHref(Math.max(FIRST_PAGE, currentPage - PAGE_STEP))}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          isPrevDisabled && "pointer-events-none opacity-50",
        )}
        aria-disabled={isPrevDisabled}
        aria-label="前のページ"
        tabIndex={isPrevDisabled ? DISABLED_TAB_INDEX : undefined}
      >
        <ChevronLeft className="size-4" />
      </Link>
      {entries.map((entry) => renderEntry(entry, currentPage, buildHref))}
      <Link
        href={buildHref(Math.min(totalPages, currentPage + PAGE_STEP))}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          isNextDisabled && "pointer-events-none opacity-50",
        )}
        aria-disabled={isNextDisabled}
        aria-label="次のページ"
        tabIndex={isNextDisabled ? DISABLED_TAB_INDEX : undefined}
      >
        <ChevronRight className="size-4" />
      </Link>
    </>
  );
};

export const Pagination = function Pagination({
  currentPage,
  totalCount,
  limit,
  buildHref,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalCount / limit);

  if (totalPages <= SINGLE_PAGE) {
    return null;
  }

  const entries = buildPageEntries(currentPage, totalPages);
  const showSmallJump = totalPages >= JUMP_THRESHOLD;
  const showLargeJump = totalPages >= LARGE_JUMP_THRESHOLD;

  return (
    <nav className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <JumpBackButtons
          currentPage={currentPage}
          showSmallJump={showSmallJump}
          showLargeJump={showLargeJump}
          buildHref={buildHref}
        />
        <PrevNextButtons
          currentPage={currentPage}
          totalPages={totalPages}
          entries={entries}
          buildHref={buildHref}
        />
        <JumpForwardButtons
          currentPage={currentPage}
          totalPages={totalPages}
          showSmallJump={showSmallJump}
          showLargeJump={showLargeJump}
          buildHref={buildHref}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {currentPage} / {totalPages} ページ
        </span>
        <PageJumpInput totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </nav>
  );
};
