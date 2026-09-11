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
{ // view header: drop FAB hacks (translate/order/hidden last-child stacked
  // every view-action into one floating spot). Plain header row instead.
  const p = join(SRC, '30_interface/_fab-and-header.scss');
  const lines = readFileSync(p, 'utf8').split('\n');
  if (!lines[47].includes('Floating action button')) die('fab block moved: line 48 is not FAB header: ' + lines[47].slice(0, 80));
  const last = [...lines].reverse().find((l) => l.trim() !== '');
  if (last !== '}') die('fab file end moved: ' + String(last).slice(0, 80));
  const head = lines.slice(0, 47).join('\n');
  writeFileSync(p, head + '\n' + [
    '// Border City: plain view-actions row (FAB transforms removed).',
    'body:not(.is-mobile) .workspace-leaf-content[data-type="markdown"] .view-actions {',
    '  column-gap: 2px;',
    '  padding: 0;',
    '  margin: 0;',
    '  transform: none;',
    '}',
    '',
  ].join('\n'));
}
const USES = KEEP_FILES.map((f) => `@use "${f.replace(/\.scss$/, '')}";`);
// settings-panel styling slots between titlebar and modals, as before
USES.splice(USES.indexOf('@use "30_interface/_titlebar";') + 1, 0, '@use "30_interface/_style-settings";');
writeFileSync(join(SRC, 'theme.scss'), USES.join('\n') + '\n');
console.log('patched + entry written');
// ---- pruned Velocity settings: drop entries for removed features ----
const splitBlocks = (lines, isBoundary) => {
  const header = []; const blocks = []; let cur = null;
  for (const ln of lines) {
    if (isBoundary(ln)) { if (cur) blocks.push(cur); cur = [ln]; }
    else if (cur) cur.push(ln); else header.push(ln);
  }
  if (cur) blocks.push(cur);
  return [header, blocks];
};
const DROP_IDS = ['ss-section-news', 'enable-special-text', 'enable-special-code',
  'override-default-font', 'disable-list-styling', 'disable-callout-styling', 'restore-table-scroll',
  'restore-indent-guide', 'disable-naked-embeds', 'disable-title-h1', 'active-line-highlight',
  'hide-bases-header', 'enable-dim-img', 'line-height-normal'];
const raw = readFileSync(join(VELO, 'src/style-settings.css'), 'utf8').split('\n');
// col-0 only: tab-indented option dashes stay in-block
const [vheader, vblocks] = splitBlocks(raw, (ln) => ln === '-');
const kept = []; const droppedNames = [];
for (const b of vblocks) {
  const m = b.map((l) => l.match(/id:\s*(\S+)/)).find(Boolean);
  const id = m ? m[1] : '(none)';
  if (DROP_IDS.includes(id)) droppedNames.push(id); else kept.push(b);
}
const veloSettings = vheader.concat(kept.flat()).join('\n');
writeFileSync(join(DIST, 'velocity-settings.css'), veloSettings);
console.log('velocity settings: kept ' + kept.length + ', dropped: ' + droppedNames.join(','));
// ---- Border slices (marker-anchored; build fails if upstream renames a marker) ----
const ball = readFileSync(join(BORDER, 'theme.css'), 'utf8').split('\n');
const take = (ranges) => ranges.flatMap((r) => ball.slice(r[0] - 1, r[1])).join('\n');
const findLine = (pred, what) => { // unique 1-based hit; build fails otherwise
  const hits = [];
  ball.forEach((l, i) => { if (pred(l)) hits.push(i + 1); });
  if (hits.length !== 1) die('border marker [' + what + ']: ' + hits.length + ' hits');
  return hits[0];
};
const at = (marker, what) => findLine((l) => l.includes(marker), marker + ' for ' + what);
const namedLine = (name) => findLine((l) => l.trim() === 'name: ' + name, 'settings block ' + name);
const blockStart = (nameLine) => { // walk back to enclosing /* @settings
  let i = nameLine;
  while (i > 1 && !ball[i - 2].includes('/* @settings')) i--;
  if (i <= 1) die('no @settings above line ' + nameLine);
  return i;
};
const headEnd = ball.findIndex((l) => l.trim() === '*/') + 1; // Theme Info settings header
if (ball[0].includes('@settings') === false || headEnd < 2) die('border settings header not found');
const edStart = blockStart(namedLine('Editor')), edEnd = blockStart(namedLine('Mobile')) - 1; // Editor block, stops before Mobile
const titleAt = at('/* ====== title style ====== */', 'titles/links/tags');
const emphAt = at('/* ====== line emphasis ====== */', 'highlight/hover-indicator (dropped)');
const boldAt = at('/* ====== Bold ====== */', 'bold/checkboxes');
const altAt = at('/* Alternate Checkboxes */', 'alt checkboxes (dropped)');
let imgEnd = at('/* ====== pdf ====== */', 'pdf/icon (dropped)') - 1;
while (ball[imgEnd - 1].trim() === '') imgEnd--; // trailing blanks: end on img-darken rules, not pdf header
if (ball[imgEnd - 1] !== '}') die('border images slice end not a rule close: line ' + imgEnd);
const borderSettingsRaw = take([[1, headEnd], [edStart, edEnd]]); // settings header + Editor settings block
const borderCss = take([[at('/* Paragraphs */', 'paragraphs/line-height'), titleAt - 1],
  [titleAt, emphAt - 1],
  [boldAt, altAt - 1],
  [at('/* ====== Callout ====== */', 'callouts/quotes/tables/images'), imgEnd]]);
// ---- Border settings prune: toggles with no CSS behind kept slices ----
const BORDER_DROP_IDS = ['line-emphasis', 'line-hover-indicator-info', 'line-hover-indicator',
  'focus-indicator-list-level', 'focus-indicator-codeblock-line-number', 'hover-indicator-color',
  'border-focus-mode-heading', 'border-focus-mode-info', 'border-focus-mode',
  'line-active-bg', 'line-normal-opacity', 'Editor-background-pattern',
  'editor-grid-background-pattren', 'grid-background-pattern-color', 'grid-background-pattern-size',
  'disable-alternative-checkboxes']; // alt-checkbox CSS dropped, kept base rules never read the class
const blines = borderSettingsRaw.split('\n');
// header runs through Editor `settings:`
const bstart = blines.findLastIndex((ln) => ln.trim() === 'settings:') + 1;
const [bheader, bblocks] = splitBlocks(blines.slice(bstart), (ln) => /^\s*-\s*$/.test(ln));
bheader.unshift(...blines.slice(0, bstart));
const bkept = []; const bdropped = [];
for (const b of bblocks) {
  const ids = b.map((l) => (l.match(/id:\s*(\S+)/) || [])[1]).filter(Boolean);
  if (ids.length !== 1) die('border settings block with ' + ids.length + ' ids: ' + ids.join(','));
  if (BORDER_DROP_IDS.includes(ids[0])) bdropped.push(ids[0]); else bkept.push(b);
}
for (const id of BORDER_DROP_IDS) if (!bdropped.includes(id)) die('border setting not found: ' + id);
const borderSettings = bheader.concat(bkept.flat()).join('\n');
console.log('border settings: kept ' + bkept.length + ', dropped: ' + bdropped.join(','));
writeFileSync(join(DIST, 'border-markdown.css'), borderCss);
writeFileSync(join(DIST, 'border-settings.css'), borderSettings);
console.log('border settings lines: ' + borderSettings.split('\n').length + ', css lines: ' + borderCss.split('\n').length);
// ---- bridge: vars Border-keep needs that neither chrome nor Obsidian guarantees ----
const bridge = ['/* Border City bridge */', ':root {', '  --divider-color: var(--background-modifier-border);', '  --background-modifier-border-hover: color-mix(in srgb, var(--color-accent-1) 30%, transparent);', '  /* Dense slider: knob fills bar (Velocity tunes macOS only, Linux left 12px knob in 20px track) */', '  --slider-track-height: 16px;', '  --slider-thumb-height: 16px;', '  --slider-thumb-width: 16px;', '  --slider-thumb-y: 0px;', '}'].join('\n');
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
const clean = (chrome + '\n' + bridge + '\n' + borderCss).replace(/\/\*[\s\S]*?\*\//g, ' ');
const used = new Set([...clean.matchAll(/var\(\s*(--[A-Za-z0-9-_]+)/g)].map((m) => m[1]));
const defined = new Set([...clean.matchAll(/(--[A-Za-z0-9-_]+)\s*:/g)].map((m) => m[1]));
const droppedVars = new Set([...readFileSync(join(BORDER, 'theme.css'), 'utf8').matchAll(/(--[A-Za-z0-9-_]+):/g)].map((m) => m[1]));
const missing = [...used].filter((v) => !defined.has(v)).sort();
// Snapshot: every MISSING verified as Obsidian builtin or var upstream Velocity
// itself never defines (its theme.css lacks them too). New MISSING tied to a
// dropped region = bridge it in dist/bridge.css or drop the rule using it.
const KNOWN_MISSING = ['--anim-duration-moderate', '--anim-motion-delay', '--anim-motion-smooth',
  '--anim-motion-swing', '--blur-m', '--blur-s', '--color-accent', '--color-accent-5',
  '--dropdown-background-hover', '--font-interface', '--font-smaller', '--font-smallest',
  '--font-text-size', '--font-ui-large', '--icon-l', '--icon-m', '--icon-s',
  '--icon-s-stroke-width', '--interactive-accent-hsl', '--list-marker-color-collapsed',
  '--list-marker-color-hover', '--nav-item-background-selected', '--p-spacing',
  '--safe-area-inset-bottom', '--size-4-3', '--size-4-6', '--status-bar-border-color',
  '--text-accent-hover', '--text-color', '--text-on-accent', '--text-success',
  '--touch-radius-l', '--touch-radius-s', '--touch-radius-xs', '--touch-radius-xxs',
  '--touch-size-l', '--touch-size-xxs'];
console.log('border vars used: ' + used.size + ', missing: ' + missing.length);
for (const v of missing) console.log('  MISSING ' + v + (droppedVars.has(v) ? ' (also in dropped border region)' : ' (builtin?)'));
const unknown = missing.filter((v) => !KNOWN_MISSING.includes(v));
if (unknown.length) die('new MISSING vars, bridge/drop/allowlist: ' + unknown.join(', '));
const stale = KNOWN_MISSING.filter((v) => !missing.includes(v));
if (stale.length) console.log('var check: resolved since snapshot: ' + stale.join(','));
// ---- assemble ----
const themeOut = ['/* Border City: Velocity chrome + Border markdown. Built by build.mjs. */', chrome, bridge, borderCss, veloSettings, borderSettings].join('\n');
const open = (themeOut.match(/\{/g) || []).length;
const close = (themeOut.match(/\}/g) || []).length;
if (open !== close) die('brace imbalance ' + open + ' vs ' + close);
writeFileSync(join(OUT, 'theme.css'), themeOut);
console.log('theme.css bytes: ' + themeOut.length + ', braces: ' + open);
// ---- variants: separate installable themes, base + one token layer ----
// Full copies required: Obsidian lists one theme per folder, so each variant
// ships its own theme.css (base + ~2KB layer). Layers stay minimal instead.
const VARIANTS = [
  { name: 'fluent', themeName: 'Border City - Fluent', src: 'variants/fluent.css' },
  { name: 'material', themeName: 'Border City - Material', src: 'variants/material.css' },
  { name: 'liquid', themeName: 'Border City - Liquid', src: 'variants/liquid.css' },
];
const baseManifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
for (const v of VARIANTS) {
  rmSync(join(OUT, 'variants', v.name), { recursive: true, force: true }); // stale nested outputs; sources are the .css files above them
  const layer = readFileSync(join(OUT, v.src), 'utf8');
  const variantOut = [themeOut, '/* Variant: ' + v.name + ' (web-component token layer) */', layer].join('\n');
  const vo = (variantOut.match(/\{/g) || []).length;
  const vc = (variantOut.match(/\}/g) || []).length;
  if (vo !== vc) die('variant ' + v.name + ' brace imbalance ' + vo + ' vs ' + vc);
  const vdir = join(ROOT, 'border-city-' + v.name); // sibling theme dir: shows as its own theme
  mkdirSync(vdir, { recursive: true });
  writeFileSync(join(vdir, 'theme.css'), variantOut);
  writeFileSync(join(vdir, 'manifest.json'), JSON.stringify({ ...baseManifest, name: v.themeName }, null, 2) + '\n');
  console.log('variant ' + v.name + ' bytes: ' + variantOut.length);
}
console.log('BUILD OK');