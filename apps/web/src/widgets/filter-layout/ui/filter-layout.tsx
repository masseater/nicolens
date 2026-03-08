"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/shared/ui/button";

interface FilterLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  mobileStickyClassName?: string;
}

export const FilterLayout = ({ sidebar, children, mobileStickyClassName }: FilterLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 gap-6">
      <aside className="hidden w-(--sidebar-width) shrink-0 overflow-y-auto pb-6 lg:block">
        {sidebar}
      </aside>
      <div data-slot="results" className="min-w-0 flex-1 overflow-y-auto">
        <div className={mobileStickyClassName ?? "lg:hidden"}>
          <div className="mb-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setMobileOpen(!mobileOpen);
              }}
            >
              {mobileOpen ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
              フィルタ
            </Button>
          </div>
          {mobileOpen && <div className="mb-4">{sidebar}</div>}
        </div>
        {children}
      </div>
    </div>
  );
};
