import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "notas.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __nfce_db: Database.Database | undefined;
}

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL,
      serie TEXT,
      data_emissao TEXT NOT NULL,
      emitente TEXT NOT NULL,
      cnpj TEXT,
      valor_total REAL NOT NULL,
      chave_acesso TEXT UNIQUE,
      creditos REAL NOT NULL DEFAULT 0,
      situacao_credito TEXT,
      fonte TEXT NOT NULL DEFAULT 'PDF',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (cnpj, numero)
    );
    CREATE TABLE IF NOT EXISTS itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nota_id INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
      produto TEXT NOT NULL,
      codigo TEXT,
      qt REAL NOT NULL,
      un TEXT,
      vu REAL NOT NULL,
      vt REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_itens_nota ON itens(nota_id);
    CREATE INDEX IF NOT EXISTS idx_notas_data ON notas(data_emissao);
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
      latitude REAL,
      longitude REAL,
      fonte TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
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

export function upsertEstabelecimento(input: EstabelecimentoInput): "inserted" | "updated" | "skipped" {
  const db = getDb();
  const cnpj = cnpjDigits(input.cnpj);
  if (cnpj.length < 8) return "skipped";

  const existing = db
    .prepare("SELECT fonte, logradouro FROM estabelecimentos WHERE cnpj = ?")
    .get(cnpj) as { fonte: string | null; logradouro: string | null } | undefined;

  if (existing) {
    if (existing.fonte === "BRASIL_API" && input.fonte === "PDF") return "skipped";
    if (existing.logradouro && input.fonte === "PDF" && !input.logradouro) return "skipped";
    db.prepare(
      `UPDATE estabelecimentos SET
         razao_social = COALESCE(?, razao_social),
         nome_fantasia = COALESCE(?, nome_fantasia),
         logradouro = COALESCE(?, logradouro),
         numero = COALESCE(?, numero),
         complemento = COALESCE(?, complemento),
         bairro = COALESCE(?, bairro),
         municipio = COALESCE(?, municipio),
         uf = COALESCE(?, uf),
         cep = COALESCE(?, cep),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         fonte = ?,
         updated_at = datetime('now')
       WHERE cnpj = ?`
    ).run(
      input.razao_social ?? null,
      input.nome_fantasia ?? null,
      input.logradouro ?? null,
      input.numero ?? null,
      input.complemento ?? null,
      input.bairro ?? null,
      input.municipio ?? null,
      input.uf ?? null,
      input.cep ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      input.fonte,
      cnpj
    );
    return "updated";
  }

  db.prepare(
    `INSERT INTO estabelecimentos
      (cnpj, razao_social, nome_fantasia, logradouro, numero, complemento,
       bairro, municipio, uf, cep, latitude, longitude, fonte)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    cnpj,
    input.razao_social ?? null,
    input.nome_fantasia ?? null,
    input.logradouro ?? null,
    input.numero ?? null,
    input.complemento ?? null,
    input.bairro ?? null,
    input.municipio ?? null,
    input.uf ?? null,
    input.cep ?? null,
    input.latitude ?? null,
    input.longitude ?? null,
    input.fonte
  );
  return "inserted";
}

export function listCnpjsWithoutEstabelecimento(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT n.cnpj
         FROM notas n
         WHERE n.cnpj IS NOT NULL AND n.cnpj != ''
           AND NOT EXISTS (
             SELECT 1 FROM estabelecimentos e
             WHERE e.cnpj = REPLACE(REPLACE(REPLACE(n.cnpj, '.', ''), '/', ''), '-', '')
               AND e.logradouro IS NOT NULL
           )`
    )
    .all() as Array<{ cnpj: string }>;
  return rows.map((r) => r.cnpj).filter(Boolean);
}

export function getDb(): Database.Database {
  if (!globalThis.__nfce_db) {
    const db = new Database(DB_PATH);
    init(db);
    globalThis.__nfce_db = db;
  }
  return globalThis.__nfce_db;
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

export function upsertNota(parsed: ParsedNota): UpsertResult {
  const db = getDb();
  const findStmt = db.prepare(
    `SELECT * FROM notas WHERE
      (? IS NOT NULL AND chave_acesso = ?)
      OR (cnpj = ? AND numero = ?)
     LIMIT 1`
  );
  const existing = findStmt.get(
    parsed.chave_acesso,
    parsed.chave_acesso,
    parsed.cnpj,
    parsed.numero
  ) as NotaRow | undefined;

  if (existing) {
    return { id: existing.id, action: "skipped" };
  }

  const tx = db.transaction((): UpsertResult => {

    const res = db
      .prepare(
        `INSERT INTO notas
          (numero, serie, data_emissao, emitente, cnpj, valor_total,
           chave_acesso, creditos, situacao_credito, fonte)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parsed.numero,
        parsed.serie,
        parsed.data_emissao,
        parsed.emitente,
        parsed.cnpj,
        parsed.valor_total,
        parsed.chave_acesso,
        parsed.creditos ?? 0,
        parsed.situacao_credito ?? null,
        parsed.fonte
      );
    const id = res.lastInsertRowid as number;
    if (parsed.itens.length > 0) {
      const insI = db.prepare(
        "INSERT INTO itens (nota_id, produto, codigo, qt, un, vu, vt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      for (const i of parsed.itens) {
        insI.run(id, i.produto, i.codigo, i.qt, i.un, i.vu, i.vt);
      }
    }
    return { id, action: "inserted" };
  });

  return tx();
}

export type NotaWithItens = NotaRow & { itens: ItemRow[] };

export function listNotas(): NotaWithItens[] {
  const db = getDb();
  const notas = db
    .prepare("SELECT * FROM notas ORDER BY data_emissao DESC, id DESC")
    .all() as NotaRow[];
  const itens = db.prepare("SELECT * FROM itens").all() as ItemRow[];
  const byNota = new Map<number, ItemRow[]>();
  for (const it of itens) {
    const list = byNota.get(it.nota_id) ?? [];
    list.push(it);
    byNota.set(it.nota_id, list);
  }
  return notas.map((n) => ({ ...n, itens: byNota.get(n.id) ?? [] }));
}
