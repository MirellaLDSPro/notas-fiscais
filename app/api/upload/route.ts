import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth, userIdFromSession } from "@/auth";
import { NotaParseError, parseNfcePdf } from "@/lib/parseNfce";
import { extractHtmlPart, parseMhtNfceBuffer } from "@/lib/parseMhtNfce";
import { parseXlsxBuffer } from "@/lib/parseXlsx";
import { parseNfpCsvBuffer } from "@/lib/parseNfpCsv";
import { parseNfceTextViaClaude, parseNfceViaClaude } from "@/lib/ocrNfce";
import {
  recordNotaErro,
  upsertEstabelecimento,
  upsertNota,
  type ParsedNota,
} from "@/lib/db";

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
  numero?: string | null;
  chave_acesso?: string | null;
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
      const buf = Buffer.from(await f.arrayBuffer());
      try {
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
        const errorMessage = err instanceof Error ? err.message : "Erro ao processar.";
        const hint = err instanceof NotaParseError ? err.hint : {};
        console.error(`[upload] regex falhou para ${name}:`, errorMessage);

        let partial: Record<string, unknown> | null = null;

        // Attempt Claude fallback for any supported file type
        const ext = name.toLowerCase().split('.').pop() || '';
        const supportedExts = ['pdf','mht','mhtml'];
        if (supportedExts.includes(ext)) {
          let claude;
          if (ext === 'mht' || ext === 'mhtml') {
            // A Anthropic só aceita PDF em document blocks; extraímos o HTML do
            // MHT e enviamos como texto.
            let html: string | null = null;
            try {
              html = extractHtmlPart(buf);
            } catch (extractErr) {
              console.error(`[upload] extração de HTML do MHT falhou para ${name}:`, extractErr);
            }
            claude = html
              ? await parseNfceTextViaClaude(html)
              : { ok: false as const, partial: { numero: null, chave_acesso: null, emitente: null, cnpj: null, data_emissao: null, valor_total: null, itens_count: 0 } };
          } else {
            claude = await parseNfceViaClaude(buf, 'application/pdf');
          }
          if (claude.ok) {
            try {
              const res = await upsertNota(userId, claude.nota);
              results.push({
                name,
                status: "ok",
                fonte: "CLAUDE",
                notas: [
                  {
                    numero: claude.nota.numero,
                    emitente: claude.nota.emitente,
                    total: claude.nota.valor_total,
                    itens: claude.nota.itens.length,
                    action: res.action === "inserted" ? "inserted" : "skipped",
                    fonte: "CLAUDE",
                  },
                ],
              });
              continue;
            } catch (insertErr) {
              console.error(`[upload] insert pós-Claude falhou para ${name}:`, insertErr);
              partial = {
                numero: claude.nota.numero,
                chave_acesso: claude.nota.chave_acesso,
                emitente: claude.nota.emitente,
                cnpj: claude.nota.cnpj,
                data_emissao: claude.nota.data_emissao,
                valor_total: claude.nota.valor_total,
                itens_count: claude.nota.itens.length,
              };
            }
          } else {
            partial = { ...claude.partial };
          }
        }

        const numero = (partial?.numero as string | null) ?? hint.numero ?? null;
        const chave_acesso =
          (partial?.chave_acesso as string | null) ?? hint.chave_acesso ?? null;

        try {
          await recordNotaErro(userId, {
            nome_arquivo: name,
            erro: errorMessage,
            numero,
            chave_acesso,
            file_sha256: createHash("sha256").update(buf).digest("hex"),
            parsed_partial: partial,
          });
        } catch (logErr) {
          console.error(`[upload] falha ao registrar erro de ${name}:`, logErr);
        }

        results.push({
          name,
          status: "error",
          error: errorMessage,
          numero,
          chave_acesso,
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
