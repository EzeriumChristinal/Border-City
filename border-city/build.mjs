// Border City build: Velocity chrome (SCSS) + Border markdown (CSS).
// Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
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
  const last = lines.findLast((l) => l.trim() !== '');
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
const titlebarAt = USES.indexOf('@use "30_interface/_titlebar";');
if (titlebarAt < 0) die('titlebar entry missing from USES');
USES.splice(titlebarAt + 1, 0, '@use "30_interface/_style-settings";');
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
console.log('velocity settings: kept ' + kept.length + ', dropped: ' + [...new Set(droppedNames)].join(','));
// ---- Border slices (marker-anchored; build fails if upstream renames a marker) ----
const ball = readFileSync(join(BORDER, 'theme.css'), 'utf8').split('\n');
const take = (ranges) => ranges.flatMap((r) => ball.slice(r[0] - 1, r[1])).join('\n'); // ranges 1-based inclusive
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
if (ball.slice(headEnd).find((l) => l.trim() !== '') !== '/* @settings') die('border settings header end moved');
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
// ---- polish: Border City markdown refinement (Obsidianite principles, Border City language).
// Sits after Border slices so it wins ties; overrides vars, never re-specifies
// Border's accent bars, colors, or layout. No neon, no new deps. ----
const polish = [
  '/* Border City markdown polish: var base (heading scale, emphasis weight, code contrast) + rules 1-6 */',
  'body {',
  '  --h1-size: 1.75em;',
  '  --h2-size: 1.5em;',
  '  --h3-size: 1.3em;',
  '  --h4-size: 1.15em;',
  '  --h5-size: 1.05em;',
  '  --h6-size: 1em;',
  '  --bold-weight: 700;',
  '  --code-normal: var(--text-normal);',
  '  --code-comment: var(--text-muted);',
  "  --code-border-light: 1px solid var(--background-modifier-border);",
  "  --code-border-dark: 1px solid var(--background-modifier-border);",
  "  --code-background-light: color-mix(in srgb, var(--text-muted) 9%, var(--background-primary));",
  "  --code-background-dark: color-mix(in srgb, var(--text-muted) 12%, transparent);",
  "  --inline-code-background-light: color-mix(in srgb, var(--color-pink) 10%, transparent);",
  "  --inline-code-background-dark: color-mix(in srgb, var(--color-pink) 15%, transparent);",
  '}',
  '/* 1. heading rhythm: wider scale (vars above) + breathing room + tight tracking; bars untouched */',
  '.markdown-rendered :is(h1, h2, h3, h4, h5, h6) {',
  '  letter-spacing: -0.01em;',
  '}',
  '.markdown-rendered h1 { margin-block: 1em 0.5em; }',
  '.markdown-rendered h2 { margin-block: 0.9em 0.5em; }',
  '.markdown-rendered :is(h3, h4) { margin-block: 0.8em 0.4em; }',
  '.markdown-rendered :is(h5, h6) { margin-block: 0.7em 0.4em; }',
  '.markdown-source-view.mod-cm6 .cm-content > .HyperMD-header { padding-block: 0.35em 0.25em; }',
  '/* 2. emphasis: bold weight parity, bold-italic blends both accents (Border keeps red/orange) */',
  '.markdown-rendered strong,',
  '.cm-s-obsidian span.cm-strong { font-weight: var(--bold-weight); }',
  '.markdown-rendered :is(strong em, em strong),',
  '.cm-s-obsidian span.cm-strong.cm-em {',
  '  font-weight: var(--bold-weight);',
  '  color: color-mix(in srgb, var(--color-red) 55%, var(--color-orange));',
  '}',
  '/* 3. links: subtle underline at rest, full accent on hover; Border hover pill kept (chrome pins link-decoration none, so this is hardcoded) */',
  '.markdown-rendered :is(a.internal-link, a.external-link) {',
  '  text-decoration-line: underline;',
  '  text-decoration-thickness: 1px;',
  '  text-underline-offset: 3px;',
  '  text-decoration-color: color-mix(in srgb, var(--color-accent-1) 55%, transparent);',
  '}',
  '.markdown-rendered :is(a.internal-link, a.external-link):hover {',
  '  text-decoration-line: underline;',
  '  text-decoration-color: var(--color-accent-1);',
  '}',
  '.cm-s-obsidian span:is(.cm-hmd-internal-link, .cm-link:not(.cm-formatting-link)) {',
  '  text-decoration-line: underline;',
  '  text-decoration-thickness: 1px;',
  '  text-underline-offset: 3px;',
  '  text-decoration-color: color-mix(in srgb, var(--color-accent-1) 55%, transparent);',
  '}',
  '/* 4. inline code: flat pill over the old dotted pattern, pink kept */',
  '.markdown-rendered :not(pre) > code,',
  '.cm-s-obsidian span.cm-inline-code:not(.cm-formatting):not(.cm-hmd-indented-code) {',
  '  padding: 0.1em 0.4em;',
  '  border: 1px solid color-mix(in srgb, var(--color-pink) 28%, transparent);',
  '  border-radius: var(--radius-s);',
  '}',
  '/* 5. fenced blocks: solid hairline, glass radius, pill flair; language badge (reading view) */',
  '.markdown-rendered pre {',
  '  position: relative;',
  '  border-radius: var(--radius-m);',
  '  padding: 12px 14px;',
  '}',
  '/* Reserve a badge row so the language label never sits on code line 1 */',
  '.markdown-rendered pre[class*="language-"] {',
  '  padding-top: 28px;',
  '}',
  '.markdown-source-view.mod-cm6 .code-block-flair,',
  '.markdown-rendered button.copy-code-button {',
  '  font-size: 0.6rem;',
  '  text-transform: uppercase;',
  '  letter-spacing: 0.06em;',
  '  line-height: 1.6;',
  '  border: 1px solid var(--background-modifier-border);',
  '  border-radius: var(--radius-s);',
  '  background: color-mix(in srgb, var(--text-normal) 8%, transparent);',
  '  padding: 1px 6px;',
  '}',
  '.markdown-rendered button.copy-code-button {',
  '  position: absolute;',
  '  top: 6px;',
  '  right: 8px;',
  '}',
  '/* Reading-view language label: plain faint text (not a button pill), top-left and capped, so long code lines pass below it, never under it */',
  '.markdown-rendered pre[class*="language-"]::before {',
  '  position: absolute;',
  '  top: 6px;',
  '  left: 12px;',
  '  right: auto;',
  '  max-width: calc(100% - 70px);',
  '  overflow: hidden;',
  '  text-overflow: ellipsis;',
  '  white-space: nowrap;',
  '  font-size: 0.6rem;',
  '  line-height: 1.6;',
  '  text-transform: uppercase;',
  '  letter-spacing: 0.08em;',
  '  color: var(--text-faint);',
  '  background: transparent;',
  '  border: none;',
  '  padding: 1px 2px;',
  '  pointer-events: none;',
  '  user-select: none;',
  '}',
  '.markdown-rendered pre[class*="language-javascript"]::before,',
  '.markdown-rendered pre[class*="language-js"]::before { content: "javascript"; }',
  '.markdown-rendered pre[class*="language-typescript"]::before,',
  '.markdown-rendered pre[class*="language-ts"]::before { content: "typescript"; }',
  '.markdown-rendered pre[class*="language-python"]::before { content: "python"; }',
  '.markdown-rendered pre[class*="language-css"]::before { content: "css"; }',
  '.markdown-rendered pre[class*="language-html"]::before { content: "html"; }',
  '.markdown-rendered pre[class*="language-json"]::before { content: "json"; }',
  '.markdown-rendered pre[class*="language-shell"]::before,',
  '.markdown-rendered pre[class*="language-bash"]::before { content: "shell"; }',
  '.markdown-rendered pre[class*="language-markdown"]::before,',
  '.markdown-rendered pre[class*="language-md"]::before { content: "markdown"; }',
  '/* 6. horizontal rules: native hairline base (always paints) + accent glow + hollow bead threaded on the line */',
  'body .markdown-rendered hr,',
  'body .markdown-preview-view hr,',
  'body .markdown-source-view.mod-cm6 .cm-line hr {',
  '  margin: 2.5em auto;',
  '  border: none;',
  '  border-top: 1px solid var(--background-modifier-border);',
  '  height: 0;',
  '  overflow: visible;',
  '  position: relative;',
  '  background: transparent;',
  '}',
  'body .markdown-rendered hr::before,',
  'body .markdown-preview-view hr::before,',
  'body .markdown-source-view.mod-cm6 .cm-line hr::before {',
  '  content: "";',
  '  position: absolute;',
  '  top: -1px;',
  '  left: 18%;',
  '  right: 18%;',
  '  height: 1px;',
  '  background: linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent-1) 55%, transparent), transparent);',
  '  pointer-events: none;',
  '}',
  'body .markdown-rendered hr::after,',
  'body .markdown-preview-view hr::after,',
  'body .markdown-source-view.mod-cm6 .cm-line hr::after {',
  '  content: "";',
  '  position: absolute;',
  '  left: 50%;',
  '  top: 0;',
  '  width: 5px;',
  '  height: 5px;',
  '  transform: translate(-50%, -50%) rotate(45deg);',
  '  border-radius: 1.5px;',
  '  background: transparent;',
  '  border: 1px solid var(--background-modifier-border);',
  '  border-color: color-mix(in srgb, var(--color-accent-1) 65%, transparent);',
  '}',
].join('\n');
writeFileSync(join(DIST, 'polish.css'), polish + '\n');
// ---- bridge: vars Border-keep needs that neither chrome nor Obsidian guarantees,
// plus one shared contrast fix (accent hover bg must pair with --text-on-accent) ----
const bridge = [
  '/* Border City bridge */',
  ':root {',
  '  --divider-color: var(--background-modifier-border);',
  '  --background-modifier-border-hover: color-mix(in srgb, var(--color-accent-1) 30%, transparent);',
  '}',
  '/* Sliders: Border overhang knob (thin 4px bar, 18px knob straddling it, -6px centers; body beats chrome body; skip mobile). Dense knob-in-bar designs kept clipping at the input paint box, so sizing copies Border core instead. */',
  'body:not(.is-mobile) {',
  '  --slider-track-height: 4px;',
  '  --slider-thumb-height: 18px;',
  '  --slider-thumb-width: 18px;',
  '  --slider-thumb-y: -6px;',
  '}',
  '/* Range inputs paint the knob past the input box: drop paint containment so a fractional-scale hair never slices it (also covers Border hover outlines) */',
  'body:not(.is-mobile) input[type="range"] {',
  '  contain: layout style;',
  '  overflow: visible;',
  '}',
  '/* Hover bg goes accent-bright: keep text on --text-on-accent (variants pin it dark where accent is bright) */',
  'button.mod-cta:hover,',
  ':is(.mod-root, .popover) .metadata-add-button:hover,',
  '.menu-item:not(.is-disabled):hover {',
  '  color: var(--text-on-accent);',
  '}',
].join('\n');
writeFileSync(join(DIST, 'bridge.css'), bridge + '\n');
// ---- compile chrome ----
const cands = [join(OUT, 'node_modules/.bin/sass'), 'sass'];
let bin = null;
for (const c of cands) { try { if (spawnSync(c, ['--version'], { encoding: 'utf8' }).status === 0) { bin = c; break; } } catch (e) { /* next */ } }
if (!bin) die('no sass binary');
const r = spawnSync(bin, [join(SRC, 'theme.scss'), join(DIST, 'chrome.css'), '--style=compressed', '--no-source-map'], { encoding: 'utf8' });
if (r.status !== 0) die('sass failed: ' + String(r.stderr).slice(0, 1500));
const chrome = readFileSync(join(DIST, 'chrome.css'), 'utf8');
console.log('chrome bytes: ' + chrome.length);
// ---- var check ----
const clean = (chrome + '\n' + bridge + '\n' + borderCss + '\n' + polish).replace(/\/\*[\s\S]*?\*\//g, ' ');
const used = new Set([...clean.matchAll(/var\(\s*(--[A-Za-z0-9-_]+)/g)].map((m) => m[1]));
const defined = new Set([...clean.matchAll(/(--[A-Za-z0-9-_]+)\s*:/g)].map((m) => m[1]));
const borderDefs = new Set([...readFileSync(join(BORDER, 'theme.css'), 'utf8').matchAll(/(--[A-Za-z0-9-_]+):/g)].map((m) => m[1]));
const droppedVars = new Set([...borderDefs].filter((v) => !defined.has(v))); // defined upstream but in no kept slice
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
for (const v of missing) console.log('  MISSING ' + v + (droppedVars.has(v) ? ' (dropped border region, not shipped)' : ' (builtin?)'));
const unknown = missing.filter((v) => !KNOWN_MISSING.includes(v));
if (unknown.length) die('new MISSING vars, bridge/drop/allowlist: ' + unknown.join(', '));
const stale = KNOWN_MISSING.filter((v) => !missing.includes(v));
if (stale.length) console.log('var check: resolved since snapshot: ' + stale.join(','));
// ---- variant var check: layers ship uncompiled, typos fail silently ----
for (const name of ['fluent', 'material', 'liquid']) {
  const layer = readFileSync(join(OUT, 'variants', name + '.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const lused = new Set([...layer.matchAll(/var\(\s*(--[A-Za-z0-9-_]+)/g)].map((m) => m[1]));
  const ldefs = new Set([...layer.matchAll(/(--[A-Za-z0-9-_]+)\s*:/g)].map((m) => m[1]));
  const lunknown = [...lused].filter((v) => !defined.has(v) && !ldefs.has(v) && !KNOWN_MISSING.includes(v));
  if (lunknown.length) die('variant ' + name + ' unknown vars: ' + lunknown.join(', '));
}
console.log('variant var check OK');
// ---- assemble ----
const braces = (s) => [(s.match(/\{/g) || []).length, (s.match(/\}/g) || []).length];
const themeOut = ['/* Border City: Velocity chrome + Border markdown. Built by build.mjs. */', chrome, bridge, borderCss, polish, veloSettings, borderSettings].join('\n');
const [open, close] = braces(themeOut);
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
  const [vo, vc] = braces(variantOut);
  if (vo !== vc) die('variant ' + v.name + ' brace imbalance ' + vo + ' vs ' + vc);
  const vdir = join(ROOT, 'border-city-' + v.name); // sibling theme dir: shows as its own theme
  mkdirSync(vdir, { recursive: true });
  writeFileSync(join(vdir, 'theme.css'), variantOut);
  writeFileSync(join(vdir, 'manifest.json'), JSON.stringify({ ...baseManifest, name: v.themeName }, null, 2) + '\n');
  console.log('variant ' + v.name + ' bytes: ' + variantOut.length);
}
console.log('BUILD OK');