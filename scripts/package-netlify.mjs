import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const root = process.cwd();
const dist = resolve(root, 'dist');
const archive = resolve(root, 'netlify-upload.zip');

run('npm', ['run', 'build:netlify'], { cwd: root });

if (!existsSync(resolve(dist, 'index.html')) || !existsSync(resolve(dist, '_redirects'))) {
  throw new Error('Build output is missing index.html or the SPA route redirects.');
}

rmSync(archive, { force: true });
run('zip', ['-q', '-r', archive, '.'], { cwd: dist });

const listing = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
if (listing.error) throw listing.error;
if (listing.status !== 0) throw new Error('Could not inspect the generated ZIP archive.');

const entries = listing.stdout.split(/\r?\n/).filter(Boolean);
if (
  entries.some((entry) =>
    /(^|\/)\.env(?:$|\.)|(^|\/)(?:node_modules|src|supabase)(?:\/|$)/i.test(entry)
  )
) {
  rmSync(archive, { force: true });
  throw new Error('The upload ZIP unexpectedly contains source files or an env file; archive was removed.');
}

run('unzip', ['-tqq', archive]);
console.log(
  `Created ${archive} (${entries.length} files, ${(statSync(archive).size / 1024 / 1024).toFixed(2)} MB).`
);