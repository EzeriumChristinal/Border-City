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
  - `src/`: filtered Velocity tree. Generated. Never hand-edit.
  - `dist/`: intermediates (`chrome.css`, `bridge.css`,
    `border-markdown.css`, settings slices). Generated. Never hand-edit.
  - `theme.css`: shipped artifact. Generated. Never hand-edit.

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
- Border slices are 1-based inclusive line ranges into
  `obsidian-border-main/theme.css`. Comment the section name next to ranges.
- `dist/bridge.css` pins vars kept Border rules need that chrome and Obsidian
  omit. Prefer reusing a chrome-defined var over hardcoding.
- Var check prints MISSING each build. New MISSING tied to a dropped region =
  bridge it or drop the rule using it. Builtins and upstream-undefined vars
  stay as-is.
- Keep both Style Settings id namespaces (`obsidian-velocity*`, Border
  `Editor`) collision-free. The settings-panel SCSS hooks on those ids.

## Tradeoffs on record

Border owns `--line-height-normal` (1.5), bold red, italics orange. Plugin
skinning (Bases/Canvas/Calendar/Omnisearch/Todoist) stays dropped. Raveo font
stays dropped (Inter/system fallback). Border presets stay dropped.
Revisit only on direct user ask.
