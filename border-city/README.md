# Border City

Merge: Velocity chrome (workspace, tabs, sidebar, modals, mobile, colors) +
Border markdown (headings, lists, tables, callouts, code, checkboxes, embeds).

## Layout

- `theme.css`: built artifact. Install this folder as an Obsidian theme.
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

## Variants

`npm run build` also emits three separate installable themes as siblings
of this folder (`border-city-fluent/`, `border-city-material/`,
`border-city-liquid/`, each `theme.css` = base + one token layer,
`manifest.json` generated with its own name). They are build outputs
(git-ignored, regenerated every build), not sources. Copy all four folders
into `<vault>/.obsidian/themes/` and each shows as its own theme:

- `fluent/` — Fluent 2 web-component tokens (`@fluentui/web-components`):
  Segoe UI, 4px controls, flat depth, `#0f6cbd` / `#479ef5` accent.
- `material/` — Material Web M3 tokens (`@material/web`): Roboto,
  M3 shape scale + pill toggles, state-layer hover, `#6750a4` /
  `#d0bcff` baseline primary.
- `liquid/` — liquidGL-style glass (naughtyduk/liquidGL): boosted
  backdrop blur + saturate, translucent surfaces, specular edge,
  solid fallback without `backdrop-filter`.

Obsidian themes ship CSS only, so no JS/WebGL bundled: variants pin
the token values each component library would emit. Markdown render
untouched in all three (Border owns it).

## Known tradeoffs

- Editor line height defaults to Border 1.5 (Border owns `--line-height-normal`;
  tune via Border Editor settings, not Velocity).
- Bold renders red, italics orange (Border markdown choice, wins by order).
- No Bases/Canvas/Calendar/Omnisearch/Todoist skinning (unstyled plugins fall
  back to Obsidian default).
- No Border presets (upstream `presets/` dropped).
