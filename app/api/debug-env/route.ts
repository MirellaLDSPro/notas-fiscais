import { NextResponse } from "next/server";

// TEMPORARY — diagnostic only. Returns presence/length of auth secrets and
// related URLs without leaking values. Delete after PKCE issue is fixed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function describe(name: string) {
  const v = process.env[name];
  return {
    set: typeof v === "string" && v.length > 0,
    length: v?.length ?? 0,
  };
}

export async function GET() {
  return NextResponse.json({
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV ?? null,
    vercel_url: process.env.VERCEL_URL ?? null,
    auth_secret: describe("AUTH_SECRET"),
    nextauth_secret: describe("NEXTAUTH_SECRET"),
    auth_url: process.env.AUTH_URL ?? null,
    nextauth_url: process.env.NEXTAUTH_URL ?? null,
  });
}
