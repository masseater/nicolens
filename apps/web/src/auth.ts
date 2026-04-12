import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { accounts, getDb, sessions, users, verificationTokens } from "@nicolens/datastore";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// eslint-disable-next-line new-cap -- NextAuth and DrizzleAdapter are factory functions
export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line new-cap -- DrizzleAdapter is a factory function
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: "database" },
});
