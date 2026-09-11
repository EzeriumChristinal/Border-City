# Border City

Merge: Velocity chrome (workspace, tabs, sidebar, modals, mobile, colors) +
Border markdown (headings, lists, tables, callouts, code, checkboxes, embeds).

## Layout

- `theme.css` + `manifest.json`: built artifact. Install only these two files
  (inside a `border-city` folder) as Obsidian theme, not whole repo folder.
- `build.mjs`: the merge. Copies Velocity `src/`, drops markdown/integration
  modules, applies patches, compiles chrome with Sass, appends Border markdown
  slices + pruned Style Settings. Marker asserts fail the build if upstream
  sections move or rename.
- `src/`, `dist/`: generated intermediates (git-ignored, rebuild to inspect).

## Rebuild

Needs a Sass binary (`npm install` inside `border-city/`, or PATH `sass`):

```sh
npm run build   # regenerate theme.css + sibling variants
npm run check   # rebuild + fail if tracked outputs differ (CI gate)
```

## Screenshots

Visual gate for the four themes (base + three variants) × light/dark:

```sh
npm run screenshots   # needs a Chromium binary (HELIUM_BIN, default /opt/helium/helium)
```

Renders `screenshots/fixture.html` (tabs, sidebar/modal, prose,
tables/code/callouts/tasks/embeds) to `screenshots/out/<theme>.<mode>.png`
plus `compare-<mode>.html` 4-up contact sheets. Outputs git-ignored.
Broken variant = visual outlier against base.

Build prints a var check backed by a snapshot in `build.mjs`
(`KNOWN_MISSING`): new undefined vars fail the build — bridge them in
`dist/bridge.css`, drop the rule using them, or allowlist proven builtins.
Remaining entries are Obsidian builtins or vars upstream Velocity itself
never defines (its own `theme.css` lacks them too).

## What was cut

Velocity: all of `20_markdown`, all of `60_integrations` except settings-panel
styling, alt/active-checkboxes, css-classes, math-callouts, media, Raveo 191KB
font embed (falls back to Inter/system stack), 15 dead Style Settings toggles.

Border: workspace/backgrounds/layout/tabs/autohide (~2700 lines), Appearance
light+dark color systems (~1900 lines settings + ~300 lines vars — Velocity owns
color now), Components/Mobile/Plugin settings, presets (35 JSON), alt
checkboxes, icon/pdf/mobile/plugin sections, plus 16 dead Editor toggles
(focus mode, hover indicator, grid pattern, alt-checkbox switch) whose CSS
never shipped — pruned at build so no toggle is dead.

Two-var `dist/bridge.css` keeps Border rules that referenced dropped systems.

## Variants (experimental)

Base is the stable theme. The three variants are experiments: each is base
`theme.css` plus one small token layer from `variants/*.css`, borrowing
look-and-feel values from one component project. No JS from those projects
ships, CSS only. Markdown render untouched in all three (Border owns it).

`npm run build` emits them as siblings of this folder
(`border-city-fluent/`, `border-city-material/`, `border-city-liquid/`,
each `theme.css` = base + one token layer, `manifest.json` generated with
its own name). They are build outputs (git-ignored, regenerated every
build), not sources. Copy any folder into `<vault>/.obsidian/themes/` and
each shows as its own theme:

- `fluent/` — values from [fluentui](https://github.com/microsoft/fluentui):
  Segoe UI stack, 4px rectangular controls with 1px neutral strokes, flat
  surfaces, depth only on flyouts, 2px focus rect, underline active tab,
  40x20 switch, `#0f6cbd` / `#479ef5` accent, acrylic overlays.
- `material/` — values from
  [material-web](https://github.com/material-components/material-web):
  Roboto, 40px pill buttons, M3 shape scale + pill toggles, outline
  strokes, 3px tab indicator, tonal FAB, state-layer hover, sheet
  elevation, `#6750a4` / `#d0bcff`.
- `liquid/` — values inspired by
  [liquidGL](https://github.com/naughtyduk/liquidGL): boosted backdrop
  blur + saturate on overlays and leaf containers (tab strip, ribbon and
  titlebar stay solid so tabs keep contrast), translucent surfaces,
  specular edge + hairline, squircle controls, solid fallback without
  `backdrop-filter`. Real refraction needs WebGL, which themes cannot
  ship, so this is an approximation.

Expect rough edges on all three. Bug reports against base get priority.

## Known tradeoffs

- Editor line height defaults to Border 1.5 (Border owns `--line-height-normal`;
  tune via Border Editor settings, not Velocity).
- Bold renders red, italics orange (Border markdown choice, wins by order).
- No Bases/Canvas/Calendar/Omnisearch/Todoist skinning (unstyled plugins fall
  back to Obsidian default).
- No Border presets (upstream `presets/` dropped).
