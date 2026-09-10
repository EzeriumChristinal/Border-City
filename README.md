# Border-City

Obsidian theme merge: Velocity chrome + Border markdown render.

The installable theme is `border-city/` (see its README). Velocity supplies
workspace, tabs, sidebar, modals, mobile, and color. Border supplies headings,
lists, tables, callouts, code blocks, checkboxes, and embeds.

## Layout

- `border-city/`: the merged theme. `theme.css` is built, never hand-edited.
  `build.mjs` regenerates it from the vendored sources below.
- `border-city-fluent/`, `border-city-material/`, `border-city-liquid/`:
  variant themes (Fluent 2, Material M3, liquid-glass tokens), emitted by
  the build, git-ignored. Build first, then copy any/all folders into
  `<vault>/.obsidian/themes/`; each appears as its own theme.
- `obsidian-velocity-master/`: upstream Velocity source (Floodlight).
- `obsidian-border-main/`: upstream Border source (Akifyss).
- `AGENTS.md`: working rules for agents (rebuild, edit policy, tradeoffs).

## Install

Copy `border-city/` into `<vault>/.obsidian/themes/`, then pick Border City
under Settings → Appearance → Themes. Requires the Style Settings plugin for
the tunable options.

## Rebuild

```sh
cd border-city && npm install && npm run build
```

## Credits

- Velocity by Floodlight (workspace look, colors)
- Border by Akifyss (markdown render)

Upstream licenses ship in their folders.
