import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] || 'all';
const dir = path.dirname(fileURLToPath(import.meta.url));

if (!['api', 'mini', 'all'].includes(target)) {
  console.error('Usage: node scripts/kill-dev.mjs [api|mini|all]');
  process.exit(1);
}

if (platform() === 'win32') {
  execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(dir, 'kill-dev.ps1'), target],
    { stdio: 'inherit' },
  );
} else {
  execFileSync('bash', [path.join(dir, 'kill-dev.sh'), target], { stdio: 'inherit' });
}

console.log(`[kill-dev] stopped previous ${target} process(es)`);
