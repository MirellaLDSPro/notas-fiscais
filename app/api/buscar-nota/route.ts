import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth, userIdFromSession } from "@/auth";
import { NotaParseError } from "@/lib/parseNfce";
import { parseNfceHtml } from "@/lib/parseMhtNfce";
import {
  parseNfceXml,
  looksLikeNfeXml,
  consultaErroSefaz,
  mensagemErroSefaz,
} from "@/lib/parseNfceXml";
import { parseNfceTextViaClaude } from "@/lib/ocrNfce";
import { extrairChave, buscarHtml } from "@/lib/portais/sp";
import {
  notaExistsByChave,
  upsertNota,
  upsertEstabelecimento,
  recordNotaErro,
  type ParsedNota,
} from "@/lib/db";

export const runtime = "nodejs";

// Limite do payload cru guardado em notas_erros. O envelope de erro da SEFAZ é
// pequeno (~240 B); um DANFE/HTML pode ser grande — trunca pra não inchar a linha.
const MAX_RAW = 8000;

async function safeRecordErro(
  userId: number,
  chave: string,
  erro: string,
  numero: string | null = null,
  parsedPartial: Record<string, unknown> | null = null
) {
  try {
    await recordNotaErro(userId, {
      nome_arquivo: `busca:${chave}`,
      erro,
      numero,
      chave_acesso: chave,
      file_sha256: createHash("sha256").update(chave).digest("hex"),
      parsed_partial: parsedPartial,
    });
  } catch (e) {
    console.error("[buscar-nota] recordNotaErro falhou:", e);
  }
}

export async function POST(request: Request) {
  const userId = userIdFromSession(await auth());
  if (!userId) {
    return NextResponse.json({ status: "invalid", message: "Não autenticado." }, { status: 401 });
  }

  let input = "";
  try {
    const body = (await request.json()) as { input?: unknown };
    if (typeof body?.input === "string") input = body.input;
  } catch {
    /* corpo inválido cai no check abaixo */
  }
  if (!input.trim()) {
    return NextResponse.json(
      { status: "invalid", message: "Informe a URL ou a chave da nota." },
      { status: 400 }
    );
  }

  const resolved = extrairChave(input);
  if (!resolved) {
    return NextResponse.json({
      status: "invalid",
      message: "Não reconheci uma NFC-e válida nesse QR/chave.",
    });
  }
  if (!resolved.ufSuportada) {
    return NextResponse.json({
      status: "unsupported_uf",
      uf: resolved.uf,
      message: "Por enquanto a busca automática cobre São Paulo e Pernambuco. Use o envio de arquivo.",
    });
  }
  if (!resolved.url) {
    return NextResponse.json({
      status: "invalid",
      message:
        "Escaneie o QR Code da nota (a chave digitada não dá pra buscar automaticamente) ou envie o arquivo.",
    });
  }

  if (await notaExistsByChave(userId, resolved.chave)) {
    return NextResponse.json({
      status: "ok",
      action: "exists",
      fonte: "BUSCA",
      nota: { chave_acesso: resolved.chave },
    });
  }

  const fetched = await buscarHtml(resolved.url);
  if (!fetched.ok) {
    if (fetched.captcha) {
      return NextResponse.json({
        status: "captcha",
        url: resolved.url,
        message: "O site da Fazenda pediu captcha. Abra a nota e envie o arquivo.",
      });
    }
    await safeRecordErro(userId, resolved.chave, fetched.erro ?? "Falha na busca");
    return NextResponse.json({
      status: "error",
      url: resolved.url,
      message: "Não consegui buscar a nota agora. Tente o envio de arquivo.",
    });
  }

  // A SEFAZ respondeu, mas com um envelope de erro (sem a NFe) — ex.: PE quando
  // o QR não é aceito/expirou. Reporta o código real e nem tenta a IA (não há
  // dados pra ler), evitando a mensagem genérica enganosa.
  const erroSefaz = consultaErroSefaz(fetched.html);
  if (erroSefaz) {
    await safeRecordErro(userId, resolved.chave, mensagemErroSefaz(erroSefaz), null, {
      sefaz_erro: erroSefaz,
      raw: fetched.html.slice(0, MAX_RAW),
    });
    return NextResponse.json({
      status: "error",
      url: resolved.url,
      message:
        "A Fazenda não retornou essa nota pelo QR (pode estar indisponível ou o QR expirou). Envie o arquivo da nota.",
    });
  }

  let nota: ParsedNota;
  let fonte = "BUSCA";
  try {
    const parsed = looksLikeNfeXml(fetched.html)
      ? parseNfceXml(fetched.html)
      : parseNfceHtml(fetched.html);
    nota = { ...parsed, fonte: "BUSCA" };
  } catch (err) {
    const claude = await parseNfceTextViaClaude(fetched.html);
    if (claude.ok) {
      nota = claude.nota;
      fonte = "CLAUDE";
    } else {
      const hint = err instanceof NotaParseError ? err.hint : {};
      await safeRecordErro(
        userId,
        resolved.chave,
        err instanceof Error ? err.message : "Parse falhou",
        hint.numero ?? null,
        { raw: fetched.html.slice(0, MAX_RAW) }
      );
      return NextResponse.json({
        status: "error",
        url: resolved.url,
        message: "Busquei a nota mas não consegui ler os itens. Tente o envio de arquivo.",
      });
    }
  }

  const res = await upsertNota(userId, nota);
  if (nota.cnpj && nota.endereco) {
    await upsertEstabelecimento({
      cnpj: nota.cnpj,
      razao_social: nota.emitente,
      logradouro: nota.endereco.logradouro,
      numero: nota.endereco.numero,
      complemento: nota.endereco.complemento,
      bairro: nota.endereco.bairro,
      municipio: nota.endereco.municipio,
      uf: nota.endereco.uf,
      fonte: "PDF",
    });
  }

  return NextResponse.json({
    status: "ok",
    action: res.action === "inserted" ? "inserted" : "exists",
    fonte,
    nota: {
      numero: nota.numero,
      emitente: nota.emitente,
      total: nota.valor_total,
      itens: nota.itens.length,
      chave_acesso: nota.chave_acesso,
    },
  });
}
