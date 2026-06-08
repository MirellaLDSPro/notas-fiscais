import Anthropic from "@anthropic-ai/sdk";

const RULES: Array<{ pattern: RegExp; categoria: string }> = [
  { pattern: /^L\.?\s*COND/, categoria: "LEITE CONDENSADO" },
  { pattern: /^LEITE\s+PO\b|^LEITE\s+EM\s+PO/, categoria: "LEITE EM PÓ" },
  { pattern: /^LEITE\s+FERM|^RF\.?\s*LEITE\s+FERM|FERM\.?\s*CORPUS|CHAMYT/, categoria: "LEITE FERMENTADO" },
  { pattern: /^LEITE|^LTE/, categoria: "LEITE" },
  { pattern: /^MUSS/, categoria: "MUSSARELA" },
  { pattern: /^Q(JO|J\b|UEIJ)/, categoria: "QUEIJO" },
  { pattern: /^MANT|^MARGARINA/, categoria: "MANTEIGA" },
  { pattern: /^IOG/, categoria: "IOGURTE" },
  { pattern: /^OVO/, categoria: "OVO" },
  { pattern: /^MAC\.|^MACARRAO|^MACARRÃO/, categoria: "MACARRÃO" },
  { pattern: /^ARROZ|^ARRZ/, categoria: "ARROZ" },
  { pattern: /^FEIJ/, categoria: "FEIJÃO" },
  { pattern: /^FAR(\.|INHA)/, categoria: "FARINHA" },
  { pattern: /^FLOC/, categoria: "FLOCÃO" },
  { pattern: /^PAO|^PÃO|^PULLMAN|^TAPIOCA|PAO\s+FORMA|PAO\s+CREQU/, categoria: "PÃO" },
  { pattern: /^BISC/, categoria: "BISCOITO" },
  { pattern: /^MIST.*BOLO|^MIST.*BOLO/, categoria: "MISTURA DE BOLO" },
  { pattern: /^GELATINA/, categoria: "GELATINA" },
  { pattern: /^PUDIM/, categoria: "PUDIM" },
  { pattern: /^POLPA/, categoria: "POLPA DE FRUTA" },
  { pattern: /^SUCO/, categoria: "SUCO" },
  { pattern: /^REFR/, categoria: "REFRIGERANTE" },
  { pattern: /^AGUA|^ÁGUA/, categoria: "ÁGUA" },
  { pattern: /^VINHO|^VH\s/, categoria: "VINHO" },
  { pattern: /^CERV/, categoria: "CERVEJA" },
  { pattern: /^MOLHO|^PASSATA/, categoria: "MOLHO" },
  { pattern: /^MAION/, categoria: "MAIONESE" },
  { pattern: /^AZEITE/, categoria: "AZEITE" },
  { pattern: /^OLEO|^ÓLEO/, categoria: "ÓLEO" },
  { pattern: /^SAL\b/, categoria: "SAL" },
  { pattern: /^ACU|^AÇU/, categoria: "AÇÚCAR" },
  { pattern: /^CALDO|^SAZON|^TEMP/, categoria: "TEMPERO" },
  { pattern: /^CAFE|^CAFÉ/, categoria: "CAFÉ" },
  { pattern: /^CHOC/, categoria: "CHOCOLATE" },
  { pattern: /^SORB|^SORVETE/, categoria: "SORVETE" },
  { pattern: /^PACOCA|^PAÇOCA/, categoria: "PAÇOCA" },
  { pattern: /^BANANA/, categoria: "BANANA" },
  { pattern: /^MA(CA|ÇA|ÇÃ)/, categoria: "MAÇÃ" },
  { pattern: /^UVA|^HF\.UVA/, categoria: "UVA" },
  { pattern: /^KIWI/, categoria: "KIWI" },
  { pattern: /^LIMAO|^LIMÃO/, categoria: "LIMÃO" },
  { pattern: /^MANGA/, categoria: "MANGA" },
  { pattern: /^TOMATE/, categoria: "TOMATE" },
  { pattern: /^CENOURA/, categoria: "CENOURA" },
  { pattern: /^BATATA/, categoria: "BATATA" },
  { pattern: /^MANDIO|GOMA\s+MANDIO/, categoria: "MANDIOCA / GOMA" },
  { pattern: /^ALHO/, categoria: "ALHO" },
  { pattern: /^CEBOLA/, categoria: "CEBOLA" },
  { pattern: /^PIMENT/, categoria: "PIMENTÃO" },
  { pattern: /^MILHO/, categoria: "MILHO" },
  { pattern: /^ERVILHA/, categoria: "ERVILHA" },
  { pattern: /^SELETA/, categoria: "SELETA DE LEGUMES" },
  { pattern: /^PALMITO/, categoria: "PALMITO" },
  { pattern: /^SARD/, categoria: "SARDINHA" },
  { pattern: /^ATUM|PATE\s+ATUM/, categoria: "ATUM" },
  { pattern: /^LING|CALABRESA/, categoria: "LINGUIÇA" },
  { pattern: /^PRESUNTO|^PTO|PEITO\s+PERU/, categoria: "FRIOS" },
  { pattern: /^MORT/, categoria: "MORTADELA" },
  { pattern: /^BOV|^ACEM|^FRANGO|^FGO|PEITO\s+FGO|^CARNE|^COXA|^FILE|^ALCAT|^BACALH/, categoria: "CARNE" },
  { pattern: /^DET\.?\s*LIQ|^DETERG/, categoria: "DETERGENTE" },
  { pattern: /^SAB(\.|ONETE|AO|ÃO)/, categoria: "SABONETE / SABÃO" },
  { pattern: /^SHAMP/, categoria: "SHAMPOO" },
  { pattern: /^LIMP|^LAVA/, categoria: "LIMPEZA" },
  { pattern: /^PAPEL\s+HIG|^PH\s/, categoria: "PAPEL HIGIÊNICO" },
  { pattern: /^TOALHA\s+PAP|^PAPEL\s+TOALHA/, categoria: "PAPEL TOALHA" },
  { pattern: /^TOALHA\s+UMED|^LENC/, categoria: "LENÇO UMEDECIDO" },
  { pattern: /^SACO\s+LIXO|^SACOLA/, categoria: "SACOS / SACOLAS" },
  { pattern: /^PANO/, categoria: "PANO DE LIMPEZA" },
  { pattern: /^LUVA/, categoria: "LUVAS" },
  { pattern: /^DIFUSOR|^AROMA/, categoria: "AROMATIZADOR" },
  { pattern: /^RACAO|^RAÇÃO|WHISKAS/, categoria: "RAÇÃO" },
  { pattern: /^PROTEINA|^PROTEÍNA|^SORA/, categoria: "PROTEÍNA" },
  { pattern: /^FLEISC|FERMENTO/, categoria: "FERMENTO" },
];

export function categorizarPorDicionario(produto: string): string | null {
  const upper = produto.toUpperCase().trim();
  for (const r of RULES) if (r.pattern.test(upper)) return r.categoria;
  return null;
}

function fallbackFirstWord(produto: string): string {
  const tokens = produto
    .toUpperCase()
    .split(/[\s.,\-/]+/)
    .filter((w) => w.length >= 3 && !/^\d/.test(w));
  return tokens[0] ?? produto.toUpperCase().trim();
}

const AI_SYSTEM = `Você categoriza produtos de supermercado brasileiros a partir de strings abreviadas extraídas de NFC-e.
Para cada produto, retorne uma CATEGORIA canônica curta em PT-BR (maiúsculas, sem marca, sem tamanho).
Exemplos:
"LEITE PIRACANJUBA INT" → "LEITE"
"MAC.D.BENTA OVO" → "MACARRÃO"
"QJO.PRATO AURORA FAT" → "QUEIJO"
"TIRA WHIT SCH 240G" → "TIRA DE LEITE"
"VH FN BRNC D S 750ML" → "VINHO"

Use uma única categoria por produto. Para produtos genuinamente diferentes, use categorias diferentes (LEITE vs LEITE CONDENSADO vs LEITE EM PÓ).`;

export async function categorizarLote(produtos: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (produtos.length === 0) return result;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    for (const p of produtos) result.set(p, fallbackFirstWord(p));
    return result;
  }

  const client = new Anthropic({ apiKey });
  const userPrompt = `Categorize estes produtos. Responda APENAS um JSON no formato {"produto1":"CATEGORIA",...}.\n\n${produtos.map((p) => `- ${p}`).join("\n")}`;
  try {
    const response = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: [{ type: "text", text: AI_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          name: "categorias",
          schema: {
            type: "object",
            properties: {
              mapping: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    produto: { type: "string" },
                    categoria: { type: "string" },
                  },
                  required: ["produto", "categoria"],
                  additionalProperties: false,
                },
              },
            },
            required: ["mapping"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = response.parsed_output as { mapping?: Array<{ produto: string; categoria: string }> } | null;
    for (const m of parsed?.mapping ?? []) {
      result.set(m.produto, m.categoria.toUpperCase().trim());
    }
  } catch {
    // Fallback silencioso para o first-word se Claude falhar.
  }
  for (const p of produtos) if (!result.has(p)) result.set(p, fallbackFirstWord(p));
  return result;
}
