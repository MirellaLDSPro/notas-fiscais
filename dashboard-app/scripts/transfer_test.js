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

  console.log('Connected — querying sample notas and users');

  const notas = await sql`SELECT id, numero, user_id, chave_acesso, created_at FROM notas ORDER BY created_at DESC LIMIT 5`;
  console.log('recent notas:', notas.map(n => ({ id: n.id, numero: n.numero, user_id: n.user_id })));

  const users = await sql`SELECT id, email FROM users ORDER BY id LIMIT 10`;
  console.log('sample users (first 10):', users.map(u => ({ id: u.id, email: u.email })));

  if (!notas.length){ console.error('no notas to test'); process.exit(1); }

  const nota = notas[0];
  // choose a target user different from current owner
  let targetUser = users.find(u => u.id !== nota.user_id);
  if (!targetUser) {
    // create a test user
    const email = 'test-dest@example.com';
    const r = await sql`INSERT INTO users (email) VALUES (${email}) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id, email`;
    targetUser = r[0];
    console.log('created target user', targetUser);
  }

  // find an admin user to act as transferred_by: use AUTH_ALLOWED_EMAILS first email from env
  const adminMatch = env.match(/^AUTH_ALLOWED_EMAILS=(.+)$/m);
  let adminEmail = adminMatch ? adminMatch[1].split(',')[0].trim() : null;
  let adminRow = null;
  if (adminEmail) {
    const rows = await sql`SELECT id, email FROM users WHERE email = ${adminEmail} LIMIT 1`;
    adminRow = rows[0] ?? null;
    if (!adminRow){ // create admin user
      const r = await sql`INSERT INTO users (email) VALUES (${adminEmail}) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id, email`;
      adminRow = r[0];
    }
  } else {
    // fallback to first user
    adminRow = users[0];
  }

  console.log('testing transfer: notaId=', nota.id, 'from', nota.user_id, 'to', targetUser.id, 'by', adminRow.id);

  // perform transfer inside transaction
  try {
    await sql`UPDATE notas SET user_id = ${targetUser.id} WHERE id = ${nota.id}`;
    await sql`INSERT INTO nota_transfers (nota_id, from_user_id, to_user_id, transferred_by_user_id, reason) VALUES (${nota.id}, ${nota.user_id}, ${targetUser.id}, ${adminRow.id}, ${'test transfer via script'})`;
    console.log('transfer succeeded');
  } catch (err) {
    console.error('transfer failed:', err);
    process.exit(1);
  }

  // verify
  const after = await sql`SELECT id, numero, user_id FROM notas WHERE id = ${nota.id}`;
  console.log('after:', { id: after[0].id, numero: after[0].numero, user_id: after[0].user_id });

  const transfers = await sql`SELECT id, nota_id, from_user_id, to_user_id, transferred_by_user_id, reason, created_at FROM nota_transfers WHERE nota_id = ${nota.id} ORDER BY id DESC LIMIT 5`;
  console.log('recent transfers for nota:', transfers.map(t=>({ id:t.id, from:t.from_user_id, to:t.to_user_id, by:t.transferred_by_user_id, reason:t.reason, created_at:t.created_at })));

  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
