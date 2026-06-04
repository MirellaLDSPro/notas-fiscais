import { NextResponse } from "next/server";
import { lookupCnpj } from "@/lib/brasilapi";
import {
  cnpjDigits,
  listCnpjsWithoutEstabelecimento,
  upsertEstabelecimento,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResultRow = {
  cnpj: string;
  status: "ok" | "skipped" | "error";
  message?: string;
};

async function runSync(): Promise<{
  total: number;
  synced: number;
  failed: number;
  results: ResultRow[];
}> {
  const cnpjs = listCnpjsWithoutEstabelecimento();
  const results: ResultRow[] = [];
  for (let i = 0; i < cnpjs.length; i++) {
    const raw = cnpjs[i];
    const digits = cnpjDigits(raw);
    if (digits.length !== 14) {
      results.push({ cnpj: raw, status: "skipped", message: "CNPJ inválido" });
      continue;
    }
    const r = await lookupCnpj(digits);
    if (r.ok) {
      upsertEstabelecimento({
        cnpj: digits,
        razao_social: r.data.razao_social,
        nome_fantasia: r.data.nome_fantasia,
        logradouro: r.data.logradouro,
        numero: r.data.numero,
        complemento: r.data.complemento,
        bairro: r.data.bairro,
        municipio: r.data.municipio,
        uf: r.data.uf,
        cep: r.data.cep,
        fonte: "BRASIL_API",
      });
      results.push({ cnpj: raw, status: "ok" });
    } else {
      results.push({
        cnpj: raw,
        status: "error",
        message: `${r.status}: ${r.message}`,
      });
    }
    if (i < cnpjs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  const synced = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;
  return { total: cnpjs.length, synced, failed, results };
}

export async function GET() {
  const summary = await runSync();
  return NextResponse.json(summary);
}

export async function POST() {
  const summary = await runSync();
  return NextResponse.json(summary);
}
