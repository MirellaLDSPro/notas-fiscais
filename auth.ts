import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { ensureUserByEmail } from "@/lib/db";

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      const email = (profile?.email ?? user?.email ?? "").toLowerCase();
      if (!email) return false;
      await ensureUserByEmail(email, profile?.name ?? user?.name ?? null);
      return true;
    },
    async jwt({ token }) {
      if (!token.uid && token.email) {
        token.uid = await ensureUserByEmail(token.email, token.name ?? null);
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = String(token.uid);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export function userIdFromSession(
  session: { user?: { id?: string | null } | null } | null
): number | null {
  const raw = session?.user?.id;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
