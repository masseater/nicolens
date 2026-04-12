import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { accounts, getDb, sessions, users, verificationTokens } from "@nicolens/datastore";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// oxlint-disable new-cap -- NextAuth and DrizzleAdapter are factory functions, not constructors
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: "database" },
});
