# AGENTS.md — Border-City repo

Merge repo. Velocity look + Border markdown render, built into `border-city/`.
Upstream sources are vendored read-only. Never edit them in place.

## Map

- `obsidian-velocity-master/`: upstream Velocity (Floodlight). Chrome donor.
  Read-only. Its `theme.css` is a stale build artifact; `src/` is truth.
- `obsidian-border-main/`: upstream Border (Akifyss). Markdown donor.
  Read-only. `theme.css` (9193 lines) is truth; `presets/` dropped downstream.
- `border-city/`: the merge. Only dir agents edit.
  - `build.mjs`: the merge script. Edit this, not outputs.
  - `src/`: filtered Velocity tree. Generated, git-ignored. Never hand-edit.
  - `dist/`: intermediates (`chrome.css`, `bridge.css`,
    `border-markdown.css`, settings slices). Generated, git-ignored.
  Never hand-edit.
  - `theme.css`: shipped artifact. Generated. Never hand-edit.
  - `variants/*.css`: hand-written variant token layers (fluent, material,
    liquid). Only hand-written sources besides `build.mjs`.
- `border-city-fluent/`, `border-city-material/`, `border-city-liquid/`:
  emitted sibling themes (each `manifest.json` + `theme.css`).
  Generated, git-ignored. Never hand-edit.

## Variants

Layers in `border-city/variants/*.css` stay token-first: override vars,
then a few small behavior rules. Never restyle markdown (Border owns it).
Keep each layer small and scoped:

- Desktop-only chrome rules take a `body:not(.is-mobile)` guard. The one
  exception was liquid blurring `.workspace-tab-header-container`,
  `.workspace-ribbon`, `.titlebar` — with 55% transparent surfaces the
  tabs washed out, so blur now covers overlays + leaf containers only.
- The opaque `--tab-right-fade` hover wash on the tab close button reads
  as a block over translucent/M3 surfaces. Material + liquid neutralize
  it with `background: transparent`. Fluent keeps it (solid surfaces).
- Liquid also sets `.status-bar { filter: none; }`: the base 37.5% dim
  looked broken over translucent glass.
- Accent-hover bg pairs with `--text-on-accent`: `dist/bridge.css` forces
  `button.mod-cta:hover`, `.metadata-add-button:hover` and
  `.menu-item:hover` onto it, and each variant pins it per mode (bright
  accents get dark text: fluent dark `#000`, material dark M3 on-primary
  `#381e72`, liquid both `#101010`; light dark-accents keep `#fff`).
- Fluent + Material neutralize Velocity glass speculars (`--glass-*: none`,
  later-in-cascade tie with chrome's `.theme-*` defs). Material additionally
  kills all `backdrop-filter` (M3 is solid + elevation); Fluent kills only
  status-bar blur (acrylic stays on menu/popover/suggestion flyouts).
- Velocity's FAB block (`_fab-and-header.scss`: `translate` + `order` +
  hidden last-child) stacked every markdown view-action into one floating
  spot. `build.mjs` deletes it and writes a plain 6-line row instead.
  Do not restore FAB styling without fixing the stacking first.
  Material keeps one override on top (tonal `background-color` +
  `border-radius`, no layout), which is safe.

## Rebuild

```sh
cd border-city && npm install && npm run build
```

Build copies Velocity `src/`, deletes markdown/integration modules, applies
line-range patches, compiles chrome, slices Border, runs var check, assembles
`theme.css`. Any step failing aborts non-zero. Do not commit a `theme.css`
older than its `src/` + `build.mjs`.

## Edit rules

- All merge logic lives in `build.mjs`. New cut = new entry in KEEP_FILES
  exclusion, DROP_IDS, patch ranges, or Border slice ranges.
- Patch ranges assert first-line content before deleting. Upstream file changed
  underneath = build fails. Re-map ranges by hand, never widen blindly.
- Border slices are marker-anchored into `obsidian-border-main/theme.css`
  (section headers, `name:` blocks). Upstream rename/move = build fails.
  Re-map markers by hand, never widen blindly. Dead toggles (setting kept,
  CSS dropped) go in BORDER_DROP_IDS, never by widening a slice to fit.
- `dist/bridge.css` pins vars kept Border rules need that chrome and Obsidian
  omit. Prefer reusing a chrome-defined var over hardcoding.
- Var check gates on a KNOWN_MISSING snapshot (builtins + vars upstream
  Velocity never defines — its own `theme.css` lacks them too, so a
  "(dropped border region)" tag alone never justifies a bridge). New MISSING
  = build fails: bridge it, drop the rule using it, or allowlist a proven
  builtin. `npm run check` doubles as CI gate (tracked outputs must match
  a fresh build).
- Keep both Style Settings id namespaces (`obsidian-velocity*`, Border
  `Editor`) collision-free. The settings-panel SCSS hooks on those ids.

## Verify

- `npm run build` must print BUILD OK with no new MISSING. `npm run check`
  is rebuild + tracked-output gate (CI).
- `border-city/screenshots/`: `fixture.html` + `shoot.mjs` harness,
  `out/` git-ignored. Needs a Chromium binary (`HELIUM_BIN`, default
  `/opt/helium/helium`).
- Manual Obsidian check (optional): copy each theme's `manifest.json` +
  `theme.css` into a test vault's `.obsidian/themes/`, one folder per theme
  named exactly as its manifest (`Border City` plus ` - Fluent`,
  ` - Material`, ` - Liquid`). Build output dirs use dashes, so rename on
  copy. Any other folder name hides the theme from the selector.

## Commits

- Messages stay universal: describe the change in repo terms anyone
  cloning it understands. No local-only references (personal vault names,
  machine paths, local binaries).
- One subject line plus a short body listing what changed and why.

## Tradeoffs on record

Border owns `--line-height-normal` (1.5), bold red, italics orange. Plugin
skinning (Bases/Canvas/Calendar/Omnisearch/Todoist) stays dropped. Raveo font
stays dropped (Inter/system fallback). Border presets stay dropped.
Revisit only on direct user ask.
