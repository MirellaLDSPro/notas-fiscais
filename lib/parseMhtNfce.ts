import { NotaParseError, parseEnderecoPdf, type EnderecoPdf } from "./parseNfce";
import type { ParsedNota } from "./db";

function findChaveAcessoHtml(html: string): string | null {
  const block = html.match(/Chave de acesso:[\s\S]{0,400}?(\d[\d\s]+)/i);
  if (block) {
    const digits = block[1].replace(/\D+/g, "");
    if (digits.length === 44) return digits;
  }
  const flat = html.replace(/\s+/g, "").match(/(?<!\d)(\d{44})(?!\d)/);
  return flat ? flat[1] : null;
}

const toNum = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

function decodeQuotedPrintable(s: string): Buffer {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x3d /* = */) {
      const next = s.slice(i + 1, i + 3);
      if (next === "\r\n" || next === "\n\r") {
        i += 2;
        continue;
      }
      if (next[0] === "\n") {
        i += 1;
        continue;
      }
      const hex = parseInt(next, 16);
      if (!Number.isNaN(hex)) {
        out.push(hex);
        i += 2;
        continue;
      }
      out.push(c);
    } else {
      out.push(c);
    }
  }
  return Buffer.from(out);
}

export function extractHtmlPart(buffer: Buffer): string {
  const raw = buffer.toString("binary");
  const headerEnd = (() => {
    const a = raw.indexOf("\r\n\r\n");
    const b = raw.indexOf("\n\n");
    if (a < 0) return b;
    if (b < 0) return a;
    return Math.min(a, b);
  })();
  if (headerEnd < 0) throw new Error("MHT inválido: cabeçalhos não encontrados.");
  const header = raw.slice(0, headerEnd);
  const boundaryMatch = header.match(/boundary\s*=\s*"?([^";\r\n]+)"?/i);
  if (!boundaryMatch) throw new Error("MHT inválido: boundary não encontrado.");
  const boundary = boundaryMatch[1];
  const sections = raw.split(`--${boundary}`);

  for (const section of sections) {
    if (!/Content-Type:\s*text\/html/i.test(section)) continue;
    const sHeaderEnd = (() => {
      const a = section.indexOf("\r\n\r\n");
      const b = section.indexOf("\n\n");
      if (a < 0) return b;
      if (b < 0) return a;
      return Math.min(a, b);
    })();
    if (sHeaderEnd < 0) continue;
    const partHeader = section.slice(0, sHeaderEnd);
    const partBody = section.slice(sHeaderEnd).replace(/^(\r\n\r\n|\n\n)/, "");
    const enc = partHeader.match(/Content-Transfer-Encoding:\s*(\S+)/i)?.[1]?.toLowerCase() ?? "7bit";

    let bytes: Buffer;
    if (enc === "base64") {
      bytes = Buffer.from(partBody.replace(/\s+/g, ""), "base64");
    } else if (enc === "quoted-printable") {
      bytes = decodeQuotedPrintable(partBody);
    } else {
      bytes = Buffer.from(partBody, "binary");
    }
    return bytes.toString("utf8");
  }
  throw new Error("MHT inválido: parte text/html não encontrada.");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function clean(s: string): string {
  return decodeEntities(stripTags(s)).replace(/\s+/g, " ").trim();
}

const ITEM_ROW_RE = /<tr\b[\s\S]*?<\/tr>/gi;
const ITEM_FIELD_RE = {
  produto: /class\s*=\s*"[^"]*\btxtTit\b[^"]*"[^>]*>([^<]+)<\/span>/i,
  codigo: /\(C[óo]digo:\s*([^)<]+)\)/i,
  qtde: /Qtde\.:\s*<\/strong>\s*([\d.,]+)/i,
  un: /UN:\s*<\/strong>\s*([^<\s]+)/i,
  vu: /Vl\.\s*Unit\.:\s*<\/strong>\s*([\d.,]+)/i,
  vt: /class\s*=\s*"[^"]*\bvalor\b[^"]*"[^>]*>([\d.,]+)\s*<\/span>/i,
};

export function parseNfceHtml(html: string): ParsedNota {
  if (!/NOTA FISCAL DE CONSUMIDOR ELETR[ÔO]NICA|NFC-?e/i.test(html)) {
    throw new Error("Conteúdo não parece ser de uma NFC-e.");
  }

  const emitente = (() => {
    const m = html.match(/class\s*=\s*"[^"]*\btxtTopo\b[^"]*"[^>]*>([^<]+)</i);
    return m ? clean(m[1]) : "Emitente desconhecido";
  })();

  const cnpj = html.match(/CNPJ:\s*<\/div>?\s*([\d./-]+)/i)?.[1].trim()
    ?? html.match(/CNPJ:[^\d]*([\d./-]+)/i)?.[1].trim()
    ?? null;

  const endereco: EnderecoPdf | null = (() => {
    const blocks = [...html.matchAll(/<div\s+class\s*=\s*"text"[^>]*>([\s\S]*?)<\/div>/gi)].map((m) =>
      clean(m[1])
    );
    const enderecoLine = blocks.find((b) => /,.*,/.test(b) && !/CNPJ/i.test(b));
    return enderecoLine ? parseEnderecoPdf(enderecoLine) : null;
  })();

  const chave = findChaveAcessoHtml(html);

  const headerText = clean(
    html.match(/EMISSÃO NORMAL[\s\S]*?Vers[ãa]o XSLT/i)?.[0] ?? ""
  );
  // Aceita tanto "Data de Emissão" quanto apenas "Emissão" para maior robustez
  const headerMatch = headerText.match(
    /N[úu]mero:\s*(\d+)\s+S[ée]rie:\s*(\d+)\s+(?:Data\s+de\s+Emiss(?:ã|a)o|Emiss(?:ã|a)o):\s*(\d{2}\/\d{2}\/\d{4})/i
  );
  if (!headerMatch) {
    const numeroFallback = headerText.match(/N[úu]mero:\s*(\d+)/i)?.[1] ?? null;
    throw new NotaParseError(
      "Não foi possível identificar Número/Série/Data de Emissão na NFC-e (MHT).",
      { numero: numeroFallback, chave_acesso: chave }
    );
  }
  const [, numero, serie, dataEmissao] = headerMatch;

  const totalText = html.match(
    /Valor a pagar R\$:[\s\S]*?class\s*=\s*"[^"]*\btotalNumb\b[^"]*"[^>]*>([\d.,]+)/i
  )?.[1];

  const itens: ParsedNota["itens"] = [];
  for (const row of html.match(ITEM_ROW_RE) ?? []) {
    const produto = row.match(ITEM_FIELD_RE.produto)?.[1];
    const vt = row.match(ITEM_FIELD_RE.vt)?.[1];
    if (!produto || !vt) continue;
    const codigo = row.match(ITEM_FIELD_RE.codigo)?.[1]?.trim() || null;
    const qt = row.match(ITEM_FIELD_RE.qtde)?.[1];
    const un = row.match(ITEM_FIELD_RE.un)?.[1] || null;
    const vu = row.match(ITEM_FIELD_RE.vu)?.[1];
    if (!qt || !vu) continue;
    itens.push({
      produto: decodeEntities(produto).trim(),
      codigo,
      qt: toNum(qt),
      un,
      vu: toNum(vu),
      vt: toNum(vt),
    });
  }

  if (itens.length === 0) {
    throw new NotaParseError("Nenhum item identificado no MHT da NFC-e.", {
      numero,
      chave_acesso: chave,
    });
  }

  const valorTotal = totalText
    ? toNum(totalText)
    : Math.round(itens.reduce((s, i) => s + i.vt, 0) * 100) / 100;

  return {
    numero,
    serie,
    data_emissao: dataEmissao,
    emitente,
    cnpj,
    chave_acesso: chave,
    valor_total: valorTotal,
    fonte: "PDF",
    itens,
    endereco,
  };
}

export function parseMhtNfceBuffer(buffer: Buffer): ParsedNota {
  return parseNfceHtml(extractHtmlPart(buffer));
}
