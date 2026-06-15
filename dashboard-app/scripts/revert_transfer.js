const fs = require('fs');
const path = require('path');

async function main(){
  const envPath = path.join(__dirname, '..', '.env.local.bak');
  if (!fs.existsSync(envPath)){
    console.error('.env.local.bak not found');
    process.exit(1);
  }
  const env = fs.readFileSync(envPath,'utf8');
  const m = env.match(/^DATABASE_URL=(.+)$/m);
  if (!m) { console.error('DATABASE_URL not found in .env.local.bak'); process.exit(1); }
  const DATABASE_URL = m[1].trim();

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(DATABASE_URL);

  const notaId = 42;
  const originalOwnerId = 2; // revert to this

  // get current owner
  const rows = await sql`SELECT id, numero, user_id FROM notas WHERE id = ${notaId} LIMIT 1`;
  if (!rows || rows.length === 0){
    console.error('nota not found', notaId);
    process.exit(1);
  }
  const current = rows[0];
  console.log('current owner for nota', notaId, 'is', current.user_id);

  if (Number(current.user_id) === originalOwnerId) {
    console.log('already owner is', originalOwnerId);
    process.exit(0);
  }

  try {
    await sql`UPDATE notas SET user_id = ${originalOwnerId} WHERE id = ${notaId}`;
    await sql`INSERT INTO nota_transfers (nota_id, from_user_id, to_user_id, transferred_by_user_id, reason) VALUES (${notaId}, ${current.user_id}, ${originalOwnerId}, ${originalOwnerId}, ${'revert transfer via script'})`;
    console.log('revert succeeded');
  } catch (err) {
    console.error('revert failed', err);
    process.exit(1);
  }

  const after = await sql`SELECT id, numero, user_id FROM notas WHERE id = ${notaId}`;
  console.log('after:', { id: after[0].id, numero: after[0].numero, user_id: after[0].user_id });

  const transfers = await sql`SELECT id, nota_id, from_user_id, to_user_id, transferred_by_user_id, reason, created_at FROM nota_transfers WHERE nota_id = ${notaId} ORDER BY id DESC LIMIT 5`;
  console.log('recent transfers for nota:', transfers.map(t=>({ id:t.id, from:t.from_user_id, to:t.to_user_id, by:t.transferred_by_user_id, reason:t.reason, created_at:t.created_at })));

  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
