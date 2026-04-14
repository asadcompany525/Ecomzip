/**
 * Full 1:1 Supabase migration script
 * Migrates schema + all table data from OLD to NEW Supabase project
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OLD_URL  = process.env.VITE_SUPABASE_URL;
const OLD_KEY  = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;
const NEW_ANON_KEY    = process.env.NEW_SUPABASE_ANON_KEY;

// Normalise URL
if (NEW_URL && !NEW_URL.startsWith('https://')) {
  NEW_URL = `https://${NEW_URL}.supabase.co`;
}

console.log('='.repeat(60));
console.log('STOPY SHOES — Supabase 1:1 Migration');
console.log('='.repeat(60));
console.log(`OLD: ${OLD_URL}`);
console.log(`NEW: ${NEW_URL}`);
console.log('');

if (!OLD_URL || !NEW_URL || !NEW_SERVICE_KEY) {
  console.error('Missing required env vars. Need: VITE_SUPABASE_URL, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── Clients ────────────────────────────────────────────────────────────────
const oldClient = createClient(OLD_URL, OLD_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── Helpers ────────────────────────────────────────────────────────────────
async function runSqlOnNew(sql, label = '') {
  const res = await fetch(`${NEW_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': NEW_SERVICE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
    }
  });
  // Use pg-query endpoint via Supabase Management API SQL runner
  // We'll use the SQL over REST via the pg endpoint
}

async function execNewSQL(sql) {
  const res = await fetch(`${NEW_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
      'apikey': NEW_SERVICE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });
}

// Use pg endpoint (Supabase exposes it for service role)
async function pgExec(url, key, sql) {
  const endpoint = `${url}/pg`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

// Fetch all rows from old project table via REST
async function fetchAllRows(table, limit = 1000) {
  let rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await oldClient
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);
    if (error) {
      console.warn(`  ⚠ Could not fetch ${table}: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }
  return rows;
}

// Upsert rows into new project table (batch)
async function upsertRows(table, rows, batchSize = 200) {
  if (rows.length === 0) {
    console.log(`  ○ ${table}: 0 rows`);
    return;
  }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await newClient
      .from(table)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.warn(`  ⚠ ${table} batch ${Math.floor(i/batchSize)+1} error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  ✓ ${table}: ${inserted}/${rows.length} rows migrated`);
}

// ── Step 1: Apply schema migrations ────────────────────────────────────────
async function applySchema() {
  console.log('\n📐 STEP 1: Applying schema to new project...\n');

  const migrationFiles = [
    'supabase/migrations/20260218142119_e7aa51b8-7956-4d11-8767-288f2b531fbf.sql',
    'supabase/migrations/20260401075521_2b410004-22e6-461d-a080-852652299933.sql',
    'supabase/migrations/20260409000001_chat_history_table.sql',
    'supabase/migrations/20260409100000_new_feature_tables.sql',
    'supabase/migrations/20260409120000_staff_attendance.sql',
    'supabase/migrations/20260410080000_role_enum_and_custom_role.sql',
    'supabase/migrations/20260410150000_logos_bucket_and_fixes.sql',
    'supabase/migrations/20260412000001_add_is_deleted_and_username.sql',
    'supabase/migrations/20260412100000_sql_fix_customers_and_roles.sql',
  ];

  for (const file of migrationFiles) {
    const name = file.split('/').pop();
    try {
      const sql = readFileSync(file, 'utf8');
      // Use Supabase SQL API (service role can run raw SQL via pg_query RPC if available)
      // Or use the REST endpoint with raw postgres
      const res = await fetch(`${NEW_URL}/rest/v1/rpc/pg_query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': NEW_SERVICE_KEY,
          'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql })
      });

      if (res.ok) {
        console.log(`  ✓ ${name}`);
      } else {
        const body = await res.text();
        // Try alternative endpoint
        const res2 = await fetch(`${NEW_URL}/pg/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': NEW_SERVICE_KEY,
            'Authorization': `Bearer ${NEW_SERVICE_KEY}`,
          },
          body: JSON.stringify({ query: sql })
        });
        if (res2.ok) {
          console.log(`  ✓ ${name} (via pg/query)`);
        } else {
          console.log(`  ⚠ ${name}: will apply via management API`);
        }
      }
    } catch (e) {
      console.warn(`  ✗ ${name}: ${e.message}`);
    }
  }
}

// ── Step 2: Apply schema via Management API ────────────────────────────────
async function applySchemaViaManagementAPI() {
  console.log('\n📐 STEP 1: Applying schema via Supabase Management API...\n');

  const OLD_PROJECT_REF = OLD_URL.replace('https://', '').split('.')[0];
  const NEW_PROJECT_REF = NEW_URL.replace('https://', '').split('.')[0];

  const migrationFiles = [
    'supabase/migrations/20260218142119_e7aa51b8-7956-4d11-8767-288f2b531fbf.sql',
    'supabase/migrations/20260401075521_2b410004-22e6-461d-a080-852652299933.sql',
    'supabase/migrations/20260409000001_chat_history_table.sql',
    'supabase/migrations/20260409100000_new_feature_tables.sql',
    'supabase/migrations/20260409120000_staff_attendance.sql',
    'supabase/migrations/20260410080000_role_enum_and_custom_role.sql',
    'supabase/migrations/20260410150000_logos_bucket_and_fixes.sql',
    'supabase/migrations/20260412000001_add_is_deleted_and_username.sql',
    'supabase/migrations/20260412100000_sql_fix_customers_and_roles.sql',
  ];

  for (const file of migrationFiles) {
    const name = file.split('/').pop();
    try {
      let sql = readFileSync(file, 'utf8');
      
      // Run via Management API SQL endpoint
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${NEW_PROJECT_REF}/database/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({ query: sql })
        }
      );
      const body = await res.text();
      if (res.ok) {
        console.log(`  ✓ ${name}`);
      } else {
        console.warn(`  ⚠ ${name} (${res.status}): ${body.slice(0, 120)}`);
      }
    } catch (e) {
      console.warn(`  ✗ ${name}: ${e.message}`);
    }
  }
}

// ── Step 3: Migrate data table by table ────────────────────────────────────
async function migrateData() {
  console.log('\n📦 STEP 2: Migrating table data...\n');

  // Tables in dependency order (parents before children)
  const tables = [
    'categories',
    'products',
    'product_variants',
    'product_images',
    'customers',
    'orders',
    'order_items',
    'reviews',
    'coupons',
    'banners',
    'site_settings',
    'payment_methods',
    'notifications',
    'ai_discount_suggestions',
    'chat_history',
    'search_logs',
    'email_logs',
    'staff_attendance',
    'user_roles',
    'profiles',
  ];

  for (const table of tables) {
    try {
      const rows = await fetchAllRows(table);
      await upsertRows(table, rows);
    } catch (e) {
      console.warn(`  ✗ ${table}: ${e.message}`);
    }
  }
}

// ── Step 4: Verify counts ───────────────────────────────────────────────────
async function verifyCounts() {
  console.log('\n🔍 STEP 3: Verifying row counts...\n');
  const tables = [
    'categories', 'products', 'product_variants', 'customers',
    'orders', 'order_items', 'reviews', 'coupons', 'banners',
    'site_settings', 'payment_methods', 'notifications',
    'ai_discount_suggestions', 'chat_history', 'search_logs',
    'email_logs', 'staff_attendance', 'user_roles', 'profiles',
  ];

  let allGood = true;
  for (const table of tables) {
    const { count: oldCount } = await oldClient.from(table).select('*', { count: 'exact', head: true });
    const { count: newCount } = await newClient.from(table).select('*', { count: 'exact', head: true });
    const match = oldCount === newCount;
    if (!match) allGood = false;
    console.log(`  ${match ? '✓' : '✗'} ${table}: OLD=${oldCount ?? '?'} NEW=${newCount ?? '?'} ${match ? '' : '← MISMATCH'}`);
  }
  return allGood;
}

// ── Step 5: Storage buckets info ───────────────────────────────────────────
async function storageInfo() {
  console.log('\n🗂  STEP 4: Storage buckets (files must be migrated manually)...\n');
  const { data: buckets } = await oldClient.storage.listBuckets();
  if (buckets) {
    for (const b of buckets) {
      const { data: files } = await oldClient.storage.from(b.name).list('', { limit: 1000 });
      console.log(`  • ${b.name}: ~${files?.length ?? 0} top-level items`);
    }
  }
  console.log('\n  ℹ Storage files (images, etc.) need to be downloaded and re-uploaded');
  console.log('    to the new project via Supabase dashboard or Storage API.');
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  try {
    await applySchemaViaManagementAPI();
    await migrateData();
    const ok = await verifyCounts();
    await storageInfo();

    console.log('\n' + '='.repeat(60));
    if (ok) {
      console.log('✅ Migration complete! All row counts match.');
    } else {
      console.log('⚠  Migration done with some mismatches — check above.');
    }
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Update VITE_SUPABASE_URL → ' + NEW_URL);
    console.log('2. Update VITE_SUPABASE_PUBLISHABLE_KEY → NEW_SUPABASE_ANON_KEY value');
    console.log('3. Update VITE_SUPABASE_PROJECT_ID → ' + NEW_URL.replace('https://','').split('.')[0]);
    console.log('4. Update supabase/config.toml project_id');
    console.log('5. Re-deploy edge functions to new project');
    console.log('6. Migrate storage files via Supabase dashboard');
  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

main();
