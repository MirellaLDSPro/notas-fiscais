import { NextResponse } from "next/server";
import { auth, userIdFromSession } from "@/auth";
import { gerarReceitas } from "@/lib/recipes";
import { isFeatureEnabled } from "@/lib/featureFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const userId = userIdFromSession(session);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!(await isFeatureEnabled("receitas", session?.user?.email, userId))) {
    return NextResponse.json({ error: "Feature indisponível." }, { status: 403 });
  }
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await gerarReceitas(userId, { force });
  if (!result.ok) {
    const status = result.error.kind === "no_key" ? 503 : result.error.kind === "no_items" ? 409 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ payload: result.payload, cached: result.cached });
}
