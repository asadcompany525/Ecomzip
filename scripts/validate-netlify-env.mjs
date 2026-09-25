import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), '');
const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const publicKey = (
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

function fail(message) {
  console.error(`Netlify build configuration error: ${message}`);
  process.exit(1);
}

if (!supabaseUrl || !publicKey) {
  fail(
    'Set VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY before building.'
  );
}

let url;
try {
  url = new URL(supabaseUrl);
} catch {
  fail('VITE_SUPABASE_URL must be a valid HTTPS URL.');
}

if (url.protocol !== 'https:') {
  fail('VITE_SUPABASE_URL must use HTTPS for a public Netlify site.');
}

if (publicKey.startsWith('sb_secret_')) {
  fail('A Supabase secret key cannot be used in a browser build. Use the anon/publishable key.');
}

let keyProjectRef;
if (publicKey.startsWith('sb_publishable_')) {
  // Supabase publishable keys are designed to be used by browser clients.
} else {
  const parts = publicKey.split('.');
  if (parts.length !== 3) {
    fail('The Supabase key is not a recognized anon JWT or publishable key.');
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.role !== 'anon') {
      fail('The Supabase JWT must have the anon role; service-role keys must stay server-side.');
    }
    keyProjectRef = payload.ref;
  } catch (error) {
    if (error?.message?.startsWith('Netlify build configuration error:')) throw error;
    fail('The Supabase anon key could not be validated.');
  }
}

const urlProjectRef = url.hostname.endsWith('.supabase.co')
  ? url.hostname.slice(0, -'.supabase.co'.length)
  : undefined;

if (urlProjectRef && keyProjectRef && urlProjectRef !== keyProjectRef) {
  fail('VITE_SUPABASE_URL and the public key belong to different Supabase projects.');
}

console.log('Supabase Netlify configuration validated (HTTPS URL and browser-safe public key).');