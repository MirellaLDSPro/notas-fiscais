import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import { pickLastThreeNotasWithItems } from "./db";

export type Receita = {
  nome: string;
  tempo_preparo_min: number;
  porcoes: number;
  ingredientes: Array<{
    item: string;
    quantidade: string;
    nas_notas: boolean;
  }>;
  modo_preparo: string[];
  dica?: string;
};

export type ReceitasPayload = {
  produtos_base: string[];
  notas_consideradas: Array<{ numero: string; emitente: string; data: string }>;
  receitas: Receita[];
  generated_at: string;
};

const SYSTEM_PROMPT = `Você é um cozinheiro brasileiro experiente. Recebe uma lista de produtos comprados em supermercado (com nomes muitas vezes abreviados, ex: "MAC.D.BENTA OVO" = macarrão Dona Benta com ovos, "FR.QJO.PRATO" = fração de queijo prato).

Gere de 3 a 5 receitas práticas para o dia a dia que usem o máximo de ingredientes disponíveis da lista. Para cada receita:
- Use apenas técnicas e ingredientes comuns no Brasil
- Indique tempo e porções realistas
- Para cada ingrediente, marque \`nas_notas: true\` se ele claramente aparece na lista do usuário (mesmo abreviado) ou \`false\` se é um complemento básico (sal, óleo, água, etc.) que ele provavelmente já tem
- Use linguagem direta no modo de preparo, uma instrução por item da lista
- Inclua uma "dica" curta quando fizer sentido

Não invente ingredientes exóticos. Priorize receitas que aproveitem as proteínas e perecíveis da lista.`;

const SCHEMA = {
  type: "object",
  properties: {
    receitas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          tempo_preparo_min: { type: "integer" },
          porcoes: { type: "integer" },
          ingredientes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                quantidade: { type: "string" },
                nas_notas: { type: "boolean" },
              },
              required: ["item", "quantidade", "nas_notas"],
              additionalProperties: false,
            },
          },
          modo_preparo: {
            type: "array",
            items: { type: "string" },
          },
          dica: { type: "string" },
        },
        required: ["nome", "tempo_preparo_min", "porcoes", "ingredientes", "modo_preparo"],
        additionalProperties: false,
      },
    },
  },
  required: ["receitas"],
  additionalProperties: false,
} as const;

declare global {
  // eslint-disable-next-line no-var
  var __recipesCache: Map<string, ReceitasPayload> | undefined;
  // eslint-disable-next-line no-var
  var __recipesRedisPromise: Promise<RedisClientType | null> | undefined;
}
const memCache = (globalThis.__recipesCache ??= new Map<string, ReceitasPayload>());

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

async function getRedis(): Promise<RedisClientType | null> {
  if (globalThis.__recipesRedisPromise) return globalThis.__recipesRedisPromise;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalThis.__recipesRedisPromise = Promise.resolve(null);
    return globalThis.__recipesRedisPromise;
  }
  globalThis.__recipesRedisPromise = (async () => {
    try {
      const client: RedisClientType = createClient({ url });
      client.on("error", (err) => console.error("[recipes] redis client error:", err));
      await client.connect();
      return client;
    } catch (err) {
      console.error("[recipes] redis connect falhou:", err);
      return null;
    }
  })();
  return globalThis.__recipesRedisPromise;
}

async function cacheGet(key: string): Promise<ReceitasPayload | null> {
  const r = await getRedis();
  if (r) {
    try {
      const raw = await r.get(`recipes:${key}`);
      if (raw) return JSON.parse(raw) as ReceitasPayload;
    } catch (err) {
      console.error("[recipes] redis get falhou, caindo no cache em memória:", err);
    }
  }
  return memCache.get(key) ?? null;
}

async function cacheSet(key: string, val: ReceitasPayload): Promise<void> {
  memCache.set(key, val);
  const r = await getRedis();
  if (r) {
    try {
      await r.set(`recipes:${key}`, JSON.stringify(val), { EX: CACHE_TTL_SECONDS });
    } catch (err) {
      console.error("[recipes] redis set falhou (cache em memória ainda gravado):", err);
    }
  }
}

export type RecipesError =
  | { kind: "no_key" }
  | { kind: "no_items"; notas_with_items: number }
  | { kind: "api_error"; message: string };

export type RecipesResult =
  | { ok: true; payload: ReceitasPayload; cached: boolean }
  | { ok: false; error: RecipesError };

export async function gerarReceitas(
  userId: number,
  opts: { force?: boolean } = {}
): Promise<RecipesResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: { kind: "no_key" } };

  const { notas, produtos } = await pickLastThreeNotasWithItems(userId);
  if (produtos.length === 0) {
    return { ok: false, error: { kind: "no_items", notas_with_items: notas.length } };
  }

  const key = createHash("sha256").update(`${userId}:${produtos.join("\n")}`).digest("hex");
  if (!opts.force) {
    const cached = await cacheGet(key);
    if (cached) return { ok: true, payload: cached, cached: true };
  }

  const client = new Anthropic({ apiKey });
  const userPrompt = `Produtos das minhas últimas ${notas.length} compras:\n\n${produtos.map((p) => `- ${p}`).join("\n")}\n\nGere as receitas em JSON conforme o schema.`;

  try {
    const response = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: SCHEMA,
        },
      },
    });

    const parsed = response.parsed_output as { receitas: Receita[] } | null;
    if (!parsed?.receitas?.length) {
      return {
        ok: false,
        error: { kind: "api_error", message: "Resposta sem receitas." },
      };
    }
    const payload: ReceitasPayload = {
      produtos_base: produtos,
      notas_consideradas: notas,
      receitas: parsed.receitas,
      generated_at: new Date().toISOString(),
    };
    await cacheSet(key, payload);
    return { ok: true, payload, cached: false };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: { kind: "no_key" } };
    }
    if (err instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: { kind: "api_error", message: `${err.status}: ${err.message}` },
      };
    }
    return {
      ok: false,
      error: {
        kind: "api_error",
        message: err instanceof Error ? err.message : "Erro desconhecido.",
      },
    };
  }
}
