/**
 * Migra dados de data/notas.db (SQLite local) para o Postgres apontado por DATABASE_URL.
 *
 * Uso:
 *   DATABASE_URL='postgres://...neon.tech/...' npx tsx scripts/migrate-from-sqlite.ts
 *
 * Lê o SQLite via CLI `sqlite3 -json` (sem dependência nativa em node_modules).
 * IDs não são preservados — o mapeamento old_id → new_id é refeito ao inserir os itens.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DB_FILE = "./data/notas.db";
const URL = process.env.DATABASE_URL;

if (!URL) {
  console.error("Defina DATABASE_URL antes de rodar.");
  process.exit(1);
}
if (!existsSync(DB_FILE)) {
  console.error(`Arquivo ${DB_FILE} não encontrado.`);
  process.exit(1);
}

const sql = neon(URL);

function dump<T>(query: string): T[] {
  const out = execSync(`sqlite3 -json "${DB_FILE}" "${query.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
  });
  return out.trim() ? (JSON.parse(out) as T[]) : [];
}

type OldNota = {
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
type OldItem = {
  id: number;
  nota_id: number;
  produto: string;
  codigo: string | null;
  qt: number;
  un: string | null;
  vu: number;
  vt: number;
};
type OldEstab = {
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

async function initSchema() {
  await sql`
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
  await sql`
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
  await sql`CREATE INDEX IF NOT EXISTS idx_itens_nota ON itens(nota_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notas_data ON notas(data_emissao)`;
  await sql`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      cnpj TEXT PRIMARY KEY,
      razao_social TEXT, nome_fantasia TEXT, logradouro TEXT, numero TEXT,
      complemento TEXT, bairro TEXT, municipio TEXT, uf TEXT, cep TEXT,
      latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
      fonte TEXT,
      updated_at TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')
    )
  `;
}

async function main() {
  console.log("→ Criando schema (idempotente)…");
  await initSchema();

  const oldNotas = dump<OldNota>("SELECT * FROM notas ORDER BY id");
  const oldItens = dump<OldItem>("SELECT * FROM itens ORDER BY id");
  const oldEstabs = dump<OldEstab>("SELECT * FROM estabelecimentos");
  console.log(`→ Origem: ${oldNotas.length} notas, ${oldItens.length} itens, ${oldEstabs.length} estabelecimentos.`);

  const idMap = new Map<number, number>();
  let inserted = 0;
  let skipped = 0;
  for (const n of oldNotas) {
    const found = (await sql`
      SELECT id FROM notas
       WHERE (${n.chave_acesso}::text IS NOT NULL AND chave_acesso = ${n.chave_acesso})
          OR (${n.cnpj}::text IS NOT NULL AND cnpj = ${n.cnpj} AND numero = ${n.numero})
       LIMIT 1
    `) as Array<{ id: number }>;
    if (found[0]) {
      idMap.set(n.id, Number(found[0].id));
      skipped++;
      continue;
    }
    const rows = (await sql`
      INSERT INTO notas (numero, serie, data_emissao, emitente, cnpj, valor_total,
                         chave_acesso, creditos, situacao_credito, fonte, created_at)
      VALUES (${n.numero}, ${n.serie}, ${n.data_emissao}, ${n.emitente}, ${n.cnpj},
              ${n.valor_total}, ${n.chave_acesso}, ${n.creditos}, ${n.situacao_credito},
              ${n.fonte}, ${n.created_at})
      RETURNING id
    `) as Array<{ id: number }>;
    idMap.set(n.id, Number(rows[0].id));
    inserted++;
  }
  console.log(`  notas: ${inserted} inseridas, ${skipped} já existiam.`);

  let itensIns = 0;
  for (const it of oldItens) {
    const newNotaId = idMap.get(it.nota_id);
    if (!newNotaId) continue;
    await sql`
      INSERT INTO itens (nota_id, produto, codigo, qt, un, vu, vt)
      VALUES (${newNotaId}, ${it.produto}, ${it.codigo}, ${it.qt}, ${it.un}, ${it.vu}, ${it.vt})
    `;
    itensIns++;
  }
  console.log(`  itens: ${itensIns} inseridos.`);

  let estabIns = 0;
  let estabUpd = 0;
  for (const e of oldEstabs) {
    const existing = (await sql`
      SELECT cnpj FROM estabelecimentos WHERE cnpj = ${e.cnpj}
    `) as Array<{ cnpj: string }>;
    if (existing[0]) {
      await sql`
        UPDATE estabelecimentos SET
          razao_social = COALESCE(${e.razao_social}, razao_social),
          nome_fantasia = COALESCE(${e.nome_fantasia}, nome_fantasia),
          logradouro = COALESCE(${e.logradouro}, logradouro),
          numero = COALESCE(${e.numero}, numero),
          complemento = COALESCE(${e.complemento}, complemento),
          bairro = COALESCE(${e.bairro}, bairro),
          municipio = COALESCE(${e.municipio}, municipio),
          uf = COALESCE(${e.uf}, uf),
          cep = COALESCE(${e.cep}, cep),
          latitude = COALESCE(${e.latitude}, latitude),
          longitude = COALESCE(${e.longitude}, longitude),
          fonte = COALESCE(${e.fonte}, fonte),
          updated_at = ${e.updated_at}
        WHERE cnpj = ${e.cnpj}
      `;
      estabUpd++;
    } else {
      await sql`
        INSERT INTO estabelecimentos
          (cnpj, razao_social, nome_fantasia, logradouro, numero, complemento,
           bairro, municipio, uf, cep, latitude, longitude, fonte, updated_at)
        VALUES (${e.cnpj}, ${e.razao_social}, ${e.nome_fantasia}, ${e.logradouro},
                ${e.numero}, ${e.complemento}, ${e.bairro}, ${e.municipio},
                ${e.uf}, ${e.cep}, ${e.latitude}, ${e.longitude}, ${e.fonte}, ${e.updated_at})
      `;
      estabIns++;
    }
  }
  console.log(`  estabelecimentos: ${estabIns} inseridos, ${estabUpd} atualizados.`);
  console.log("✔ Migração concluída.");
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
