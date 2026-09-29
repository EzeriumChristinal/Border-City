// Screenshots: 4 themes x light/dark -> out/*.png + compare sheets.
// Needs a Chromium binary (default /opt/helium/helium, else HELIUM_BIN).
// Usage: npm run screenshots
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const HELIUM = process.env.HELIUM_BIN || '/opt/helium/helium';
const cssURL = (rel) => pathToFileURL(join(HERE, rel)).href;
const THEMES = {
  base: [cssURL('../theme.css')],
  fluent: [cssURL('../../border-city-fluent/theme.css')],
  material: [cssURL('../../border-city-material/theme.css')],
  liquid: [cssURL('../../border-city-liquid/theme.css')],
};
const MODES = ['theme-light', 'theme-dark'];

if (!existsSync(HELIUM)) throw new Error('no Chromium binary at ' + HELIUM + ' (set HELIUM_BIN)');
for (const rel of ['../theme.css', '../../border-city-fluent/theme.css', '../../border-city-material/theme.css', '../../border-city-liquid/theme.css'])
  if (!existsSync(join(HERE, rel))) throw new Error('missing ' + rel + ': run npm run build first');

// Crashpad writes under XDG_CONFIG_HOME; on locked-down hosts the default
// (~/.config) is read-only and the run dies before the screenshot. Point it at
// a writable dir unless the caller already chose one; fall back into out/ when
// the temp dir itself is read-only.
mkdirSync(OUT, { recursive: true });
const profile = (() => {
  for (const p of [join(tmpdir(), 'helium-shots'), join(OUT, '_helium-profile')]) {
    try { mkdirSync(p, { recursive: true }); return p; } catch { /* try next */ }
  }
  throw new Error('no writable profile dir for the screenshot run');
})();
const env = process.env.XDG_CONFIG_HOME ? process.env : { ...process.env, XDG_CONFIG_HOME: profile };

const fixture = readFileSync(join(HERE, 'fixture.html'), 'utf8');
for (const [theme, css] of Object.entries(THEMES)) {
  for (const mode of MODES) {
    // Variant theme.css files are standalone (base + layer); mode flips body class.
    const links = css.map((u) => `<link rel="stylesheet" href="${u}">`).join('\n');
    const html = fixture
      .replace('<link id="t" rel="stylesheet" href="../theme.css">', links)
      .replace('<body class="theme-light">', `<body class="${mode}">`);
    const page = join(OUT, `_fixture.${theme}.${mode}.html`);
    const shot = join(OUT, `${theme}.${mode}.png`);
    writeFileSync(page, html);
    try {
      const r = spawnSync(HELIUM, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--user-data-dir=' + profile,
        `--screenshot=${shot}`, '--window-size=1280,3400', pathToFileURL(page).href],
        { encoding: 'utf8', env });
      if (r.status !== 0) throw new Error('helium failed: ' + String(r.stderr || r.error || '').trim().slice(-400));
    } finally {
      rmSync(page, { force: true });
    }
    console.log('shot ' + theme + ' ' + mode);
  }
}

// Contact sheets: one html per mode, 4-up img grid.
for (const mode of MODES) {
  const imgs = Object.keys(THEMES)
    .map((t) => `<figure><figcaption>${t}</figcaption><img src="./${t}.${mode}.png"></figure>`)
    .join('\n');
  writeFileSync(join(OUT, `compare-${mode}.html`),
    `<!doctype html><meta charset="utf-8"><title>${mode}</title><style>body{background:#888;font:14px system-ui}figure{margin:0}img{width:100%}main{display:grid;grid-template-columns:1fr 1fr;gap:8px}</style><h1>${mode}</h1><main>${imgs}</main>\n`);
}
console.log('SHOTS OK');
