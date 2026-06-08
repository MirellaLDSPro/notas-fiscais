import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

declare global {
  // eslint-disable-next-line no-var
  var __last_signin: unknown | undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      const profileEmail = profile?.email?.toLowerCase();
      const userEmail = user?.email?.toLowerCase();
      const email = profileEmail ?? userEmail;
      const ok = Boolean(email && allowed.includes(email));
      globalThis.__last_signin = {
        at: new Date().toISOString(),
        profileEmail: profile?.email ?? null,
        userEmail: user?.email ?? null,
        normalizedChecked: email ?? null,
        allowed,
        ok,
      };
      return ok;
    },
  },
  pages: {
    signIn: "/login",
  },
});
