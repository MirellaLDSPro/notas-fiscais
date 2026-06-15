const fs = require('fs');
const path = require('path');
(async function(){
  const envPath = path.join(__dirname, '..', '.env.local.bak');
  const env = fs.readFileSync(envPath,'utf8');
  const m = env.match(/^DATABASE_URL=(.+)$/m);
  const DATABASE_URL = m[1].trim();
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(DATABASE_URL);
  const notaId=42;
  const note = await sql`SELECT id, numero, user_id FROM notas WHERE id=${notaId}`;
  console.log('nota:', note[0]);
  const transfers = await sql`SELECT id, from_user_id, to_user_id, transferred_by_user_id, reason, created_at FROM nota_transfers WHERE nota_id=${notaId} ORDER BY id DESC LIMIT 5`;
  console.log('transfers:', transfers.map(t=>({id:t.id,from:t.from_user_id,to:t.to_user_id,by:t.transferred_by_user_id,reason:t.reason,created_at:t.created_at})));
})().catch(err=>{console.error(err);process.exit(1)});
