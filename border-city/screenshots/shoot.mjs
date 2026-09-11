// Screenshots: 4 themes x light/dark -> out/*.png + compare sheets.
// Needs a Chromium binary (default /opt/helium/helium, else HELIUM_BIN).
// Usage: npm run screenshots
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const fixture = readFileSync(join(HERE, 'fixture.html'), 'utf8');
mkdirSync(OUT, { recursive: true });
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
    const r = spawnSync(HELIUM, ['--headless', '--no-sandbox', '--disable-gpu',
      '--user-data-dir=' + join(tmpdir(), 'helium-shots'),
      `--screenshot=${shot}`, '--window-size=1280,3400', pathToFileURL(page).href],
      { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('helium failed: ' + String(r.stderr).slice(0, 500));
    rmSync(page);
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
