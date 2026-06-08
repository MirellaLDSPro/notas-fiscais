import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import authConfig from "./auth.config";
import { canViewAsOwner, ensureUserByEmail, getUserById } from "@/lib/db";

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
});

export function userIdFromSession(
  session: { user?: { id?: string | null } | null } | null
): number | null {
  const raw = session?.user?.id;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type ViewingAs = {
  ownerUserId: number;
  email: string;
  name: string | null;
};

/**
 * Resolves whose data the current request should read.
 * If ?owner=<id> is present and the viewer has share access, returns the
 * owner's id with a viewingAs banner descriptor. Otherwise returns the
 * viewer's own id. Throws via redirect on unauthorized owner param.
 */
export async function resolveDataOwner(
  ownerParam: string | undefined
): Promise<{ viewerId: number; dataUserId: number; viewingAs: ViewingAs | null }> {
  const session = await auth();
  const viewerId = userIdFromSession(session);
  const viewerEmail = session?.user?.email ?? null;
  if (!viewerId) redirect("/login");

  if (!ownerParam) {
    return { viewerId, dataUserId: viewerId, viewingAs: null };
  }

  const ownerId = Number(ownerParam);
  if (!Number.isFinite(ownerId) || ownerId <= 0 || ownerId === viewerId) {
    redirect("/dashboard");
  }
  if (!viewerEmail) redirect("/dashboard");
  const allowed = await canViewAsOwner(viewerEmail, ownerId);
  if (!allowed) redirect("/dashboard");
  const owner = await getUserById(ownerId);
  if (!owner) redirect("/dashboard");

  return {
    viewerId,
    dataUserId: ownerId,
    viewingAs: { ownerUserId: ownerId, email: owner.email, name: owner.name },
  };
}
