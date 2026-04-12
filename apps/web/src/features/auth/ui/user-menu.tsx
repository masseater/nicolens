import { LogOut } from "lucide-react";
import Link from "next/link";

import { auth, signOut } from "@/auth";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export const UserMenu = async () => {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  const { user } = session;
  const [nameInitial] = user.name ?? "";
  const [emailInitial] = user.email ?? "";
  const initial = nameInitial ?? emailInitial ?? "?";
  const hasImage = user.image !== null && user.image !== undefined && user.image !== "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="ユーザーメニュー" />}
      >
        {hasImage ? (
          // oxlint-disable-next-line nextjs/no-img-element -- intentionally avoid next/image to eliminate Vercel Image Optimization costs
          <img src={user.image ?? ""} alt={user.name ?? "User"} className="size-6 rounded-full" />
        ) : (
          <span className="text-xs font-medium">{initial}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.name ?? user.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/webhooks">Webhooks</Link>} />
        <DropdownMenuItem render={<Link href="/watches">Tag Watches</Link>} />
        <DropdownMenuSeparator />
        <form action={handleSignOut}>
          <DropdownMenuItem
            render={
              <button type="submit" className="flex w-full items-center gap-1.5">
                <LogOut className="size-4" />
                ログアウト
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
