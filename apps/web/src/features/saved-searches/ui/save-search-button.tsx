"use client";

import { Bookmark } from "lucide-react";
import { useState } from "react";

import { useSavedSearchesStore } from "../model/use-saved-searches";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";

interface SaveSearchButtonProps {
  currentUrl: string;
}

export const SaveSearchButton = ({ currentUrl }: SaveSearchButtonProps) => {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const addSaved = useSavedSearchesStore((state) => state.addSaved);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    addSaved(trimmed, currentUrl);
    setName("");
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="検索条件を保存" />}
      >
        <Bookmark className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
          className="flex items-center gap-2"
        >
          <Input
            type="text"
            placeholder="保存名を入力..."
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className="h-8 w-40 text-xs"
          />
          <Button type="submit" size="sm" className="h-8 text-xs">
            保存
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
