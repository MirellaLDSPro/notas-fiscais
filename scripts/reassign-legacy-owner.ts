import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually (script runs outside next)
const envPath = resolve(process.cwd(), ".env.local");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // ignore if .env.local missing
}

const FROM_EMAIL = "mirella.lins@mercos.com";
const TO_EMAIL = "mirella.lds@gmail.com";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida");
  const sql = neon(url);

  const counts = (await sql`
    SELECT u.email, COUNT(n.id)::int AS n
      FROM users u
      LEFT JOIN notas n ON n.user_id = u.id
     GROUP BY u.email
     ORDER BY u.email
  `) as Array<{ email: string; n: number }>;
  console.log("Estado antes:");
  for (const r of counts) console.log(`  ${r.email}: ${r.n} notas`);

  const toRows = (await sql`SELECT id FROM users WHERE email = ${TO_EMAIL}`) as Array<{ id: number }>;
  if (!toRows[0]) {
    throw new Error(`Usuário destino ${TO_EMAIL} não existe — faça login primeiro com essa conta.`);
  }
  const toId = Number(toRows[0].id);

  const fromRows = (await sql`SELECT id FROM users WHERE email = ${FROM_EMAIL}`) as Array<{ id: number }>;
  if (!fromRows[0]) {
    console.log(`Nada a fazer — usuário origem ${FROM_EMAIL} não existe.`);
    return;
  }
  const fromId = Number(fromRows[0].id);

  const moved = (await sql`
    WITH upd AS (
      UPDATE notas SET user_id = ${toId} WHERE user_id = ${fromId} RETURNING id
    )
    SELECT COUNT(*)::int AS n FROM upd
  `) as Array<{ n: number }>;
  console.log(`Movidas ${moved[0].n} notas de ${FROM_EMAIL} → ${TO_EMAIL}`);

  await sql`DELETE FROM users WHERE id = ${fromId}`;
  console.log(`Removido usuário órfão ${FROM_EMAIL}`);

  const after = (await sql`
    SELECT u.email, COUNT(n.id)::int AS n
      FROM users u
      LEFT JOIN notas n ON n.user_id = u.id
     GROUP BY u.email
     ORDER BY u.email
  `) as Array<{ email: string; n: number }>;
  console.log("Estado depois:");
  for (const r of after) console.log(`  ${r.email}: ${r.n} notas`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
