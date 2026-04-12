import { LogIn } from "lucide-react";

import { signIn } from "@/auth";
import { Button } from "@/shared/ui/button";

export const AuthButton = () => {
  const handleSignIn = async () => {
    "use server";
    await signIn("github", { redirectTo: "/" });
  };

  return (
    <form action={handleSignIn}>
      <Button type="submit" variant="outline" size="sm">
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">GitHubでログイン</span>
      </Button>
    </form>
  );
};
