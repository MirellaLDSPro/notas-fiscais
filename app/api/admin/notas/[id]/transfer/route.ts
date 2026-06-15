import { NextResponse } from "next/server";
import { requireAdmin } from "@/auth";
import { ensureUserByEmail, getUserById, transferNota } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id?: string } }) {
  try {
    const { userId: adminUserId } = await requireAdmin();
    const idRaw = params?.id;

    // read raw body for debugging and parsing safely
    let rawBody = "";
    try {
      rawBody = await request.text();
    } catch (e) {
      rawBody = "";
    }
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      body = {};
    }

    const notaId = Number(idRaw);
    if (!Number.isFinite(notaId) || notaId <= 0) {
      console.error("[admin/transfer] invalid nota id", { paramsId: idRaw, paramsType: typeof idRaw, rawBody });
      return NextResponse.json({ error: "nota id inválido", debug: { paramsId: idRaw, paramsType: typeof idRaw, rawBody } }, { status: 400 });
    }

    const toUserIdRaw = body.toUserId;
    const toUserEmailRaw = body.toUserEmail;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : null;

    let toUserId: number | null = null;
    if (toUserIdRaw) {
      const candidate = Number(toUserIdRaw);
      if (!Number.isFinite(candidate) || candidate <= 0) {
        return NextResponse.json({ error: "toUserId inválido" }, { status: 400 });
      }
      const u = await getUserById(candidate);
      if (!u) return NextResponse.json({ error: "Usuário destino não encontrado" }, { status: 404 });
      toUserId = candidate;
    } else if (toUserEmailRaw) {
      const email = String(toUserEmailRaw).trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "toUserEmail inválido" }, { status: 400 });
      }
      toUserId = await ensureUserByEmail(email, null);
    } else {
      return NextResponse.json({ error: "toUserId ou toUserEmail requerido" }, { status: 400 });
    }

    const result = await transferNota(notaId, toUserId, adminUserId, reason);
    if (result === 'not_found') return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 });
    if (result === 'no_change') return NextResponse.json({ status: 'no_change' });

    return NextResponse.json({ status: 'transferred' });
  } catch (err) {
    console.error("[admin/transfer] erro:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "erro interno" }, { status: 500 });
  }
}
