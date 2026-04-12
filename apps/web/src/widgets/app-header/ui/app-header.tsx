import { Tag } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { AuthButton, UserMenu } from "@/features/auth";
import { ThemeToggle } from "@/features/theme-toggle";
import { Button } from "@/shared/ui/button";

export const AppHeader = async () => {
  const session = await auth();

  return (
    <header className="sticky top-0 z-header border-b-2 border-b-header-border bg-header-bg backdrop-blur supports-backdrop-filter:bg-header-bg/60">
      <div className="mx-auto flex h-(--header-height) max-w-[1920px] items-center justify-between px-3 sm:px-4">
        <Link href="/" className="text-lg font-bold whitespace-nowrap">
          nicolens
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/search/tagless" />}
          >
            <Tag className="size-3.5" />
            <span className="hidden sm:inline">タグなし</span>
          </Button>
          <ThemeToggle />
          {session?.user ? <UserMenu /> : <AuthButton />}
        </div>
      </div>
    </header>
  );
};
