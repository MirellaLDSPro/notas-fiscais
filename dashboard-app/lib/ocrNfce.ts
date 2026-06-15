import Anthropic from "@anthropic-ai/sdk";
import type { ParsedNota } from "./db";

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    produto: { type: "string", description: "Descrição do produto" },
    codigo: { type: ["string", "null"], description: "Código do produto, se visível" },
    qt: { type: "number", description: "Quantidade comprada" },
    un: { type: ["string", "null"], description: "Unidade (UN, KG, L, etc.)" },
    vu: { type: "number", description: "Valor unitário em reais" },
    vt: { type: "number", description: "Valor total do item em reais" },
  },
  required: ["produto", "codigo", "qt", "un", "vu", "vt"],
  additionalProperties: false,
} as const;

const SCHEMA = {
  type: "object",
  properties: {
    numero: { type: ["string", "null"], description: "Número da nota ou 'Extrato Nº'" },
    serie: { type: ["string", "null"] },
    data_emissao: {
      type: ["string", "null"],
      description: "Data no formato DD/MM/AAAA",
    },
    emitente: { type: ["string", "null"], description: "Razão social do emitente" },
    cnpj: {
      type: ["string", "null"],
      description: "CNPJ formato XX.XXX.XXX/XXXX-XX ou só dígitos",
    },
    chave_acesso: {
      type: ["string", "null"],
      description: "Chave de acesso de 44 dígitos, sem espaços",
    },
    valor_total: { type: ["number", "null"], description: "Total da nota em reais" },
    itens: { type: "array", items: ITEM_SCHEMA },
  },
  required: [
    "numero",
    "serie",
    "data_emissao",
    "emitente",
    "cnpj",
    "chave_acesso",
    "valor_total",
    "itens",
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `Você lê cupons fiscais brasileiros (NFC-e e SAT) a partir de PDFs — incluindo PDFs que são apenas fotos do papel. Sua tarefa: extrair todos os campos da nota com fidelidade.

Regras:
- Use null em qualquer campo que não consiga ler com confiança. Não invente dígitos, valores ou nomes.
- Data sempre no formato DD/MM/AAAA.
- CNPJ pode vir formatado (XX.XXX.XXX/XXXX-XX) ou só dígitos — copie como aparece.
- Chave de acesso tem 44 dígitos. Devolva sem espaços ou null se ilegível.
- Para cada item: produto, quantidade, unidade, valor unitário e valor total. Se faltar valor unitário mas tiver total + qt, calcule vu = vt / qt.
- Se o documento não for um cupom fiscal, retorne todos os campos como null e itens como array vazio.`;

export type PartialNotaData = {
  numero: string | null;
  chave_acesso: string | null;
  emitente: string | null;
  cnpj: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  itens_count: number;
};

export type ClaudeParseResult =
  | { ok: true; nota: ParsedNota }
  | { ok: false; partial: PartialNotaData };

const EMPTY_PARTIAL: PartialNotaData = {
  numero: null,
  chave_acesso: null,
  emitente: null,
  cnpj: null,
  data_emissao: null,
  valor_total: null,
  itens_count: 0,
};

type ClaudeOutput = {
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  emitente: string | null;
  cnpj: string | null;
  chave_acesso: string | null;
  valor_total: number | null;
  itens: Array<{
    produto: string;
    codigo: string | null;
    qt: number;
    un: string | null;
    vu: number;
    vt: number;
  }>;
};

function normalizeChave(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 44 ? digits : null;
}

function toPartial(out: ClaudeOutput | null): PartialNotaData {
  if (!out) return EMPTY_PARTIAL;
  return {
    numero: out.numero,
    chave_acesso: normalizeChave(out.chave_acesso),
    emitente: out.emitente,
    cnpj: out.cnpj,
    data_emissao: out.data_emissao,
    valor_total: out.valor_total,
    itens_count: out.itens?.length ?? 0,
  };
}

export async function parseNfceViaClaude(buf: Buffer, mediaType = "application/pdf"): Promise<ClaudeParseResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, partial: EMPTY_PARTIAL };

  let parsed: ClaudeOutput | null = null;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mediaType as any,
                data: buf.toString("base64"),
              },

            },
            {
              type: "text",
              text: "Extraia todos os campos deste cupom fiscal brasileiro.",
            },
          ],
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
    });
    parsed = response.parsed_output as ClaudeOutput | null;
  } catch (err) {
    console.error("[parseNfceViaClaude] falha na chamada Claude:", err);
    return { ok: false, partial: EMPTY_PARTIAL };
  }

  const partial = toPartial(parsed);

  if (
    !parsed ||
    !parsed.numero ||
    !parsed.emitente ||
    !parsed.data_emissao ||
    typeof parsed.valor_total !== "number" ||
    parsed.valor_total <= 0 ||
    !parsed.itens ||
    parsed.itens.length === 0
  ) {
    return { ok: false, partial };
  }

  const itens = parsed.itens
    .filter((i) => i.produto && i.produto.trim())
    .map((i) => ({
      produto: i.produto.trim(),
      codigo: i.codigo || null,
      qt: Number(i.qt) || 0,
      un: i.un || null,
      vu: Number(i.vu) || 0,
      vt: Number(i.vt) || 0,
    }));

  if (itens.length === 0) return { ok: false, partial };

  const nota: ParsedNota = {
    numero: parsed.numero,
    serie: parsed.serie,
    data_emissao: parsed.data_emissao,
    emitente: parsed.emitente,
    cnpj: parsed.cnpj,
    chave_acesso: normalizeChave(parsed.chave_acesso),
    valor_total: parsed.valor_total,
    fonte: "CLAUDE",
    itens,
    endereco: null,
  };

  return { ok: true, nota };
}
