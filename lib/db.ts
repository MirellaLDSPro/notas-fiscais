import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

declare global {
  // eslint-disable-next-line no-var
  var __nfce_sql: NeonQueryFunction<false, false> | undefined;
  // eslint-disable-next-line no-var
  var __nfce_schema_ready: Promise<void> | undefined;
}

function sql(): NeonQueryFunction<false, false> {
  if (!globalThis.__nfce_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL não definida. Configure no .env.local (dev) ou nas env vars do Vercel."
      );
    }
    globalThis.__nfce_sql = neon(url);
  }
  return globalThis.__nfce_sql;
}

async function initSchema(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS notas (
      id BIGSERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      serie TEXT,
      data_emissao TEXT NOT NULL,
      emitente TEXT NOT NULL,
      cnpj TEXT,
      valor_total DOUBLE PRECISION NOT NULL,
      chave_acesso TEXT UNIQUE,
      creditos DOUBLE PRECISION NOT NULL DEFAULT 0,
      situacao_credito TEXT,
      fonte TEXT NOT NULL DEFAULT 'PDF',
      created_at TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS'),
      UNIQUE (cnpj, numero)
    )
  `;
  await sql()`
    CREATE TABLE IF NOT EXISTS itens (
      id BIGSERIAL PRIMARY KEY,
      nota_id BIGINT NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
      produto TEXT NOT NULL,
      codigo TEXT,
      qt DOUBLE PRECISION NOT NULL,
      un TEXT,
      vu DOUBLE PRECISION NOT NULL,
      vt DOUBLE PRECISION NOT NULL
    )
  `;
  await sql()`CREATE INDEX IF NOT EXISTS idx_itens_nota ON itens(nota_id)`;
  await sql()`CREATE INDEX IF NOT EXISTS idx_notas_data ON notas(data_emissao)`;
  await sql()`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      cnpj TEXT PRIMARY KEY,
      razao_social TEXT,
      nome_fantasia TEXT,
      logradouro TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      municipio TEXT,
      uf TEXT,
      cep TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      fonte TEXT,
      updated_at TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
    )
  `;
}

async function ready(): Promise<void> {
  if (!globalThis.__nfce_schema_ready) {
    globalThis.__nfce_schema_ready = initSchema();
  }
  return globalThis.__nfce_schema_ready;
}

export const cnpjDigits = (s: string | null | undefined): string =>
  s ? s.replace(/\D/g, "") : "";

export type EstabelecimentoRow = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  fonte: string | null;
  updated_at: string;
};

export type EstabelecimentoInput = {
  cnpj: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  fonte: "PDF" | "BRASIL_API";
};

export async function upsertEstabelecimento(
  input: EstabelecimentoInput
): Promise<"inserted" | "updated" | "skipped"> {
  await ready();
  const cnpj = cnpjDigits(input.cnpj);
  if (cnpj.length < 8) return "skipped";

  const existingRows = (await sql()`
    SELECT fonte, logradouro FROM estabelecimentos WHERE cnpj = ${cnpj}
  `) as Array<{ fonte: string | null; logradouro: string | null }>;
  const existing = existingRows[0];

  if (existing) {
    if (existing.fonte === "BRASIL_API" && input.fonte === "PDF") return "skipped";
    if (existing.logradouro && input.fonte === "PDF" && !input.logradouro) return "skipped";
    await sql()`
      UPDATE estabelecimentos SET
        razao_social  = COALESCE(${input.razao_social ?? null}, razao_social),
        nome_fantasia = COALESCE(${input.nome_fantasia ?? null}, nome_fantasia),
        logradouro    = COALESCE(${input.logradouro ?? null}, logradouro),
        numero        = COALESCE(${input.numero ?? null}, numero),
        complemento   = COALESCE(${input.complemento ?? null}, complemento),
        bairro        = COALESCE(${input.bairro ?? null}, bairro),
        municipio     = COALESCE(${input.municipio ?? null}, municipio),
        uf            = COALESCE(${input.uf ?? null}, uf),
        cep           = COALESCE(${input.cep ?? null}, cep),
        latitude      = COALESCE(${input.latitude ?? null}, latitude),
        longitude     = COALESCE(${input.longitude ?? null}, longitude),
        fonte         = ${input.fonte},
        updated_at    = to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
      WHERE cnpj = ${cnpj}
    `;
    return "updated";
  }

  await sql()`
    INSERT INTO estabelecimentos
      (cnpj, razao_social, nome_fantasia, logradouro, numero, complemento,
       bairro, municipio, uf, cep, latitude, longitude, fonte)
    VALUES
      (${cnpj}, ${input.razao_social ?? null}, ${input.nome_fantasia ?? null},
       ${input.logradouro ?? null}, ${input.numero ?? null}, ${input.complemento ?? null},
       ${input.bairro ?? null}, ${input.municipio ?? null}, ${input.uf ?? null},
       ${input.cep ?? null}, ${input.latitude ?? null}, ${input.longitude ?? null},
       ${input.fonte})
  `;
  return "inserted";
}

export async function listCnpjsWithoutEstabelecimento(): Promise<string[]> {
  await ready();
  const rows = (await sql()`
    SELECT DISTINCT n.cnpj
      FROM notas n
      WHERE n.cnpj IS NOT NULL AND n.cnpj <> ''
        AND NOT EXISTS (
          SELECT 1 FROM estabelecimentos e
          WHERE e.cnpj = REPLACE(REPLACE(REPLACE(n.cnpj, '.', ''), '/', ''), '-', '')
            AND e.logradouro IS NOT NULL
        )
  `) as Array<{ cnpj: string }>;
  return rows.map((r) => r.cnpj).filter(Boolean);
}

export type Fonte = "PDF" | "XLSX" | "NFP";

export type NotaRow = {
  id: number;
  numero: string;
  serie: string | null;
  data_emissao: string;
  emitente: string;
  cnpj: string | null;
  valor_total: number;
  chave_acesso: string | null;
  creditos: number;
  situacao_credito: string | null;
  fonte: string;
  created_at: string;
};

export type ItemRow = {
  id: number;
  nota_id: number;
  produto: string;
  codigo: string | null;
  qt: number;
  un: string | null;
  vu: number;
  vt: number;
};

export type ParsedItem = {
  produto: string;
  codigo: string | null;
  qt: number;
  un: string | null;
  vu: number;
  vt: number;
};

export type ParsedEndereco = {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
};

export type ParsedNota = {
  numero: string;
  serie: string | null;
  data_emissao: string;
  emitente: string;
  cnpj: string | null;
  chave_acesso: string | null;
  valor_total: number;
  creditos?: number;
  situacao_credito?: string | null;
  fonte: Fonte;
  itens: ParsedItem[];
  endereco?: ParsedEndereco | null;
};

export type UpsertResult = {
  id: number;
  action: "inserted" | "merged" | "skipped";
};

export async function upsertNota(parsed: ParsedNota): Promise<UpsertResult> {
  await ready();
  const existingRows = (await sql()`
    SELECT id FROM notas
     WHERE (${parsed.chave_acesso}::text IS NOT NULL AND chave_acesso = ${parsed.chave_acesso})
        OR (${parsed.cnpj}::text IS NOT NULL AND cnpj = ${parsed.cnpj} AND numero = ${parsed.numero})
     LIMIT 1
  `) as Array<{ id: number }>;
  if (existingRows[0]) {
    return { id: Number(existingRows[0].id), action: "skipped" };
  }

  const produtos = parsed.itens.map((i) => i.produto);
  const codigos = parsed.itens.map((i) => i.codigo);
  const qts = parsed.itens.map((i) => i.qt);
  const uns = parsed.itens.map((i) => i.un);
  const vus = parsed.itens.map((i) => i.vu);
  const vts = parsed.itens.map((i) => i.vt);

  const result = (await sql()`
    WITH new_nota AS (
      INSERT INTO notas
        (numero, serie, data_emissao, emitente, cnpj, valor_total,
         chave_acesso, creditos, situacao_credito, fonte)
      VALUES
        (${parsed.numero}, ${parsed.serie}, ${parsed.data_emissao}, ${parsed.emitente},
         ${parsed.cnpj}, ${parsed.valor_total}, ${parsed.chave_acesso},
         ${parsed.creditos ?? 0}, ${parsed.situacao_credito ?? null}, ${parsed.fonte})
      RETURNING id
    ),
    new_itens AS (
      INSERT INTO itens (nota_id, produto, codigo, qt, un, vu, vt)
      SELECT (SELECT id FROM new_nota), produto, codigo, qt, un, vu, vt
        FROM unnest(
          ${produtos}::text[],
          ${codigos}::text[],
          ${qts}::double precision[],
          ${uns}::text[],
          ${vus}::double precision[],
          ${vts}::double precision[]
        ) AS u(produto, codigo, qt, un, vu, vt)
      RETURNING 1
    )
    SELECT id FROM new_nota
  `) as Array<{ id: number }>;

  return { id: Number(result[0].id), action: "inserted" };
}

export type NotaWithItens = NotaRow & { itens: ItemRow[] };

export async function listNotas(): Promise<NotaWithItens[]> {
  await ready();
  const notas = (await sql()`
    SELECT * FROM notas ORDER BY data_emissao DESC, id DESC
  `) as NotaRow[];
  const itens = (await sql()`SELECT * FROM itens`) as ItemRow[];
  const byNota = new Map<number, ItemRow[]>();
  for (const it of itens) {
    const nid = Number(it.nota_id);
    const list = byNota.get(nid) ?? [];
    list.push({ ...it, id: Number(it.id), nota_id: nid });
    byNota.set(nid, list);
  }
  return notas.map((n) => ({
    ...n,
    id: Number(n.id),
    itens: byNota.get(Number(n.id)) ?? [],
  }));
}

export async function pickLastThreeNotasWithItems(): Promise<{
  notas: Array<{ numero: string; emitente: string; data: string }>;
  produtos: string[];
}> {
  await ready();
  const notas = (await sql()`
    SELECT n.id, n.numero, n.emitente, n.data_emissao
      FROM notas n
      WHERE EXISTS (SELECT 1 FROM itens i WHERE i.nota_id = n.id)
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT 3
  `) as Array<{ id: number; numero: string; emitente: string; data_emissao: string }>;
  if (notas.length === 0) return { notas: [], produtos: [] };

  const ids = notas.map((n) => Number(n.id));
  const produtos = (await sql()`
    SELECT DISTINCT produto FROM itens
     WHERE nota_id = ANY(${ids}::bigint[])
     ORDER BY produto
  `) as Array<{ produto: string }>;
  return {
    notas: notas.map((n) => ({ numero: n.numero, emitente: n.emitente, data: n.data_emissao })),
    produtos: produtos.map((p) => p.produto),
  };
}

export type ListaCompraItem = {
  produto: string;
  vezes: number;
  ultima_compra: string;
  total_qt: number;
  preco_medio: number;
  un: string | null;
};

export async function getListaCompras(): Promise<ListaCompraItem[]> {
  await ready();
  const rows = (await sql()`
    WITH base AS (
      SELECT
        UPPER(TRIM(i.produto)) AS produto,
        i.nota_id,
        i.qt,
        i.vu,
        i.un,
        n.data_emissao
      FROM itens i
      JOIN notas n ON n.id = i.nota_id
      WHERE TRIM(i.produto) <> ''
    )
    SELECT
      produto,
      COUNT(DISTINCT nota_id)::int AS vezes,
      MAX(data_emissao) AS ultima_compra,
      SUM(qt)::float AS total_qt,
      AVG(vu)::float AS preco_medio,
      (
        SELECT un FROM base b2
         WHERE b2.produto = base.produto AND un IS NOT NULL
         GROUP BY un ORDER BY COUNT(*) DESC, un LIMIT 1
      ) AS un
    FROM base
    GROUP BY produto
    HAVING COUNT(DISTINCT nota_id) >= 3
    ORDER BY vezes DESC, ultima_compra DESC, produto ASC
  `) as Array<{
    produto: string;
    vezes: number;
    ultima_compra: string;
    total_qt: number;
    preco_medio: number;
    un: string | null;
  }>;
  return rows.map((r) => ({
    produto: r.produto,
    vezes: Number(r.vezes),
    ultima_compra: r.ultima_compra,
    total_qt: Number(r.total_qt),
    preco_medio: Number(r.preco_medio),
    un: r.un,
  }));
}
