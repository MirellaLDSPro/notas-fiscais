import { PDFParse } from "pdf-parse";
import type { ParsedNota } from "./db";

const toNum = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

const ITEM_RE =
  /(.+?)\s+\(Código:\s*(\S+)\s*\)\s+Qtde\.:\s*([\d.,]+)\s+UN:\s*(\S+)\s+Vl\.\s*Unit\.:\s*([\d.,]+)\s+Vl\.\s*Total\s+([\d.,]+)/g;

export type EnderecoPdf = {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
};

export function parseEnderecoPdf(line: string): EnderecoPdf | null {
  const parts = line.split(",").map((s) => s.trim());
  if (parts.length < 4) return null;
  const uf = parts[parts.length - 1] || null;
  const municipio = parts[parts.length - 2] || null;
  const bairro = parts[parts.length - 3] || null;
  const logradouro = parts[0] || null;
  const numero = parts.length >= 5 ? parts[1] || null : null;
  const complemento =
    parts.length >= 6 ? parts.slice(2, parts.length - 3).filter(Boolean).join(", ") || null : null;
  if (!logradouro && !municipio) return null;
  return { logradouro, numero, complemento, bairro, municipio, uf };
}

export async function parseNfcePdf(buffer: Buffer): Promise<ParsedNota> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let text: string;
  try {
    const res = await parser.getText();
    text = res.text;
  } finally {
    await parser.destroy();
  }

  const cnpjMatch = text.match(/CNPJ:\s*([\d./-]+)/);
  const cnpj = cnpjMatch?.[1] ?? null;

  let emitente = "Emitente desconhecido";
  let endereco: EnderecoPdf | null = null;
  if (cnpjMatch) {
    const before = text.slice(0, cnpjMatch.index);
    const linesBefore = before.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linesBefore.length) emitente = linesBefore[linesBefore.length - 1];

    const after = text.slice(cnpjMatch.index! + cnpjMatch[0].length);
    const linesAfter = after.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (linesAfter.length) {
      const candidate = linesAfter[0];
      if (candidate.includes(",")) {
        endereco = parseEnderecoPdf(candidate);
      }
    }
  }

  const headerMatch = text.match(
    /Número:\s*(\d+)\s+Série:\s*(\d+)\s+Emissão:\s*(\d{2}\/\d{2}\/\d{4})/
  );
  if (!headerMatch) {
    throw new Error("Não foi possível identificar Número/Série/Emissão. PDF de NFC-e válido?");
  }
  const [, numero, serie, dataEmissao] = headerMatch;

  const chaveMatch = text.match(/Chave de acesso:\s*\n?\s*((?:\d{4}\s+){10}\d{4})/);
  const chaveAcesso = chaveMatch ? chaveMatch[1].replace(/\s+/g, "") : null;

  const itens: ParsedNota["itens"] = [];
  for (const m of text.matchAll(ITEM_RE)) {
    const [, produtoRaw, codigo, qtRaw, unRaw, vuRaw, vtRaw] = m;
    const produto = produtoRaw.trim();
    if (!produto || produto.includes("\n")) continue;
    const un = unRaw.replace(/\d+$/, "");
    itens.push({
      produto,
      codigo: codigo || null,
      qt: toNum(qtRaw),
      un: un || null,
      vu: toNum(vuRaw),
      vt: toNum(vtRaw),
    });
  }

  if (itens.length === 0) {
    throw new Error("Nenhum item identificado no PDF.");
  }

  const valorTotal = Math.round(itens.reduce((s, i) => s + i.vt, 0) * 100) / 100;

  return {
    numero,
    serie,
    data_emissao: dataEmissao,
    emitente,
    cnpj,
    chave_acesso: chaveAcesso,
    valor_total: valorTotal,
    fonte: "PDF",
    itens,
    endereco,
  };
}
