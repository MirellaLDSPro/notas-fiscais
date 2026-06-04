import { NextResponse } from "next/server";
import { gerarReceitas } from "@/lib/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await gerarReceitas({ force });
  if (!result.ok) {
    const status = result.error.kind === "no_key" ? 503 : result.error.kind === "no_items" ? 409 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ payload: result.payload, cached: result.cached });
}
