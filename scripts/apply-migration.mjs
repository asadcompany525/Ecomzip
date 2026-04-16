/**
 * Run this script once to apply all pending migrations to Supabase.
 * Usage: node scripts/apply-migration.mjs
 *
 * NOTE: This requires SUPABASE_SERVICE_ROLE_KEY in your environment.
 * Paste the SQL from supabase/migrations/20260416000001_contact_rls_developer_fixes.sql
 * directly in your Supabase Dashboard → SQL Editor if you don't have the service role key.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL not found in environment');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not found.');
  console.warn('   Please run the SQL manually in Supabase Dashboard → SQL Editor:');
  console.warn('   File: supabase/migrations/20260416000001_contact_rls_developer_fixes.sql');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sqlFile = join(__dirname, '../supabase/migrations/20260416000001_contact_rls_developer_fixes.sql');
const sql = readFileSync(sqlFile, 'utf8');

console.log('📦 Applying migration: 20260416000001_contact_rls_developer_fixes.sql');

const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: { message: 'exec_sql not available' } }));

if (error) {
  console.warn('⚠️  Could not apply via RPC. Please apply manually in Supabase Dashboard → SQL Editor.');
  console.log('\n--- SQL to apply ---\n');
  console.log(sql);
} else {
  console.log('✅ Migration applied successfully!');
}
