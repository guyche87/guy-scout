// Builds GuyScout-Lite.exe: a small bootstrapper (~a few MB) that downloads the Node runtime once and
// runs the embedded Guy Scout app. Needs no external tools — it uses the C# compiler and PowerShell that
// ship with Windows. The heavy Node runtime (~28 MB compressed) is fetched from nodejs.org on first launch.
import { execFileSync } from 'node:child_process';
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_VER = 'v20.18.1';
const NODE_SHA = '56e5aacdeee7168871721b75819ccacf2367de8761b78eaceacdecd41e04ca03'; // node-v20.18.1-win-x64.zip

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build', 'lite');
const APP = path.join(OUT, 'app');
const DIST_EXE = path.join(ROOT, 'dist-exe');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const log = (m) => console.log(`[build-lite] ${m}`);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });
fs.mkdirSync(DIST_EXE, { recursive: true });

// 1) Build the web UI if missing.
const WEB_DIST = path.join(ROOT, 'web', 'dist');
if (!fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
  log('building web UI (vite)…');
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
}

// 2) Bundle the server (koffi stays external — it lives in the app's own node_modules, loaded by the real Node).
log('bundling server…');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'server', 'index.ts')],
  bundle: true, platform: 'node', format: 'cjs', target: 'node20',
  outfile: path.join(APP, 'guyscout.cjs'),
  external: ['koffi'],
  logLevel: 'info',
  define: { 'import.meta.dirname': '__dirname', 'import.meta.url': '__filename' },
});

// 3) Assemble the app payload: bundle + built UI + koffi (package and Windows x64 native binary).
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(WEB_DIST, path.join(APP, 'web', 'dist'));
copyDir(path.join(ROOT, 'node_modules', 'koffi'), path.join(APP, 'node_modules', 'koffi'));
copyDir(path.join(ROOT, 'node_modules', '@koromix', 'koffi-win32-x64'), path.join(APP, 'node_modules', '@koromix', 'koffi-win32-x64'));

// 4) Zip the payload with PowerShell's built-in Compress-Archive.
const appZip = path.join(OUT, 'app.zip');
log('zipping app payload…');
execFileSync('powershell', ['-NoProfile', '-Command',
  `Compress-Archive -Force -CompressionLevel Optimal -Path '${APP}\\*' -DestinationPath '${appZip}'`,
], { stdio: 'inherit' });
log(`app.zip: ${(fs.statSync(appZip).size / 1e6).toFixed(1)} MB`);

// 5) Generate the C# launcher source with the pinned Node version + checksum.
const launcherCs = fs.readFileSync(path.join(ROOT, 'scripts', 'launcher.cs'), 'utf8')
  .replace('__NODE_VER__', NODE_VER)
  .replace('__NODE_SHA__', NODE_SHA)
  .replace('__APP_VER__', VERSION);
const csPath = path.join(OUT, 'GuyScoutLauncher.cs');
fs.writeFileSync(csPath, launcherCs);

// 6) Compile with the Windows-bundled C# compiler, embedding app.zip as a resource.
const csc = ['C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'].find(fs.existsSync);
if (!csc) throw new Error('C# compiler (csc.exe) not found — needs the .NET Framework (standard on Windows).');
const exePath = path.join(DIST_EXE, 'GuyScout-Lite.exe');
log('compiling launcher…');
execFileSync(csc, [
  '/nologo', '/target:exe', '/platform:x64', '/optimize+',
  `/out:${exePath}`,
  '/reference:System.IO.Compression.dll',
  '/reference:System.IO.Compression.FileSystem.dll',
  `/resource:${appZip},app.zip`,
  csPath,
], { stdio: 'inherit' });

const mb = (fs.statSync(exePath).size / 1e6).toFixed(1);
log(`done → ${exePath} (${mb} MB)  [downloads Node ${NODE_VER} on first run]`);
