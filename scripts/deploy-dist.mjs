/**
 * Upload the freshly built `dist/` to the VPS, replacing the old one cleanly.
 *
 * Why not plain `scp -r dist .../`: scp only ADDS files, so every deploy left
 * the previous build's content-hashed chunks behind — `dist/assets/` grew
 * without bound (hundreds of orphaned index-*.js / *.css). rsync --delete would
 * fix that, but rsync isn't installed on the (Windows) dev machine.
 *
 * Instead we upload into a staging dir and swap it in atomically on the server,
 * which prunes stale chunks every deploy with only ssh + scp:
 *   1. scp dist  → dist.new   (fresh, complete copy)
 *   2. mv dist → dist.old, mv dist.new → dist   (near-instant rename swap)
 *   3. rm dist.old
 *
 * Commands run via execFileSync with an argv array (no local shell), so the
 * remote command string is passed verbatim to the server's shell — no cmd.exe /
 * PowerShell / bash quoting differences to worry about.
 */
import { execFileSync } from 'node:child_process';

const HOST = 'root@185.202.172.59';
const BASE = '/var/www/hs-muebles';

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

// 1. Clean staging dir, then upload the fresh build into it.
run('ssh', [HOST, `rm -rf ${BASE}/dist.new`]);
run('scp', ['-r', 'dist', `${HOST}:${BASE}/dist.new`]);

// 2. Atomic-ish swap: old build aside, new build live, drop the old one.
run('ssh', [
  HOST,
  `rm -rf ${BASE}/dist.old && ` +
    `mv ${BASE}/dist ${BASE}/dist.old && ` +
    `mv ${BASE}/dist.new ${BASE}/dist && ` +
    `rm -rf ${BASE}/dist.old`,
]);

console.log('✅ dist deployed — stale chunks pruned');
