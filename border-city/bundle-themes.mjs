// Bundle the built themes into drag-and-drop folders, and optionally install
// them into a vault. Obsidian resolves a theme by its folder name, so each
// folder here is already named exactly as its manifest "name".
//
// Usage:
//   node bundle-themes.mjs                     build, then refresh the drop folder
//   node bundle-themes.mjs --no-build          use the current build outputs
//   node bundle-themes.mjs --vault ~/MyVault   also copy into <vault>/.obsidian/themes/
//   node bundle-themes.mjs --vault A --vault B install into several vaults
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const ROOT = join(OUT, '..');
const BUNDLE = join(ROOT, 'border-city-themes');
// theme.css lives in border-city/ for the base theme, in sibling dirs for variants
const BUILT = [
  { src: OUT, manifest: join(OUT, 'manifest.json') },
  { src: join(ROOT, 'border-city-fluent'), manifest: join(ROOT, 'border-city-fluent/manifest.json') },
  { src: join(ROOT, 'border-city-material'), manifest: join(ROOT, 'border-city-material/manifest.json') },
  { src: join(ROOT, 'border-city-liquid'), manifest: join(ROOT, 'border-city-liquid/manifest.json') },
];

const argv = process.argv.slice(2);
const vaults = [];
let doBuild = true;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--vault') vaults.push(argv[++i]);
  else if (argv[i] === '--no-build') doBuild = false;
  else { console.error('unknown arg: ' + argv[i]); process.exit(2); }
}
if (vaults.includes(undefined)) { console.error('--vault needs a path'); process.exit(2); }

const die = (m) => { console.error('FAIL: ' + m); process.exit(1); };

if (doBuild) {
  const r = spawnSync(process.execPath, [join(OUT, 'build.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) die('build failed');
}

for (const t of BUILT) if (!existsSync(join(t.src, 'theme.css'))) die('missing ' + join(t.src, 'theme.css') + ' (run a build)');

rmSync(BUNDLE, { recursive: true, force: true });
mkdirSync(BUNDLE, { recursive: true });
const themes = [];
for (const t of BUILT) {
  const manifest = JSON.parse(readFileSync(t.manifest, 'utf8'));
  const dir = join(BUNDLE, manifest.name);
  mkdirSync(dir, { recursive: true });
  cpSync(join(t.src, 'theme.css'), join(dir, 'theme.css'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  themes.push(manifest.name);
  console.log('bundled ' + manifest.name);
}

// A vault always stores themes at <vault>/.obsidian/themes/<name>/. Accept a
// path that already points at that folder so both habits work.
for (const vault of vaults) {
  const base = basename(vault.replace(/[/\\]+$/, ''));
  const themesDir = base === 'themes' || base === '.obsidian' ? vault : join(vault, '.obsidian', 'themes');
  mkdirSync(themesDir, { recursive: true });
  for (const name of themes) {
    const dest = join(themesDir, name);
    rmSync(dest, { recursive: true, force: true });
    cpSync(join(BUNDLE, name), dest, { recursive: true });
  }
  console.log('installed ' + themes.length + ' themes into ' + themesDir);
}

console.log('\nDrop folder: ' + BUNDLE);
console.log('Drag the four folders inside it into <vault>/.obsidian/themes/, or rerun with --vault <path>.');
