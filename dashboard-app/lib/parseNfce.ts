import type { ParsedNota } from "./db";

export type NotaParseHint = {
  numero?: string | null;
  chave_acesso?: string | null;
};

export class NotaParseError extends Error {
  hint: NotaParseHint;
  constructor(message: string, hint: NotaParseHint = {}) {
    super(message);
    this.name = "NotaParseError";
    this.hint = hint;
  }
}

const toNum = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

function findChaveAcesso(text: string): string | null {
  const grouped = text.match(/((?:\d{4}\s+){10}\d{4})/);
  if (grouped) return grouped[1].replace(/\s+/g, "");
  const flat = text.match(/(?<!\d)(\d{44})(?!\d)/);
  return flat ? flat[1] : null;
}

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
  // dynamically import pdf-parse to avoid loading browser-dependent modules at build time
  const mod: any = await import("pdf-parse").catch((e) => {
    throw new NotaParseError("Falha ao carregar parser de PDF: " + String(e));
  });
  const PDFParseCtor = (mod && (mod.PDFParse || mod.default || mod)) as any;
  if (!PDFParseCtor) throw new NotaParseError("Parser de PDF não disponível");

  const parser = new PDFParseCtor({ data: new Uint8Array(buffer) });
  let text: string;
  try {
    const res = await parser.getText();
    text = res.text;
  } finally {
    if (typeof parser.destroy === "function") await parser.destroy();
  }

  if (/Cupom Fiscal Eletrônico SAT|CUPOM FISCAL ELETRÔNICO\s*-\s*SAT/i.test(text)) {
    return parseSatText(text);
  }

  return parseNfceText(text);
}

function parseNfceText(text: string): ParsedNota {
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

  const chaveAcesso = findChaveAcesso(text);
  const numeroFallback = text.match(/Número:\s*(\d+)/)?.[1] ?? null;

  const headerMatch = text.match(
    /Número:\s*(\d+)\s+Série:\s*(\d+)\s+Emissão:\s*(\d{2}\/\d{2}\/\d{4})/
  );
  if (!headerMatch) {
    throw new NotaParseError(
      "Não foi possível identificar Número/Série/Emissão. PDF de NFC-e válido?",
      { numero: numeroFallback, chave_acesso: chaveAcesso }
    );
  }
  const [, numero, serie, dataEmissao] = headerMatch;

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
    throw new NotaParseError("Nenhum item identificado no PDF.", {
      numero,
      chave_acesso: chaveAcesso,
    });
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

const SAT_ITEM_RE =
  /^(\d{1,3})\s+([A-Z][A-Z0-9]+)\s+([\s\S]+?)\s+(\d+,\d{4})\s+([A-Z]+)(\d)\s+([\d.,]+)\s+\([\d.,]+\)\s+([\d.,]+)/gm;

function parseSatEndereco(enderecoLine: string, bairroLine: string): EnderecoPdf | null {
  const end = enderecoLine.match(/Endereço:\s*(.+?)(?:,\s*Nº\s*(\S+))?(?:\s*-\s*(.+))?$/);
  const bai = bairroLine.match(
    /Bairro:\s*(.+?)\s*(?:-\s*CEP:\s*\S+\s*)?-\s*(.+?)\s*-\s*([A-Z]{2})\s*$/
  );
  if (!end && !bai) return null;
  const complemento = end?.[3]?.trim();
  return {
    logradouro: end?.[1]?.trim() || null,
    numero: end?.[2]?.trim() || null,
    complemento: complemento && complemento.toLowerCase() !== "nao informado" ? complemento : null,
    bairro: bai?.[1]?.trim() || null,
    municipio: bai?.[2]?.trim() || null,
    uf: bai?.[3]?.trim() || null,
  };
}

function parseSatText(text: string): ParsedNota {
  const headerMatch = text.match(/Cupom Fiscal Eletrônico SAT\s*\n\s*(.+)/);
  const emitente = headerMatch?.[1]?.trim() || "Emitente desconhecido";

  const cnpjMatch = text.match(/CNPJ:\s*([\d./-]+)/);
  const cnpj = cnpjMatch?.[1] ?? null;

  const enderecoLine = text.match(/Endereço:.+$/m)?.[0] ?? "";
  const bairroLine = text.match(/Bairro:.+$/m)?.[0] ?? "";
  const endereco = enderecoLine || bairroLine ? parseSatEndereco(enderecoLine, bairroLine) : null;

  const chaveAcesso = findChaveAcesso(text);
  const extratoMatch = text.match(/Extrato\s*Nº:\s*(\d+)/i);
  if (!extratoMatch) {
    throw new NotaParseError("Não foi possível identificar 'Extrato Nº' no cupom SAT.", {
      chave_acesso: chaveAcesso,
    });
  }
  const numero = extratoMatch[1];

  const dataMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*\d{2}:\d{2}:\d{2}/);
  if (!dataMatch) {
    throw new NotaParseError("Não foi possível identificar a data de emissão do cupom SAT.", {
      numero,
      chave_acesso: chaveAcesso,
    });
  }
  const dataEmissao = dataMatch[1];

  const itens: ParsedNota["itens"] = [];
  const matches = [...text.matchAll(SAT_ITEM_RE)];
  for (const m of matches) {
    const [full, , codigo, descRaw, qtRaw, un, , vuRaw, vtRaw] = m;
    const produto = descRaw.replace(/\s+/g, " ").trim();
    if (!produto) continue;
    let vt = toNum(vtRaw);
    const after = text.slice((m.index ?? 0) + full.length);
    const descontoMatch = after.match(/^[\s\S]{0,80}?Desconto:\s*-?\s*([\d.,]+)/);
    if (descontoMatch) {
      const nextItem = after.search(/\n\s*\d{1,3}\s+[A-Z][A-Z0-9]+\s+/);
      const descontoPos = after.indexOf(descontoMatch[0]);
      if (nextItem === -1 || descontoPos < nextItem) {
        vt = Math.round((vt - toNum(descontoMatch[1])) * 100) / 100;
      }
    }
    itens.push({
      produto,
      codigo: codigo || null,
      qt: toNum(qtRaw),
      un: un || null,
      vu: toNum(vuRaw),
      vt,
    });
  }

  if (itens.length === 0) {
    throw new NotaParseError("Nenhum item identificado no cupom SAT.", {
      numero,
      chave_acesso: chaveAcesso,
    });
  }

  const valorTotal = Math.round(itens.reduce((s, i) => s + i.vt, 0) * 100) / 100;

  return {
    numero,
    serie: null,
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
