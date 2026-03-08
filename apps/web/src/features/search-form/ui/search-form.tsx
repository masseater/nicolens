"use client";

import { Brain, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { parseQueryInput } from "@/shared/lib";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const QUERY_PARAM = "q";
const DEFAULT_TARGETS = "title,description,tags";

// Build search URL params from parsed query input
const buildSearchUrl = (parsed: { query: string; targets: string; tags: string[] }): string => {
  const params = new URLSearchParams({ [QUERY_PARAM]: parsed.query });
  if (parsed.targets !== DEFAULT_TARGETS) {
    params.set("targets", parsed.targets);
  }
  for (const tag of parsed.tags) {
    params.append("tag", tag);
  }
  return `/search?${params.toString()}`;
};

// Build semantic search URL with query
const buildSemanticUrl = (query: string): string => {
  const params = new URLSearchParams();
  if (query !== "") {
    params.set(QUERY_PARAM, query);
  }
  const qs = params.toString();
  return `/search/semantic${qs === "" ? "" : `?${qs}`}`;
};

// Build tagless search URL with query
const buildTaglessUrl = (query: string): string => {
  const params = new URLSearchParams();
  if (query !== "") {
    params.set(QUERY_PARAM, query);
  }
  const qs = params.toString();
  return `/search/tagless${qs === "" ? "" : `?${qs}`}`;
};

const useSlashFocus = (inputRef: React.RefObject<HTMLInputElement | null>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputRef]);
};

interface SearchFormProps {
  defaultValue?: string;
  size?: "lg" | "sm";
}

const validateAndParse = (
  raw: string,
): { url: string; error?: never } | { url?: never; error: string } => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { error: "" };
  }
  const parsed = parseQueryInput(trimmed);
  if (parsed.error !== undefined) {
    return { error: parsed.error };
  }
  return { url: buildSearchUrl(parsed) };
};

const useSearchSubmit = (query: string, router: ReturnType<typeof useRouter>) => {
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    const result = validateAndParse(query);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    router.push(result.url);
  };

  const handleSubmitWithoutTags = () => {
    router.push(buildTaglessUrl(query.trim()));
  };

  const handleSubmitSemantic = () => {
    router.push(buildSemanticUrl(query.trim()));
  };

  const clearError = () => {
    if (error !== "") {
      setError("");
    }
  };

  return { error, handleSubmit, handleSubmitWithoutTags, handleSubmitSemantic, clearError };
};

interface SearchActionsProps {
  isLarge: boolean;
  onSemantic: () => void;
  onTagless: () => void;
}

const SearchActions = ({ isLarge, onSemantic, onTagless }: SearchActionsProps) => (
  <>
    <Button
      type="button"
      variant="secondary"
      size={isLarge ? "default" : "sm"}
      className="whitespace-nowrap text-xs sm:text-sm"
      onClick={onSemantic}
    >
      <Brain className="mr-1 size-4" />
      意味合い検索
    </Button>
    <Button
      type="button"
      variant="secondary"
      size={isLarge ? "default" : "sm"}
      className="whitespace-nowrap text-xs sm:text-sm"
      onClick={onTagless}
    >
      タグなしで検索
    </Button>
  </>
);

export const SearchForm = ({ defaultValue, size = "lg" }: SearchFormProps) => {
  const searchParams = useSearchParams();
  const initialValue = defaultValue ?? searchParams?.get(QUERY_PARAM) ?? "";
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashFocus(inputRef);
  const { error, handleSubmit, handleSubmitWithoutTags, handleSubmitSemantic, clearError } =
    useSearchSubmit(query, router);

  const isLarge = size === "lg";

  return (
    <form action={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <Input
          ref={inputRef}
          type="search"
          placeholder="動画を検索..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            clearError();
          }}
          className={isLarge ? "h-10 sm:h-12 sm:text-lg" : "h-9"}
        />
        <Button
          type="submit"
          size={isLarge ? "lg" : "sm"}
          className={isLarge ? "h-10 px-4 sm:h-12 sm:px-6" : ""}
        >
          <Search className={isLarge ? "size-5" : "mr-1 size-4"} />
          <span className="hidden sm:inline">検索</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <SearchActions
          isLarge={isLarge}
          onSemantic={handleSubmitSemantic}
          onTagless={handleSubmitWithoutTags}
        />
      </div>
      {error !== "" && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
};
