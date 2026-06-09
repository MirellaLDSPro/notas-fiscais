import { NextResponse } from "next/server";
import { auth, userIdFromSession } from "@/auth";
import { parseNfcePdf } from "@/lib/parseNfce";
import { parseMhtNfceBuffer } from "@/lib/parseMhtNfce";
import { parseXlsxBuffer } from "@/lib/parseXlsx";
import { parseNfpCsvBuffer } from "@/lib/parseNfpCsv";
import { upsertEstabelecimento, upsertNota, type ParsedNota } from "@/lib/db";

export const runtime = "nodejs";

type FileSummary = {
  numero: string;
  emitente: string;
  total: number;
  itens: number;
  action: "inserted" | "skipped";
  fonte: string;
};

type FileResult = {
  name: string;
  status: "ok" | "error";
  fonte?: string;
  notas?: FileSummary[];
  error?: string;
};

async function parseFile(name: string, buf: Buffer): Promise<ParsedNota[]> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return [await parseNfcePdf(buf)];
  if (lower.endsWith(".mht") || lower.endsWith(".mhtml")) return [parseMhtNfceBuffer(buf)];
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseXlsxBuffer(buf);
  if (lower.endsWith(".csv")) return parseNfpCsvBuffer(buf);
  throw new Error("Tipo de arquivo não suportado. Use PDF, MHT, XLSX ou CSV.");
}

export async function POST(request: Request) {
  try {
    const userId = userIdFromSession(await auth());
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const form = await request.formData();
    const files = form.getAll("file");
    if (!files.length) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const results: FileResult[] = [];
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const name = f.name || "upload";
      try {
        const buf = Buffer.from(await f.arrayBuffer());
        const parsed = await parseFile(name, buf);
        const notas: FileSummary[] = [];
        for (const p of parsed) {
          const res = await upsertNota(userId, p);
          if (p.fonte === "PDF" && p.cnpj && p.endereco) {
            await upsertEstabelecimento({
              cnpj: p.cnpj,
              razao_social: p.emitente,
              logradouro: p.endereco.logradouro,
              numero: p.endereco.numero,
              complemento: p.endereco.complemento,
              bairro: p.endereco.bairro,
              municipio: p.endereco.municipio,
              uf: p.endereco.uf,
              fonte: "PDF",
            });
          }
          notas.push({
            numero: p.numero,
            emitente: p.emitente,
            total: p.valor_total,
            itens: p.itens.length,
            action: res.action === "inserted" ? "inserted" : "skipped",
            fonte: p.fonte,
          });
        }
        results.push({
          name,
          status: "ok",
          fonte: parsed[0]?.fonte,
          notas,
        });
      } catch (err) {
        console.error(`[upload] erro processando ${name}:`, err);
        results.push({
          name,
          status: "error",
          error: err instanceof Error ? err.message : "Erro ao processar.",
        });
      }
    }
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[upload] erro de nível superior:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erro interno no upload.",
      },
      { status: 500 }
    );
  }
}
