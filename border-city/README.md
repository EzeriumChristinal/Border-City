# Border City

Merge: Velocity chrome (workspace, tabs, sidebar, modals, mobile, colors) +
Border markdown (headings, lists, tables, callouts, code, checkboxes, embeds).

## Layout

- `theme.css`: built artifact. Install this folder as an Obsidian theme.
- `build.mjs`: the merge. Copies Velocity `src/`, drops markdown/integration
  modules, applies patches, compiles chrome with Sass, appends Border markdown
  slices + pruned Style Settings. Asserts fail the build if upstream line
  numbers drift.
- `src/`: filtered Velocity tree (generated, committed for inspection).
- `dist/`: intermediates: `chrome.css`, `bridge.css`, `border-markdown.css`,
  `velocity-settings.css`, `border-settings.css`.

## Rebuild

Needs a Sass binary (`npm install` inside `border-city/`, or PATH `sass`):

```sh
npm run build
```

Build prints a var check. Remaining MISSING entries are Obsidian builtins or
vars upstream Velocity itself never defined (verified against its `theme.css`).

## What was cut

Velocity: all of `20_markdown`, all of `60_integrations` except settings-panel
styling, alt/active-checkboxes, css-classes, math-callouts, media, Raveo 191KB
font embed (falls back to Inter/system stack), 15 dead Style Settings toggles.

Border: workspace/backgrounds/layout/tabs/autohide (~2700 lines), Appearance
light+dark color systems (~1900 lines settings + ~300 lines vars — Velocity owns
color now), Components/Mobile/Plugin settings, presets (35 JSON), alt
checkboxes, icon/pdf/mobile/plugin sections.

Two-var `dist/bridge.css` keeps Border rules that referenced dropped systems.

## Known tradeoffs

- Editor line height defaults to Border 1.5 (Border owns `--line-height-normal`;
  tune via Border Editor settings, not Velocity).
- Bold renders red, italics orange (Border markdown choice, wins by order).
- No Bases/Canvas/Calendar/Omnisearch/Todoist skinning (unstyled plugins fall
  back to Obsidian default).
- No Border presets; Border Editor settings block kept whole, so a few toggles
  (focus mode, hover indicator, grid pattern) have no CSS behind them.
