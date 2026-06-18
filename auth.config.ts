import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Edge-safe config: providers + session strategy + pages only.
// Imported by middleware.ts (Edge runtime) and merged into auth.ts (Node runtime).
// Must NOT import anything that pulls in node:fs, db drivers, AI SDKs, etc.
const providers: NextAuthConfig["providers"] = [Google];

if (process.env.LOCAL_AUTH === "1") {
  providers.push(
    Credentials({
      id: "local",
      name: "Local Dev",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(creds) {
        const expectedEmail = process.env.LOCAL_TEST_EMAIL?.trim().toLowerCase();
        const expectedPassword = process.env.LOCAL_TEST_PASSWORD;
        if (!expectedEmail || !expectedPassword) return null;
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (email !== expectedEmail || password !== expectedPassword) return null;
        return { id: email, email, name: "Local Dev" };
      },
    })
  );
}

export default {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
