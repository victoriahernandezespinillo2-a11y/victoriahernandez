require('dotenv').config({ path: '../../.env' });
const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL });
  await client.connect();
  const email = process.argv[2];
  const sql = `
    SELECT r.id, r.start_time, r.end_time, r.status, r.total_price, c.name AS court_name
    FROM reservations r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN courts c ON c.id = r.court_id
    WHERE u.email = $1
    ORDER BY r.start_time DESC
    LIMIT 50;
  `;
  const res = await client.query(sql, [email]);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})().catch(e => { console.error(e); process.exit(1); });
