"use client";

import { Search } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface TaglessSearchFormProps {
  query: string;
  month: string;
  onQueryChange: (value: string) => void;
  onMonthChange: (value: string) => void;
}

export const TaglessSearchForm = ({
  query,
  month,
  onQueryChange,
  onMonthChange,
}: TaglessSearchFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    onQueryChange(inputRef.current?.value.trim() ?? "");
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form action={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={query}
            ref={inputRef}
            type="search"
            defaultValue={query}
            placeholder="タイトル・説明文で検索..."
            className="h-9 pl-9"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" className="h-9">
          検索
        </Button>
      </form>
      <Input
        type="month"
        value={month}
        onChange={(event) => {
          onMonthChange(event.target.value);
        }}
        className="h-9 w-44"
      />
    </div>
  );
};
