import type { ParsedNota } from "./db";

const toNum = (s: string): number => {
  const cleaned = s.replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const decodeNfpCsv = (buf: Buffer): string => {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return buf.swap16().subarray(2).toString("utf16le");
  }
  return buf.toString("utf8").replace(/^﻿/, "");
};

const splitTsv = (line: string): string[] =>
  line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));

export function parseNfpCsvBuffer(buf: Buffer): ParsedNota[] {
  const text = decodeNfpCsv(buf);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV NFP vazio.");

  const header = splitTsv(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) =>
    header.findIndex((h) => h.includes(name.toLowerCase()));
  const iCnpj = idx("cnpj");
  const iEmit = idx("emitente");
  const iNum = idx("no.");
  const iData = idx("data emiss");
  const iValor = idx("valor nf");
  const iCred = idx("crédit");
  const iSit = idx("situa");

  if (iCnpj < 0 || iNum < 0 || iValor < 0) {
    throw new Error("Cabeçalho NFP não reconhecido.");
  }

  const result: ParsedNota[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitTsv(lines[li]);
    const numero = cols[iNum]?.trim();
    const cnpj = cols[iCnpj]?.trim() || null;
    const data = cols[iData]?.trim();
    if (!numero || !data) continue;
    result.push({
      numero,
      serie: null,
      data_emissao: data,
      emitente: cols[iEmit]?.trim() || "Emitente desconhecido",
      cnpj,
      chave_acesso: null,
      valor_total: toNum(cols[iValor] ?? "0"),
      creditos: iCred >= 0 ? toNum(cols[iCred] ?? "0") : 0,
      situacao_credito: iSit >= 0 ? cols[iSit]?.trim() || null : null,
      fonte: "NFP",
      itens: [],
    });
  }

  if (result.length === 0) throw new Error("Nenhuma linha de nota encontrada no CSV.");
  return result;
}
