import * as XLSX from "xlsx";
import type { ParsedNota } from "./db";

type XlsxRow = {
  Data?: string | number;
  Estabelecimento?: string;
  CNPJ?: string;
  Codigo?: string;
  Produto?: string;
  Qtde?: number | string;
  Unidade?: string;
  "Vl. Unit."?: number | string;
  "Vl. Total"?: number | string;
  "Nota (Numero)"?: number | string;
};

const toNum = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return 0;
};

// Excel serial date (days since 1900-01-00) → "DD/MM/YYYY"
const excelDateToBR = (n: number): string => {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const d = new Date(epoch.getTime() + n * 86400000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

const normalizeDate = (v: unknown): string => {
  if (typeof v === "number") return excelDateToBR(v);
  if (typeof v === "string") {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  return "";
};

export function parseXlsxBuffer(buf: Buffer): ParsedNota[] {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "dados") ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("Planilha vazia.");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<XlsxRow>(sheet, { defval: "" });
  if (rows.length === 0) throw new Error("Aba 'Dados' está vazia.");

  type Group = {
    numero: string;
    data_emissao: string;
    emitente: string;
    cnpj: string | null;
    itens: ParsedNota["itens"];
  };
  const groups = new Map<string, Group>();

  for (const r of rows) {
    const numero = String(r["Nota (Numero)"] ?? "").trim();
    const cnpj = String(r.CNPJ ?? "").trim() || null;
    if (!numero) continue;
    const key = `${cnpj ?? ""}|${numero}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        numero,
        data_emissao: normalizeDate(r.Data),
        emitente: String(r.Estabelecimento ?? "").trim() || "Emitente desconhecido",
        cnpj,
        itens: [],
      };
      groups.set(key, g);
    }
    const produto = String(r.Produto ?? "").trim();
    if (!produto) continue;
    g.itens.push({
      produto,
      codigo: String(r.Codigo ?? "").trim() || null,
      qt: toNum(r.Qtde),
      un: String(r.Unidade ?? "").trim() || null,
      vu: toNum(r["Vl. Unit."]),
      vt: toNum(r["Vl. Total"]),
    });
  }

  const result: ParsedNota[] = [];
  for (const g of groups.values()) {
    if (!g.data_emissao || g.itens.length === 0) continue;
    const valor = Math.round(g.itens.reduce((s, i) => s + i.vt, 0) * 100) / 100;
    result.push({
      numero: g.numero,
      serie: null,
      data_emissao: g.data_emissao,
      emitente: g.emitente,
      cnpj: g.cnpj,
      chave_acesso: null,
      valor_total: valor,
      fonte: "XLSX",
      itens: g.itens,
    });
  }

  if (result.length === 0) {
    throw new Error("Nenhuma nota válida encontrada na planilha.");
  }
  return result;
}
