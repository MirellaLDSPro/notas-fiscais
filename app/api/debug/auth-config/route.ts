import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    AUTH_ALLOWED_EMAILS: process.env.AUTH_ALLOWED_EMAILS ?? null,
    AUTH_URL: process.env.AUTH_URL ?? null,
    AUTH_GOOGLE_ID_set: Boolean(process.env.AUTH_GOOGLE_ID),
    AUTH_GOOGLE_SECRET_set: Boolean(process.env.AUTH_GOOGLE_SECRET),
    AUTH_SECRET_set: Boolean(process.env.AUTH_SECRET),
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL ?? null,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    last_signin: (globalThis as { __last_signin?: unknown }).__last_signin ?? null,
  });
}
