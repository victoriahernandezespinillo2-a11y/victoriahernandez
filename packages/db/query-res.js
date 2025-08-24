require('dotenv').config({ path: '../../.env' });
const { Client } = require('pg');

(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL });
  await client.connect();

  const email = process.argv[2];

  try {
    if (email) {
      const sqlByEmail = `
        SELECT r.id, r.start_time, r.end_time, r.status, r.total_price,
               u.id AS user_id, u.name AS user_name, u.email AS user_email,
               c.id AS court_id, c.name AS court_name,
               ce.id AS center_id, ce.name AS center_name
        FROM reservations r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN courts c ON c.id = r.court_id
        LEFT JOIN centers ce ON ce.id = c.center_id
        WHERE u.email = $1
        ORDER BY r.start_time DESC
        LIMIT 200;
      `;
      const res = await client.query(sqlByEmail, [email]);
      console.log(JSON.stringify(res.rows, null, 2));
    } else {
      // Listar TODAS las reservas con propietarios y detalles de cancha/centro
      const sqlAll = `
        SELECT r.id, r.start_time, r.end_time, r.status, r.total_price, r.created_at,
               u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
               c.id AS court_id, c.name AS court_name,
               ce.id AS center_id, ce.name AS center_name
        FROM reservations r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN courts c ON c.id = r.court_id
        LEFT JOIN centers ce ON ce.id = c.center_id
        ORDER BY r.start_time DESC
        LIMIT 300;
      `;
      const res = await client.query(sqlAll);

      // Resumen por usuario
      const byUser = new Map();
      for (const row of res.rows) {
        const key = row.user_id || 'sin-usuario';
        const entry = byUser.get(key) || { count: 0, name: row.user_name || '-', email: row.user_email || '-', phone: row.user_phone || '-' };
        entry.count += 1;
        byUser.set(key, entry);
      }

      console.log(`\n📊 TOTAL DE RESERVAS: ${res.rows.length}`);
      console.log('👤 RESERVAS POR USUARIO:');
      const top = [...byUser.entries()].sort((a,b) => b[1].count - a[1].count);
      for (const [id, info] of top) {
        console.log(`- ${String(info.count).padStart(3,' ')} | ${info.email} | ${info.name} | id=${id}`);
      }

      console.log('\n🧾 LISTADO DETALLADO:');
      for (const row of res.rows) {
        const start = new Date(row.start_time).toISOString().replace('T',' ').slice(0,16);
        const end = new Date(row.end_time).toISOString().replace('T',' ').slice(11,16);
        console.log(`• ${row.id} | ${start} - ${end} | ${row.status} | ${Number(row.total_price||0)}€`);
        console.log(`  Usuario: ${row.user_email || '-'} (${row.user_name || '-'}) id=${row.user_id}`);
        console.log(`  Pista: ${row.court_name || '-'}${row.center_name ? ` (Centro: ${row.center_name})` : ''}`);
      }
    }
  } catch (e) {
    console.error('❌ Error ejecutando consulta:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
