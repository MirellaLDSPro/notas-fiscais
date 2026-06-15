import { NextResponse } from "next/server";
import { auth, userIdFromSession } from "@/auth";
import { listNotas } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = userIdFromSession(await auth());
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ notas: await listNotas(userId) });
}
