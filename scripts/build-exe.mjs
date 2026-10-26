// Builds a single standalone GuyScout.exe (Windows x64) with Node's Single Executable Applications.
// Everything is inside the exe: the Node runtime, the bundled server, the built web UI, and the native
// koffi memory-reading module. At first launch the exe extracts the UI + koffi to a temp folder (because a
// native .node and express.static both need real files on disk), then starts the local server and opens the
// browser. The user needs nothing installed.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import esbuild from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'exe');
const DIST_EXE = path.join(ROOT, 'dist-exe');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const require = createRequire(import.meta.url);

const log = (m) => console.log(`[build-exe] ${m}`);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DIST_EXE, { recursive: true });

// 1) Build the web UI if missing.
const WEB_DIST = path.join(ROOT, 'web', 'dist');
if (!fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
  log('building web UI (vite)…');
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
}

// 2) Collect the payload: the built UI, plus the koffi package and its Windows x64 native binary.
function walk(dir, baseRel) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.posix.join(baseRel, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push({ rel, full });
  }
  return out;
}
const koffiDir = path.join(ROOT, 'node_modules', 'koffi');
const koffiNativeDir = path.join(ROOT, 'node_modules', '@koromix', 'koffi-win32-x64');
if (!fs.existsSync(path.join(koffiNativeDir, 'win32_x64', 'koffi.node'))) {
  throw new Error(`koffi Windows native binary not found at ${koffiNativeDir}. Run "npm install" on Windows first.`);
}
const files = [
  ...walk(WEB_DIST, 'web/dist'),
  ...walk(koffiDir, 'node_modules/koffi'),
  ...walk(koffiNativeDir, 'node_modules/@koromix/koffi-win32-x64'),
];
log(`payload: ${files.length} files`);

// 3) Pack the payload into one blob: [u32 manifestLen][manifest JSON][file bytes…].
const manifest = [];
const chunks = [];
for (const f of files) {
  const buf = fs.readFileSync(f.full);
  manifest.push([f.rel, buf.length]);
  chunks.push(buf);
}
const manifestJson = Buffer.from(JSON.stringify(manifest), 'utf8');
const header = Buffer.alloc(4);
header.writeUInt32LE(manifestJson.length, 0);
const payload = Buffer.concat([header, manifestJson, ...chunks]);
const payloadPath = path.join(OUT, 'payload.bin');
fs.writeFileSync(payloadPath, payload);
log(`payload.bin: ${(payload.length / 1e6).toFixed(1)} MB`);
// Cache key based on content, so a rebuilt exe always re-extracts (even at the same version).
const payloadHash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12);

// 4) The banner runs before any bundled code: extract the payload, set env, make require('koffi') resolve to temp.
const banner = `(() => {
  const sea = require('node:sea');
  if (!sea.isSea || !sea.isSea()) return;
  const fs = require('fs'), path = require('path'), os = require('os');
  const RUNTIME = path.join(os.tmpdir(), 'GuyScout-runtime-${VERSION}-${payloadHash}');
  const marker = path.join(RUNTIME, '.extracted');
  if (!fs.existsSync(marker)) {
    const buf = Buffer.from(sea.getAsset('payload'));
    const mlen = buf.readUInt32LE(0);
    const manifest = JSON.parse(buf.toString('utf8', 4, 4 + mlen));
    let off = 4 + mlen;
    for (const [rel, size] of manifest) {
      const dest = path.join(RUNTIME, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf.subarray(off, off + size));
      off += size;
    }
    fs.writeFileSync(marker, '1');
  }
  process.env.GUYSCOUT_EXE = '1';
  process.env.GUYSCOUT_RUNTIME = RUNTIME;
  process.env.GUYSCOUT_DIST_DIR = path.join(RUNTIME, 'web', 'dist');
  if (!process.env.GUYSCOUT_DATA_DIR) process.env.GUYSCOUT_DATA_DIR = path.join(path.dirname(process.execPath), 'GuyScout-data');
})();
`;

// koffi is a native module, so it can't live inside the SEA blob; alias every import of it to this shim,
// which loads the real koffi that the banner extracted to the temp runtime folder (via a full createRequire,
// since SEA's own require only knows built-in modules).
const koffiShim = path.join(OUT, 'koffi-shim.cjs');
fs.writeFileSync(koffiShim, `const { createRequire } = require('module');
const path = require('path');
const runtime = process.env.GUYSCOUT_RUNTIME;
module.exports = createRequire(__filename)(path.join(runtime, 'node_modules', 'koffi', 'index.cjs'));
`);

// 5) Bundle the server (koffi stays external — it's loaded from the extracted temp copy at runtime).
const bundlePath = path.join(OUT, 'guyscout.cjs');
log('bundling server with esbuild…');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: bundlePath,
  alias: { koffi: koffiShim },
  banner: { js: banner },
  logLevel: 'info',
  define: { 'import.meta.dirname': '__dirname', 'import.meta.url': '__filename' },
});

// 6) Make the SEA blob.
const seaConfig = {
  main: bundlePath,
  output: path.join(OUT, 'guyscout.blob'),
  disableExperimentalSEAWarning: true,
  assets: { payload: payloadPath },
};
const seaConfigPath = path.join(OUT, 'sea-config.json');
fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2));
log('generating SEA blob…');
execFileSync(process.execPath, ['--experimental-sea-config', seaConfigPath], { stdio: 'inherit' });

// 7) Copy node.exe to GuyScout.exe and inject the blob.
const exePath = path.join(DIST_EXE, 'GuyScout.exe');
fs.copyFileSync(process.execPath, exePath);
const FUSE = 'fce680ab2cc467b6e072b8b5df1996b2';
log('injecting blob with postject…');
execFileSync(process.execPath, [
  require.resolve('postject/dist/cli.js'),
  exePath, 'NODE_SEA_BLOB', seaConfig.output,
  '--sentinel-fuse', `NODE_SEA_FUSE_${FUSE}`,
], { stdio: 'inherit' });

const mb = (fs.statSync(exePath).size / 1e6).toFixed(0);
log(`done → ${exePath} (${mb} MB)`);
