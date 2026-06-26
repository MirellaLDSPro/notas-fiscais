import { NotaParseError } from "./parseNfce";
import type { ParsedNota } from "./db";

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeXml(m[1].trim()) : null;
}

export function looksLikeNfeXml(s: string): boolean {
  return /<nfeProc[\s>]|<NFe[\s>]|<infNFe[\s>]/i.test(s);
}

export function parseNfceXml(xml: string): ParsedNota {
  const chave = xml.match(/<infNFe[^>]*\bId="NFe(\d{44})"/i)?.[1] ?? null;

  const ide = xml.match(/<ide>([\s\S]*?)<\/ide>/i)?.[1] ?? "";
  const numero = tag(ide, "nNF");
  const serie = tag(ide, "serie");
  const dhEmi = tag(ide, "dhEmi"); // 2020-09-08T18:27:12-03:00
  const dm = dhEmi?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dataEmissao = dm ? `${dm[3]}/${dm[2]}/${dm[1]}` : null;
  if (!numero || !dataEmissao) {
    throw new NotaParseError("XML da NFe sem nNF/dhEmi.", { numero, chave_acesso: chave });
  }

  const emit = xml.match(/<emit>([\s\S]*?)<\/emit>/i)?.[1] ?? "";
  const emitente = tag(emit, "xNome") ?? "Emitente desconhecido";
  const cnpj = tag(emit, "CNPJ");
  const ender = emit.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i)?.[1] ?? "";
  const endereco = ender
    ? {
        logradouro: tag(ender, "xLgr"),
        numero: tag(ender, "nro"),
        complemento: tag(ender, "xCpl"),
        bairro: tag(ender, "xBairro"),
        municipio: tag(ender, "xMun"),
        uf: tag(ender, "UF"),
      }
    : null;

  const itens: ParsedNota["itens"] = [];
  for (const det of xml.match(/<det\b[\s\S]*?<\/det>/gi) ?? []) {
    const prod = det.match(/<prod>([\s\S]*?)<\/prod>/i)?.[1];
    if (!prod) continue;
    const produto = tag(prod, "xProd");
    const vProd = tag(prod, "vProd");
    if (!produto || !vProd) continue;
    itens.push({
      produto,
      codigo: tag(prod, "cProd"),
      qt: Number(tag(prod, "qCom") ?? "0"),
      un: tag(prod, "uCom"),
      vu: Number(tag(prod, "vUnCom") ?? "0"),
      vt: Number(vProd),
    });
  }
  if (itens.length === 0) {
    throw new NotaParseError("XML da NFe sem itens.", { numero, chave_acesso: chave });
  }

  const icmsTot = xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i)?.[1] ?? "";
  const vNF = tag(icmsTot, "vNF");
  const valorTotal = vNF
    ? Number(vNF)
    : Math.round(itens.reduce((s, i) => s + i.vt, 0) * 100) / 100;

  return {
    numero,
    serie,
    data_emissao: dataEmissao,
    emitente,
    cnpj,
    chave_acesso: chave,
    valor_total: valorTotal,
    fonte: "PDF", // o route sobrescreve para "BUSCA"
    itens,
    endereco,
  };
}
