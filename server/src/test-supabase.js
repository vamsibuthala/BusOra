import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('==================================================');
console.log('🔍 Testing Supabase Database Connection for BusOra');
console.log('==================================================');

if (!url || !key || !url.startsWith('http')) {
  console.log('❌ Supabase credentials are missing or incomplete in server/.env:');
  console.log(`   SUPABASE_URL: ${url ? url : '(NOT SET)'}`);
  console.log(`   SUPABASE_KEY: ${key ? '[HIDDEN]' : '(NOT SET)'}`);
  console.log('\n👉 To complete setup, please provide:');
  console.log('   1. SUPABASE_URL (e.g. https://your-project.supabase.co)');
  console.log('   2. SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log(`Connecting to: ${url}`);
const client = createClient(url, key, { auth: { persistSession: false } });

async function verifyTables() {
  const tables = ['users', 'routes', 'buses', 'trips', 'bus_locations', 'notifications'];
  const results = {};
  let allGood = true;

  for (const table of tables) {
    const { data, error, count } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      results[table] = { status: 'MISSING or ERROR', error: error.message };
      allGood = false;
    } else {
      results[table] = { status: 'OK', rowCount: count ?? 0 };
    }
  }

  console.log('\n📊 Table Verification:');
  for (const [table, res] of Object.entries(results)) {
    if (res.status === 'OK') {
      console.log(`  ✅ ${table.padEnd(16)} : OK (${res.rowCount} records)`);
    } else {
      console.log(`  ❌ ${table.padEnd(16)} : ${res.error}`);
    }
  }

  if (allGood) {
    console.log('\n🎉 ALL TABLES VERIFIED! Supabase is fully configured and operational.');
  } else {
    console.log('\n⚠️ Some tables are missing. Please execute "supabase_schema.sql" in your Supabase SQL Editor.');
  }
}

verifyTables().catch((err) => {
  console.error('\n❌ Connection Error:', err.message);
  process.exit(1);
});
