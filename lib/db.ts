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

const LEGACY_OWNER_EMAIL = "mirella.lds@gmail.com";

async function initSchema(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
    )
  `;
  await sql()`
    CREATE TABLE IF NOT EXISTS notas (
      id BIGSERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      serie TEXT,
      data_emissao TEXT NOT NULL,
      emitente TEXT NOT NULL,
      cnpj TEXT,
      valor_total DOUBLE PRECISION NOT NULL,
      chave_acesso TEXT,
      creditos DOUBLE PRECISION NOT NULL DEFAULT 0,
      situacao_credito TEXT,
      fonte TEXT NOT NULL DEFAULT 'PDF',
      created_at TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
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
  await sql()`
    CREATE TABLE IF NOT EXISTS produto_categorias (
      produto TEXT PRIMARY KEY,
      categoria TEXT NOT NULL,
      fonte TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
    )
  `;

  // multi-user migration — idempotent
  await sql()`
    ALTER TABLE notas
      ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE
  `;
  await sql()`
    INSERT INTO users (email)
    VALUES (${LEGACY_OWNER_EMAIL})
    ON CONFLICT (email) DO NOTHING
  `;
  await sql()`
    UPDATE notas
       SET user_id = (SELECT id FROM users WHERE email = ${LEGACY_OWNER_EMAIL})
     WHERE user_id IS NULL
  `;
  await sql()`ALTER TABLE notas ALTER COLUMN user_id SET NOT NULL`;
  await sql()`ALTER TABLE notas DROP CONSTRAINT IF EXISTS notas_chave_acesso_key`;
  await sql()`ALTER TABLE notas DROP CONSTRAINT IF EXISTS notas_cnpj_numero_key`;
  await sql()`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_user_chave
      ON notas(user_id, chave_acesso)
      WHERE chave_acesso IS NOT NULL
  `;
  await sql()`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_notas_user_cnpj_numero
      ON notas(user_id, cnpj, numero)
      WHERE cnpj IS NOT NULL
  `;
  await sql()`CREATE INDEX IF NOT EXISTS idx_notas_user ON notas(user_id)`;

  await sql()`
    CREATE TABLE IF NOT EXISTS report_shares (
      id BIGSERIAL PRIMARY KEY,
      owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_with_email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS'),
      UNIQUE (owner_user_id, shared_with_email)
    )
  `;
  await sql()`CREATE INDEX IF NOT EXISTS idx_report_shares_email ON report_shares(shared_with_email)`;
}

export async function ensureUserByEmail(
  email: string,
  name: string | null
): Promise<number> {
  await ready();
  const normalized = email.trim().toLowerCase();
  const rows = (await sql()`
    INSERT INTO users (email, name)
    VALUES (${normalized}, ${name})
    ON CONFLICT (email) DO UPDATE
      SET name = COALESCE(EXCLUDED.name, users.name)
    RETURNING id
  `) as Array<{ id: number }>;
  return Number(rows[0].id);
}

export type ShareGrant = {
  email: string;
  created_at: string;
};

export async function addShare(
  ownerUserId: number,
  email: string
): Promise<"created" | "exists" | "invalid"> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return "invalid";
  await ready();
  const ownerRow = (await sql()`
    SELECT email FROM users WHERE id = ${ownerUserId}
  `) as Array<{ email: string }>;
  if (ownerRow[0]?.email?.toLowerCase() === normalized) return "invalid";
  const result = (await sql()`
    INSERT INTO report_shares (owner_user_id, shared_with_email)
    VALUES (${ownerUserId}, ${normalized})
    ON CONFLICT (owner_user_id, shared_with_email) DO NOTHING
    RETURNING id
  `) as Array<{ id: number }>;
  return result.length ? "created" : "exists";
}

export async function removeShare(ownerUserId: number, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await ready();
  await sql()`
    DELETE FROM report_shares
     WHERE owner_user_id = ${ownerUserId}
       AND shared_with_email = ${normalized}
  `;
}

export async function listSharesByOwner(ownerUserId: number): Promise<ShareGrant[]> {
  await ready();
  const rows = (await sql()`
    SELECT shared_with_email AS email, created_at
      FROM report_shares
     WHERE owner_user_id = ${ownerUserId}
     ORDER BY created_at DESC, id DESC
  `) as ShareGrant[];
  return rows;
}

export type SharedOwner = {
  ownerUserId: number;
  email: string;
  name: string | null;
};

export async function listOwnersSharingWith(viewerEmail: string): Promise<SharedOwner[]> {
  const normalized = viewerEmail.trim().toLowerCase();
  if (!normalized) return [];
  await ready();
  const rows = (await sql()`
    SELECT u.id AS owner_user_id, u.email, u.name
      FROM report_shares rs
      JOIN users u ON u.id = rs.owner_user_id
     WHERE rs.shared_with_email = ${normalized}
     ORDER BY u.email
  `) as Array<{ owner_user_id: number; email: string; name: string | null }>;
  return rows.map((r) => ({
    ownerUserId: Number(r.owner_user_id),
    email: r.email,
    name: r.name,
  }));
}

export async function canViewAsOwner(
  viewerEmail: string,
  ownerUserId: number
): Promise<boolean> {
  const normalized = viewerEmail.trim().toLowerCase();
  if (!normalized) return false;
  await ready();
  const rows = (await sql()`
    SELECT 1 FROM report_shares
     WHERE owner_user_id = ${ownerUserId}
       AND shared_with_email = ${normalized}
     LIMIT 1
  `) as Array<{ "?column?": number }>;
  return rows.length > 0;
}

export async function getUserById(
  userId: number
): Promise<{ email: string; name: string | null } | null> {
  await ready();
  const rows = (await sql()`
    SELECT email, name FROM users WHERE id = ${userId}
  `) as Array<{ email: string; name: string | null }>;
  return rows[0] ?? null;
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
  // estabelecimentos é tabela global; varremos todos os CNPJs conhecidos.
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

export async function upsertNota(
  userId: number,
  parsed: ParsedNota
): Promise<UpsertResult> {
  await ready();
  const existingRows = (await sql()`
    SELECT id FROM notas
     WHERE user_id = ${userId}
       AND ((${parsed.chave_acesso}::text IS NOT NULL AND chave_acesso = ${parsed.chave_acesso})
         OR (${parsed.cnpj}::text IS NOT NULL AND cnpj = ${parsed.cnpj} AND numero = ${parsed.numero}))
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
        (user_id, numero, serie, data_emissao, emitente, cnpj, valor_total,
         chave_acesso, creditos, situacao_credito, fonte)
      VALUES
        (${userId}, ${parsed.numero}, ${parsed.serie}, ${parsed.data_emissao}, ${parsed.emitente},
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

export async function listNotas(userId: number): Promise<NotaWithItens[]> {
  await ready();
  const notas = (await sql()`
    SELECT * FROM notas
     WHERE user_id = ${userId}
     ORDER BY data_emissao DESC, id DESC
  `) as NotaRow[];
  const itens = (await sql()`
    SELECT i.* FROM itens i
      JOIN notas n ON n.id = i.nota_id
     WHERE n.user_id = ${userId}
  `) as ItemRow[];
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

export async function pickLastThreeNotasWithItems(userId: number): Promise<{
  notas: Array<{ numero: string; emitente: string; data: string }>;
  produtos: string[];
}> {
  await ready();
  const notas = (await sql()`
    SELECT n.id, n.numero, n.emitente, n.data_emissao
      FROM notas n
      WHERE n.user_id = ${userId}
        AND EXISTS (SELECT 1 FROM itens i WHERE i.nota_id = n.id)
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
  categoria: string;
  vezes: number;
  ultima_compra: string;
  preco_medio: number;
  vu_ultimo: number;
  produtos: string[];
};

export async function getListaCompras(userId: number): Promise<ListaCompraItem[]> {
  await ready();
  const { categorizarPorDicionario, categorizarLote } = await import("./categorizar");

  const itensRows = (await sql()`
    SELECT
      UPPER(TRIM(i.produto)) AS produto,
      i.nota_id,
      i.vu,
      n.data_emissao
    FROM itens i
    JOIN notas n ON n.id = i.nota_id
    WHERE n.user_id = ${userId} AND TRIM(i.produto) <> ''
  `) as Array<{ produto: string; nota_id: number; vu: number; data_emissao: string }>;

  if (itensRows.length === 0) return [];

  const produtosUnicos = Array.from(new Set(itensRows.map((r) => r.produto)));

  const categoriaPorProduto = new Map<string, string>();
  const aClassificar: string[] = [];
  for (const p of produtosUnicos) {
    const dict = categorizarPorDicionario(p);
    if (dict) categoriaPorProduto.set(p, dict);
    else aClassificar.push(p);
  }

  if (aClassificar.length > 0) {
    const cached = (await sql()`
      SELECT produto, categoria FROM produto_categorias
       WHERE produto = ANY(${aClassificar}::text[])
    `) as Array<{ produto: string; categoria: string }>;
    for (const c of cached) categoriaPorProduto.set(c.produto, c.categoria);

    const aindaSem = aClassificar.filter((p) => !categoriaPorProduto.has(p));
    if (aindaSem.length > 0) {
      const aiResult = await categorizarLote(aindaSem);
      const fonteAi = process.env.ANTHROPIC_API_KEY ? "ai" : "fallback";
      for (const [produto, categoria] of aiResult) {
        categoriaPorProduto.set(produto, categoria);
        await sql()`
          INSERT INTO produto_categorias (produto, categoria, fonte)
          VALUES (${produto}, ${categoria}, ${fonteAi})
          ON CONFLICT (produto) DO NOTHING
        `;
      }
    }
  }

  type Bucket = {
    categoria: string;
    notas: Set<number>;
    ultima_compra: string;
    vu_ultimo: number;
    vus: number[];
    produtos: Set<string>;
  };
  const buckets = new Map<string, Bucket>();
  for (const r of itensRows) {
    const cat = categoriaPorProduto.get(r.produto) ?? r.produto;
    let b = buckets.get(cat);
    if (!b) {
      b = {
        categoria: cat,
        notas: new Set(),
        ultima_compra: r.data_emissao,
        vu_ultimo: Number(r.vu),
        vus: [],
        produtos: new Set(),
      };
      buckets.set(cat, b);
    }
    b.notas.add(Number(r.nota_id));
    b.vus.push(Number(r.vu));
    b.produtos.add(r.produto);
    if (compareDataEmissaoDesc(r.data_emissao, b.ultima_compra) > 0) {
      b.ultima_compra = r.data_emissao;
      b.vu_ultimo = Number(r.vu);
    }
  }

  const items: ListaCompraItem[] = [];
  for (const b of buckets.values()) {
    if (b.notas.size < 2) continue;
    const preco_medio = b.vus.reduce((s, v) => s + v, 0) / b.vus.length;
    items.push({
      categoria: b.categoria,
      vezes: b.notas.size,
      ultima_compra: b.ultima_compra,
      preco_medio,
      vu_ultimo: b.vu_ultimo,
      produtos: Array.from(b.produtos).sort(),
    });
  }
  items.sort(
    (a, b) =>
      b.vezes - a.vezes ||
      compareDataEmissaoDesc(b.ultima_compra, a.ultima_compra) ||
      a.categoria.localeCompare(b.categoria, "pt-BR")
  );
  return items;
}

export type SeriePrecoProduto = {
  key: string;
  produto: string;
  codigo: string | null;
  un_principal: string | null;
  is_peso: boolean;
  n_total: number;
  vu_min: number;
  vu_max: number;
  vu_avg: number;
  vu_ultimo: number;
  data_ultimo: string;
  mensal: Array<{ ym: string; label: string; vu_avg: number; n: number }>;
  dow: Array<{ dia: number; label: string; vu_avg: number; n: number }>;
  melhor_mes: { ym: string; label: string; vu_avg: number; n: number } | null;
};

const MES_LABEL = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DOW_LABEL = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function parseDataEmissao(d: string): Date | null {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split("/").map((x) => +x);
    return new Date(yyyy, mm - 1, dd);
  }
  return null;
}

export async function getSeriesPrecos(userId: number): Promise<SeriePrecoProduto[]> {
  await ready();
  const rows = (await sql()`
    SELECT i.produto, i.codigo, i.un, i.vu, n.data_emissao
      FROM itens i
      JOIN notas n ON n.id = i.nota_id
     WHERE n.user_id = ${userId} AND i.vu > 0 AND TRIM(i.produto) <> ''
  `) as Array<{ produto: string; codigo: string | null; un: string | null; vu: number; data_emissao: string }>;
  if (rows.length === 0) return [];

  type Bucket = {
    key: string;
    codigo: string | null;
    nameCounts: Map<string, number>;
    unCounts: Map<string, number>;
    obs: Array<{ vu: number; data: Date; raw: string }>;
  };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    const d = parseDataEmissao(r.data_emissao);
    if (!d) continue;
    const codigo = r.codigo && r.codigo.trim() ? r.codigo.trim() : null;
    const key = codigo ? `c:${codigo}` : `p:${r.produto}`;
    let b = buckets.get(key);
    if (!b) {
      b = { key, codigo, nameCounts: new Map(), unCounts: new Map(), obs: [] };
      buckets.set(key, b);
    }
    b.nameCounts.set(r.produto, (b.nameCounts.get(r.produto) ?? 0) + 1);
    if (r.un) b.unCounts.set(r.un, (b.unCounts.get(r.un) ?? 0) + 1);
    b.obs.push({ vu: Number(r.vu), data: d, raw: r.data_emissao });
  }

  const out: SeriePrecoProduto[] = [];
  for (const b of buckets.values()) {
    if (b.obs.length === 0) continue;
    const vus = b.obs.map((o) => o.vu);
    const vu_min = Math.min(...vus);
    const vu_max = Math.max(...vus);
    const vu_avg = vus.reduce((s, x) => s + x, 0) / vus.length;
    const sortedDesc = [...b.obs].sort((a, b2) => b2.data.getTime() - a.data.getTime());
    const ultimo = sortedDesc[0];
    const produto = [...b.nameCounts.entries()].sort((a, b2) => b2[1] - a[1])[0][0];
    const un_principal = [...b.unCounts.entries()].sort((a, b2) => b2[1] - a[1])[0]?.[0] ?? null;
    const is_peso = un_principal === "KG" || un_principal === "kg";

    const mensalMap = new Map<string, number[]>();
    const dowMap = new Map<number, number[]>();
    for (const o of b.obs) {
      const ym = `${o.data.getFullYear()}-${String(o.data.getMonth() + 1).padStart(2, "0")}`;
      const yArr = mensalMap.get(ym) ?? [];
      yArr.push(o.vu);
      mensalMap.set(ym, yArr);

      const dow = o.data.getDay();
      const dArr = dowMap.get(dow) ?? [];
      dArr.push(o.vu);
      dowMap.set(dow, dArr);
    }

    const mensal = [...mensalMap.entries()]
      .map(([ym, arr]) => {
        const [y, m] = ym.split("-");
        return {
          ym,
          label: `${MES_LABEL[+m - 1]}/${y.slice(2)}`,
          vu_avg: arr.reduce((s, x) => s + x, 0) / arr.length,
          n: arr.length,
        };
      })
      .sort((a, b2) => a.ym.localeCompare(b2.ym));

    const dow = [...dowMap.entries()]
      .map(([dia, arr]) => ({
        dia,
        label: DOW_LABEL[dia],
        vu_avg: arr.reduce((s, x) => s + x, 0) / arr.length,
        n: arr.length,
      }))
      .sort((a, b2) => a.dia - b2.dia);

    const melhor_mes =
      mensal.length >= 2
        ? mensal.reduce((best, m) => (m.vu_avg < best.vu_avg ? m : best))
        : null;

    out.push({
      key: b.key,
      produto,
      codigo: b.codigo,
      un_principal,
      is_peso,
      n_total: b.obs.length,
      vu_min,
      vu_max,
      vu_avg,
      vu_ultimo: ultimo.vu,
      data_ultimo: ultimo.raw,
      mensal,
      dow,
      melhor_mes,
    });
  }

  out.sort((a, b2) => b2.n_total - a.n_total || a.produto.localeCompare(b2.produto, "pt-BR"));
  return out;
}

export type DashboardData = {
  notas: NotaWithItens[];
  gastoCategoria: GastoCategoria[];
  inflacao: InflacaoCesta | null;
};

export async function getDashboardData(userId: number): Promise<DashboardData> {
  await ready();
  const { categorizarPorDicionario } = await import("./categorizar");

  const [notasRows, itensRows, categoriasCache] = (await Promise.all([
    sql()`SELECT * FROM notas WHERE user_id = ${userId} ORDER BY data_emissao DESC, id DESC`,
    sql()`SELECT i.* FROM itens i JOIN notas n ON n.id = i.nota_id WHERE n.user_id = ${userId}`,
    sql()`SELECT produto, categoria FROM produto_categorias`,
  ])) as [NotaRow[], ItemRow[], Array<{ produto: string; categoria: string }>];

  const byNota = new Map<number, ItemRow[]>();
  for (const it of itensRows) {
    const nid = Number(it.nota_id);
    const list = byNota.get(nid) ?? [];
    list.push({ ...it, id: Number(it.id), nota_id: nid });
    byNota.set(nid, list);
  }
  const notas: NotaWithItens[] = notasRows.map((n) => ({
    ...n,
    id: Number(n.id),
    itens: byNota.get(Number(n.id)) ?? [],
  }));

  const cacheCat = new Map(categoriasCache.map((c) => [c.produto, c.categoria]));
  const gastoAgg = new Map<string, { total: number; n: number }>();
  for (const it of itensRows) {
    if (!it.produto || !it.produto.trim()) continue;
    const upper = it.produto.toUpperCase().trim();
    const cat = categorizarPorDicionario(upper) ?? cacheCat.get(upper) ?? "OUTROS";
    const cur = gastoAgg.get(cat) ?? { total: 0, n: 0 };
    cur.total += Number(it.vt);
    cur.n += 1;
    gastoAgg.set(cat, cur);
  }
  const gastoCategoria: GastoCategoria[] = [...gastoAgg.entries()]
    .map(([categoria, v]) => ({ categoria, total: v.total, n_itens: v.n }))
    .sort((a, b) => b.total - a.total);

  type Series = Map<string, number[]>;
  const buckets = new Map<string, { mes: Series }>();
  const notaById = new Map(notasRows.map((n) => [Number(n.id), n.data_emissao]));
  for (const it of itensRows) {
    if (!(it.vu > 0)) continue;
    const data = notaById.get(Number(it.nota_id));
    if (!data) continue;
    const parsed = /^\d{2}\/\d{2}\/\d{4}$/.test(data)
      ? (() => {
          const [dd, mm, yyyy] = data.split("/");
          return `${yyyy}-${mm}`;
        })()
      : null;
    if (!parsed) continue;
    const codigo = it.codigo && it.codigo.trim() ? it.codigo.trim() : null;
    const key = codigo ? `c:${codigo}` : `p:${it.produto}`;
    let b = buckets.get(key);
    if (!b) {
      b = { mes: new Map() };
      buckets.set(key, b);
    }
    const arr = b.mes.get(parsed) ?? [];
    arr.push(Number(it.vu));
    b.mes.set(parsed, arr);
  }

  const variacoes: number[] = [];
  let primeiro = "";
  let ultimo = "";
  for (const b of buckets.values()) {
    const meses = [...b.mes.entries()].sort(([a], [bm]) => a.localeCompare(bm));
    if (meses.length < 2) continue;
    const [ymA, vusA] = meses[0];
    const [ymB, vusB] = meses[meses.length - 1];
    const avgA = vusA.reduce((s, x) => s + x, 0) / vusA.length;
    const avgB = vusB.reduce((s, x) => s + x, 0) / vusB.length;
    if (avgA <= 0 || ymA === ymB) continue;
    variacoes.push((avgB - avgA) / avgA);
    if (!primeiro || ymA < primeiro) primeiro = ymA;
    if (!ultimo || ymB > ultimo) ultimo = ymB;
  }
  const inflacao: InflacaoCesta | null = variacoes.length
    ? {
        variacao_pct: (variacoes.reduce((a, b) => a + b, 0) / variacoes.length) * 100,
        primeiro_mes: primeiro,
        ultimo_mes: ultimo,
        n_produtos: variacoes.length,
      }
    : null;

  return { notas, gastoCategoria, inflacao };
}

export type GastoCategoria = { categoria: string; total: number; n_itens: number };

export async function getGastoPorCategoria(userId: number): Promise<GastoCategoria[]> {
  await ready();
  const { categorizarPorDicionario } = await import("./categorizar");

  const rows = (await sql()`
    SELECT i.produto, i.vt
      FROM itens i
      JOIN notas n ON n.id = i.nota_id
     WHERE n.user_id = ${userId} AND TRIM(i.produto) <> ''
  `) as Array<{ produto: string; vt: number }>;
  if (rows.length === 0) return [];

  const cached = (await sql()`SELECT produto, categoria FROM produto_categorias`) as Array<{
    produto: string;
    categoria: string;
  }>;
  const cacheMap = new Map(cached.map((c) => [c.produto, c.categoria]));

  const agg = new Map<string, { total: number; n: number }>();
  for (const r of rows) {
    const upper = r.produto.toUpperCase().trim();
    const cat =
      categorizarPorDicionario(upper) ?? cacheMap.get(upper) ?? "OUTROS";
    const cur = agg.get(cat) ?? { total: 0, n: 0 };
    cur.total += Number(r.vt);
    cur.n += 1;
    agg.set(cat, cur);
  }

  return [...agg.entries()]
    .map(([categoria, v]) => ({ categoria, total: v.total, n_itens: v.n }))
    .sort((a, b) => b.total - a.total);
}

export type InflacaoCesta = {
  variacao_pct: number;
  primeiro_mes: string;
  ultimo_mes: string;
  n_produtos: number;
};

export async function getInflacaoCesta(userId: number): Promise<InflacaoCesta | null> {
  const series = await getSeriesPrecos(userId);
  const recorrentes = series.filter((s) => s.mensal.length >= 2);
  if (recorrentes.length === 0) return null;

  const variacoes: number[] = [];
  let primeiro = "";
  let ultimo = "";
  for (const s of recorrentes) {
    const first = s.mensal[0];
    const last = s.mensal[s.mensal.length - 1];
    if (first.ym === last.ym || first.vu_avg <= 0) continue;
    variacoes.push((last.vu_avg - first.vu_avg) / first.vu_avg);
    if (!primeiro || first.ym < primeiro) primeiro = first.ym;
    if (!ultimo || last.ym > ultimo) ultimo = last.ym;
  }
  if (variacoes.length === 0) return null;

  const media = variacoes.reduce((a, b) => a + b, 0) / variacoes.length;
  return {
    variacao_pct: media * 100,
    primeiro_mes: primeiro,
    ultimo_mes: ultimo,
    n_produtos: variacoes.length,
  };
}

function compareDataEmissaoDesc(a: string, b: string): number {
  const ka = dataKey(a);
  const kb = dataKey(b);
  return ka.localeCompare(kb);
}

function dataKey(d: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return d;
}

export type AdminStats = {
  totalUsers: number;
  totalNotas: number;
  totalItens: number;
  gastoTotal: number;
  totalEstabelecimentos: number;
  estabelecimentosSemGeo: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  await ready();
  const rows = (await sql()`
    SELECT
      (SELECT COUNT(*) FROM users)::bigint AS users,
      (SELECT COUNT(*) FROM notas)::bigint AS notas,
      (SELECT COUNT(*) FROM itens)::bigint AS itens,
      (SELECT COALESCE(SUM(valor_total), 0) FROM notas)::double precision AS gasto,
      (SELECT COUNT(*) FROM estabelecimentos)::bigint AS estab,
      (SELECT COUNT(*) FROM estabelecimentos WHERE latitude IS NULL OR longitude IS NULL)::bigint AS estab_sem_geo
  `) as Array<{
    users: number;
    notas: number;
    itens: number;
    gasto: number;
    estab: number;
    estab_sem_geo: number;
  }>;
  const r = rows[0];
  return {
    totalUsers: Number(r.users),
    totalNotas: Number(r.notas),
    totalItens: Number(r.itens),
    gastoTotal: Number(r.gasto),
    totalEstabelecimentos: Number(r.estab),
    estabelecimentosSemGeo: Number(r.estab_sem_geo),
  };
}

export type AdminUserRow = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  qtdNotas: number;
  gastoTotal: number;
  ultimaNota: string | null;
};

export async function listAllUsers(): Promise<AdminUserRow[]> {
  await ready();
  const rows = (await sql()`
    SELECT
      u.id,
      u.email,
      u.name,
      u.created_at,
      COUNT(n.id)::bigint AS qtd_notas,
      COALESCE(SUM(n.valor_total), 0)::double precision AS gasto_total,
      MAX(n.created_at) AS ultima_nota
    FROM users u
    LEFT JOIN notas n ON n.user_id = u.id
    GROUP BY u.id, u.email, u.name, u.created_at
    ORDER BY qtd_notas DESC, u.created_at DESC
  `) as Array<{
    id: number;
    email: string;
    name: string | null;
    created_at: string;
    qtd_notas: number;
    gasto_total: number;
    ultima_nota: string | null;
  }>;
  return rows.map((r) => ({
    id: Number(r.id),
    email: r.email,
    name: r.name,
    createdAt: r.created_at,
    qtdNotas: Number(r.qtd_notas),
    gastoTotal: Number(r.gasto_total),
    ultimaNota: r.ultima_nota,
  }));
}

export type AdminActivityRow = {
  notaId: number;
  userEmail: string;
  numero: string;
  emitente: string;
  valorTotal: number;
  fonte: string;
  createdAt: string;
};

export async function listRecentActivity(limit = 50): Promise<AdminActivityRow[]> {
  await ready();
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const rows = (await sql()`
    SELECT
      n.id,
      u.email,
      n.numero,
      n.emitente,
      n.valor_total,
      n.fonte,
      n.created_at
    FROM notas n
    JOIN users u ON u.id = n.user_id
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT ${safeLimit}
  `) as Array<{
    id: number;
    email: string;
    numero: string;
    emitente: string;
    valor_total: number;
    fonte: string;
    created_at: string;
  }>;
  return rows.map((r) => ({
    notaId: Number(r.id),
    userEmail: r.email,
    numero: r.numero,
    emitente: r.emitente,
    valorTotal: Number(r.valor_total),
    fonte: r.fonte,
    createdAt: r.created_at,
  }));
}

export async function deleteUserNotas(userId: number): Promise<number> {
  await ready();
  const rows = (await sql()`
    WITH del AS (
      DELETE FROM notas WHERE user_id = ${userId} RETURNING id
    )
    SELECT COUNT(*)::bigint AS n FROM del
  `) as Array<{ n: number }>;
  return Number(rows[0]?.n ?? 0);
}

export async function deleteUser(userId: number): Promise<void> {
  await ready();
  await sql()`DELETE FROM users WHERE id = ${userId}`;
}
