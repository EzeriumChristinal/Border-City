// Border City build: Velocity chrome (SCSS) + Border markdown (CSS).
// Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const ROOT = join(OUT, '..');
const VELO = join(ROOT, 'obsidian-velocity-master');
const BORDER = join(ROOT, 'obsidian-border-main');
const SRC = join(OUT, 'src');
const DIST = join(OUT, 'dist');
const die = (m) => { console.error('FAIL: ' + m); process.exit(1); };
console.log('roots ok: ' + existsSync(VELO) + ' ' + existsSync(BORDER));
mkdirSync(DIST, { recursive: true });
// ---- filtered Velocity source tree ----
const KEEP_FILES = [
'00_elements/__root.scss',
'00_elements/_base.scss',
'00_elements/_custom-icons.scss',
'10_colors/_dark-colors.scss',
'10_colors/_dark-extra-colors.scss',
'10_colors/_light-colors.scss',
'10_colors/_light-extra-colors.scss',
'30_interface/__interface.scss',
'30_interface/_clickable-icons.scss',
'30_interface/_document-search.scss',
'30_interface/_empty-state.scss',
'30_interface/_fab-and-header.scss',
'30_interface/_file-tree.scss',
'30_interface/_layout.scss',
'30_interface/_nav-header.scss',
'30_interface/_sidebar-content.scss',
'30_interface/_status-bar.scss',
'30_interface/_tabs.scss',
'30_interface/_titlebar.scss',
'40_modals/__modals.scss',
'40_modals/_community-modal.scss',
'40_modals/_confirmation-modal.scss',
'40_modals/_menu.scss',
'40_modals/_prompt.scss',
'50_mobile/__mobile.scss',
];
rmSync(SRC, { recursive: true, force: true });
mkdirSync(SRC, { recursive: true });
for (const f of KEEP_FILES) {
  mkdirSync(join(SRC, dirname(f)), { recursive: true });
  cpSync(join(VELO, 'src', f), join(SRC, f));
}
cpSync(join(VELO, 'src/60_integrations/_style-settings.scss'), join(SRC, '30_interface/_style-settings.scss'));
console.log('copied ' + (KEEP_FILES.length + 1) + ' scss files');
// ---- patches: assert first line, delete ranges bottom-up ----
const delLines = (lines, ranges, what) => {
  for (const r of [...ranges].sort((a, b) => b[0] - a[0])) {
    if (r[0] < 1 || r[1] > lines.length || r[0] > r[1]) die(what + ': bad range ' + r[0] + '-' + r[1]);
    lines.splice(r[0] - 1, r[1] - r[0] + 1);
  }
  return lines;
};
const patch = (rel, ranges, checks) => {
  const p = join(SRC, rel);
  const lines = readFileSync(p, 'utf8').split('\n');
  for (const c of checks)
    if (!lines[c[0] - 1].includes(c[1])) die(rel + ' line ' + c[0] + ' is not [' + c[1] + ']: ' + lines[c[0] - 1].slice(0, 80));
  writeFileSync(p, delLines(lines, ranges, rel).join('\n'));
};
patch('00_elements/__root.scss',
  [[405, 406], [402, 403], [401, 401], [399, 400], [326, 327], [311, 312], [179, 180],
   [128, 129], [85, 86], [79, 80], [61, 62], [56, 57], [19, 40]],
  [[19, '// Bases'], [56, '// Buttons'], [401, '// Extra theme layout'], [406, '--news-display']]);
patch('00_elements/_base.scss', [[301, 307], [99, 104], [24, 27]],
  [[24, 'override-default-font'], [99, '// Windows'], [303, 'restore-indent-guide']]);
patch('50_mobile/__mobile.scss', [[96, 96]], [[96, 'view-top-spacing-markdown']]);
patch('30_interface/_document-search.scss', [[56, 57]], [[56, '.markdown-rendered .search-highlight']]);
{ // settings-panel css: drop news rules (promo setting removed)
  const p = join(SRC, '30_interface/_style-settings.scss');
  const lines = readFileSync(p, 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('.style-settings-info-text[data-id=')); 
  const e = lines.findIndex((l) => l.includes('body.ss-section-news'));
  if (s < 0 || e < 0 || e - s > 25) die('news css block not found');
  writeFileSync(p, delLines(lines, [[s + 1, e + 3]], 'news').join('\n'));
}
writeFileSync(join(SRC, 'theme.scss'), [
'@use "00_elements/__root";', '@use "00_elements/_base";', '@use "00_elements/_custom-icons";', '',
'@use "10_colors/_dark-colors";', '@use "10_colors/_dark-extra-colors";',
'@use "10_colors/_light-colors";', '@use "10_colors/_light-extra-colors";', '',
'@use "30_interface/__interface";', '@use "30_interface/_clickable-icons";',
'@use "30_interface/_document-search";', '@use "30_interface/_empty-state";',
'@use "30_interface/_fab-and-header";', '@use "30_interface/_file-tree";',
'@use "30_interface/_layout";', '@use "30_interface/_nav-header";',
'@use "30_interface/_sidebar-content";', '@use "30_interface/_status-bar";',
'@use "30_interface/_tabs";', '@use "30_interface/_titlebar";',
'@use "30_interface/_style-settings";', '',
'@use "40_modals/__modals";', '@use "40_modals/_community-modal";',
'@use "40_modals/_confirmation-modal";', '@use "40_modals/_menu";', '@use "40_modals/_prompt";', '',
'@use "50_mobile/__mobile";', '',
].join('\n'));
console.log('patched + entry written');
// ---- pruned Velocity settings: drop entries for removed features ----
const DROP_IDS = ['ss-section-news', 'enable-special-text', 'enable-special-code',
  'override-default-font', 'disable-list-styling', 'disable-callout-styling', 'restore-table-scroll',
  'restore-indent-guide', 'disable-naked-embeds', 'disable-title-h1', 'active-line-highlight',
  'hide-bases-header', 'enable-dim-img', 'line-height-normal'];
const raw = readFileSync(join(VELO, 'src/style-settings.css'), 'utf8').split('\n');
const header = []; const blocks = []; let cur = null;
for (const ln of raw) {
  if (ln.trim() === '-') { if (cur) blocks.push(cur); cur = [ln]; }
  else if (cur) cur.push(ln); else header.push(ln);
}
if (cur) blocks.push(cur);
const kept = []; const droppedNames = [];
for (const b of blocks) {
  const m = b.map((l) => l.match(/id:\s*(\S+)/)).find(Boolean);
  const id = m ? m[1] : '(none)';
  if (DROP_IDS.includes(id)) droppedNames.push(id); else kept.push(b);
}
const veloSettings = header.concat(kept.flat()).join('\n');
writeFileSync(join(DIST, 'velocity-settings.css'), veloSettings);
console.log('velocity settings: kept ' + kept.length + ', dropped: ' + droppedNames.join(','));
// ---- Border slices ----
const ball = readFileSync(join(BORDER, 'theme.css'), 'utf8').split('\n');
const take = (ranges) => ranges.flatMap((r) => ball.slice(r[0] - 1, r[1])).join('\n');
const borderSettings = take([[1, 12], [2230, 3605]]);
const borderCss = take([[6898, 6929], [6930, 7626], [7805, 7958], [8202, 8663]]);
writeFileSync(join(DIST, 'border-markdown.css'), borderCss);
writeFileSync(join(DIST, 'border-settings.css'), borderSettings);
console.log('border settings lines: ' + borderSettings.split('\n').length + ', css lines: ' + borderCss.split('\n').length);
// ---- bridge: vars Border-keep needs that neither chrome nor Obsidian guarantees ----
const bridge = ['/* Border City bridge */', ':root {', '  --divider-color: var(--background-modifier-border);', '  --background-modifier-border-hover: color-mix(in srgb, var(--color-accent-1) 30%, transparent);', '}'].join('\n');
writeFileSync(join(DIST, 'bridge.css'), bridge + '\n');
// ---- compile chrome ----
const cands = [join(ROOT, '.build-cache/node_modules/.bin/sass'), join(OUT, 'node_modules/.bin/sass'), 'sass'];
let bin = null;
for (const c of cands) { try { if (spawnSync(c, ['--version'], { encoding: 'utf8' }).status === 0) { bin = c; break; } } catch (e) { /* next */ } }
if (!bin) die('no sass binary');
const r = spawnSync(bin, [join(SRC, 'theme.scss'), join(DIST, 'chrome.css'), '--style=compressed', '--no-source-map'], { encoding: 'utf8' });
if (r.status !== 0) die('sass failed: ' + String(r.stderr).slice(0, 1500));
const chrome = readFileSync(join(DIST, 'chrome.css'), 'utf8');
console.log('chrome bytes: ' + chrome.length);
// ---- var check ----
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const clean = noComments(chrome + '\n' + bridge + '\n' + borderCss);
const used = new Set(); let m1 = null;
const reU = /var\(\s*(--[A-Za-z0-9-_]+)/g;
while ((m1 = reU.exec(clean)) !== null) used.add(m1[1]);
const defined = new Set(); let m2 = null;
const reD = /(--[A-Za-z0-9-_]+)\s*:/g;
while ((m2 = reD.exec(clean)) !== null) defined.add(m2[1]);
const fullBorder = readFileSync(join(BORDER, 'theme.css'), 'utf8');
const missing = [...used].filter((v) => !defined.has(v)).sort();
console.log('border vars used: ' + used.size + ', missing: ' + missing.length);
for (const v of missing) console.log('  MISSING ' + v + (fullBorder.includes(v + ':') ? ' (in dropped border region)' : ' (builtin?)'));
// ---- assemble ----
const themeOut = ['/* Border City: Velocity chrome + Border markdown. Built by build.mjs. */', chrome, bridge, borderCss, veloSettings, borderSettings].join('\n');
const open = (themeOut.match(/\{/g) || []).length;
const close = (themeOut.match(/\}/g) || []).length;
if (open !== close) die('brace imbalance ' + open + ' vs ' + close);
writeFileSync(join(OUT, 'theme.css'), themeOut);
console.log('theme.css bytes: ' + themeOut.length + ', braces: ' + open);
console.log('BUILD OK');