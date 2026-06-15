import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config: providers + session strategy + pages only.
// Imported by middleware.ts (Edge runtime) and merged into auth.ts (Node runtime).
// Must NOT import anything that pulls in node:fs, db drivers, AI SDKs, etc.
export default {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
