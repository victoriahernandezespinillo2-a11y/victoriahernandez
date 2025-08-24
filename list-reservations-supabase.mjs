import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno para Supabase.');
  console.error('SUPABASE_URL:', SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY definido:', Boolean(SUPABASE_SERVICE_ROLE_KEY));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
});

function fmtDate(x) {
  if (!x) return '-';
  try { return new Date(x).toISOString().replace('T',' ').slice(0,16); } catch { return String(x); }
}

async function fetchWithJoin() {
  // Intentar obtener reservas con relaciones via PostgREST
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      id, user_id, court_id, start_time, end_time, status, total_price, created_at,
      users:users (*) ,
      courts:courts ( id, name, center_id, centers:centers ( id, name ) )
    `)
    .order('start_time', { ascending: false })
    .limit(200);
  return { data, error };
}

async function fetchWithoutJoin() {
  // Fallback: obtener reservas y luego mapear usuarios/canchas en llamadas adicionales minimizadas
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, user_id, court_id, start_time, end_time, status, total_price, created_at')
    .order('start_time', { ascending: false })
    .limit(200);
  if (error) return { data: null, error };

  const userIds = [...new Set(reservations.map(r => r.user_id).filter(Boolean))];
  const courtIds = [...new Set(reservations.map(r => r.court_id).filter(Boolean))];

  const [{ data: users, error: errU }, { data: courts, error: errC }] = await Promise.all([
    userIds.length ? supabase.from('users').select('id, email, name, phone').in('id', userIds) : Promise.resolve({ data: [], error: null }),
    courtIds.length ? supabase.from('courts').select('id, name, center_id') .in('id', courtIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (errU || errC) return { data: null, error: errU || errC };

  let centers = [];
  const centerIds = [...new Set((courts || []).map(c => c.center_id).filter(Boolean))];
  if (centerIds.length) {
    const { data: centersData, error: errCenters } = await supabase.from('centers').select('id, name').in('id', centerIds);
    if (!errCenters) centers = centersData || [];
  }

  const usersById = Object.fromEntries((users || []).map(u => [u.id, u]));
  const courtsById = Object.fromEntries((courts || []).map(c => [c.id, { ...c, centers: centers.find(ct => ct.id === c.center_id) || null }]));

  const merged = reservations.map(r => ({
    ...r,
    users: usersById[r.user_id] || null,
    courts: courtsById[r.court_id] || null,
  }));
  return { data: merged, error: null };
}

function analyze(reservations) {
  const byUser = new Map();
  for (const r of reservations) {
    const u = r.users || {};
    const key = r.user_id || 'sin-usuario';
    const entry = byUser.get(key) || { count: 0, email: u.email || '-', name: u.name || '-', id: key };
    entry.count += 1;
    byUser.set(key, entry);
  }
  const sorted = [...byUser.values()].sort((a,b) => b.count - a.count);
  return sorted;
}

function print(reservations) {
  console.log(`\n📊 TOTAL DE RESERVAS: ${reservations.length}`);
  console.log('='.repeat(80));

  const stats = analyze(reservations);
  console.log('👤 RESERVAS POR USUARIO:');
  for (const s of stats) {
    console.log(`- ${s.count.toString().padStart(3,' ')} | ${s.email} | ${s.name} | id=${s.id}`);
  }

  console.log('\n🧾 LISTADO DETALLADO (máx. 200):');
  for (const r of reservations) {
    const user = r.users || {};
    const court = r.courts || {};
    const center = (court && court.centers) || {};
    console.log(`• ${r.id} | ${fmtDate(r.start_time)} -> ${fmtDate(r.end_time)} | ${r.status} | ${Number(r.total_price || 0)}€`);
    console.log(`  Usuario: ${user.email || '-'} (${user.name || '-'}) id=${r.user_id}`);
    console.log(`  Pista: ${court.name || '-'} ${center.name ? `(Centro: ${center.name})` : ''}`);
  }
}

(async () => {
  console.log('🔌 Conectando a Supabase (REST)...');
  let { data, error } = await fetchWithJoin();
  if (error) {
    console.warn('⚠️ Falló join automático de PostgREST, error:', error.message || error);
    ({ data, error } = await fetchWithoutJoin());
  }
  if (error) {
    console.error('❌ No se pudieron obtener las reservas:', error.message || error);
    process.exit(1);
  }
  if (!data || !data.length) {
    console.log('❌ No hay reservas');
    process.exit(0);
  }
  print(data);
})();