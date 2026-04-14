/**
 * Generates the full combined SQL migration file for the new Supabase project.
 * Run: node scripts/generate-migration-sql.mjs
 * Then paste output into: new Supabase project → SQL Editor → Run
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.VITE_SUPABASE_URL;
const OLD_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const oldClient = createClient(OLD_URL, OLD_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

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

function escapeStr(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function rowsToInsertSQL(table, rows) {
  if (!rows || rows.length === 0) return `-- ${table}: no data\n`;
  const cols = Object.keys(rows[0]);
  const colList = cols.map(c => `"${c}"`).join(', ');
  let sql = `-- ${table}: ${rows.length} rows\n`;
  sql += `-- Disable triggers temporarily for clean insert\n`;
  for (const row of rows) {
    const vals = cols.map(c => escapeStr(row[c])).join(', ');
    sql += `INSERT INTO public."${table}" (${colList}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  return sql + '\n';
}

async function fetchAll(table) {
  let rows = [], offset = 0;
  while (true) {
    const { data, error } = await oldClient
      .from(table)
      .select('*')
      .range(offset, offset + 999);
    if (error) { console.warn(`  ⚠ ${table}: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

async function main() {
  console.log('Generating full migration SQL...\n');

  let output = `-- ============================================================
-- STOPY SHOES — Complete 1:1 Migration SQL
-- Generated: ${new Date().toISOString()}
-- Run this in: new Supabase project → SQL Editor → Run
-- ============================================================

-- Disable statement timeout for long operations
SET statement_timeout = '0';

`;

  // ── PART 1: Schema ──────────────────────────────────────────
  output += `\n-- ============================================================\n`;
  output += `-- PART 1: SCHEMA\n`;
  output += `-- ============================================================\n\n`;

  for (const file of migrationFiles) {
    const name = file.split('/').pop();
    const sql = readFileSync(file, 'utf8');
    output += `-- ── Migration: ${name} ──\n`;
    output += sql + '\n\n';
  }

  // ── PART 2: Storage buckets ─────────────────────────────────
  output += `\n-- ============================================================\n`;
  output += `-- PART 2: STORAGE BUCKETS\n`;
  output += `-- ============================================================\n\n`;

  output += `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage RLS for product-images
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_all" ON storage.objects;
CREATE POLICY "product_images_admin_all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "tryon_user_upload" ON storage.objects;
CREATE POLICY "tryon_user_upload"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'product-images' AND name LIKE 'tryon-user/%');

`;

  // ── PART 3: Data ────────────────────────────────────────────
  output += `\n-- ============================================================\n`;
  output += `-- PART 3: DATA\n`;
  output += `-- ============================================================\n\n`;

  // Tables in dependency order
  const tables = [
    'categories',
    'products',
    'product_variants',
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
    console.log(`  Fetching ${table}...`);
    const rows = await fetchAll(table);
    output += rowsToInsertSQL(table, rows);
    console.log(`  ✓ ${table}: ${rows.length} rows`);
  }

  // ── PART 4: Admin user note ─────────────────────────────────
  output += `\n-- ============================================================\n`;
  output += `-- PART 4: NOTES\n`;
  output += `-- ============================================================\n`;
  output += `-- Auth users (sscck@gmail.com etc.) must be re-created manually\n`;
  output += `-- via Supabase Authentication dashboard or re-registered in app.\n`;
  output += `-- After creating admin user, run:\n`;
  output += `-- INSERT INTO public.user_roles (user_id, role)\n`;
  output += `--   SELECT id, 'admin' FROM auth.users WHERE email = 'sscck@gmail.com'\n`;
  output += `--   ON CONFLICT DO NOTHING;\n`;

  // Write to file
  const outFile = 'scripts/full-migration.sql';
  writeFileSync(outFile, output, 'utf8');
  console.log(`\n✅ Migration SQL written to: ${outFile}`);
  console.log(`   File size: ${(output.length / 1024).toFixed(1)} KB`);
  console.log(`   Lines: ${output.split('\n').length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
