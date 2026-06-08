import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowed = (process.env.AUTH_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return Boolean(email && allowed.includes(email));
    },
  },
  pages: {
    signIn: "/login",
  },
});
