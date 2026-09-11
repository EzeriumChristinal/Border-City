# Border-City

Obsidian theme: Velocity chrome (workspace, tabs, sidebar, modals, mobile,
colors) + Border markdown (headings, lists, tables, callouts, code,
checkboxes, embeds).

Needs Obsidian 1.13+ and the Style Settings plugin for the tunable options.

## Install

1. Build first: `cd border-city && npm install && npm run build`
   (needs Node 18+).
2. Make a `border-city` folder inside `<vault>/.obsidian/themes/` containing
   only `border-city/manifest.json` + `border-city/theme.css`. Copying the
   whole repo folder does not work, it holds build sources.
3. Same for any variant you want: each `border-city-<name>/` folder
   (`manifest.json` + `theme.css`) goes in as its own theme folder.
4. Pick Border City under Settings → Appearance → Themes.

## Variants (experimental)

Base is the stable theme. The three variants are experiments: each is base
`theme.css` plus one small token layer, borrowing look-and-feel values from
one component project. No JS from those projects ships, CSS only, and the
markdown render stays Border in all three.

- Fluent — values from [fluentui](https://github.com/microsoft/fluentui):
  Segoe UI stack, small rectangular corners, flat controls, underline
  active tab, acrylic overlays.
- Material — values from
  [material-web](https://github.com/material-components/material-web):
  Roboto, pill buttons and toggles, 3px tab indicator, tonal surfaces,
  elevated sheets.
- Liquid — values inspired by
  [liquidGL](https://github.com/naughtyduk/liquidGL): backdrop blur on
  overlays and leaf containers, translucent surfaces, squircle corners.
  Real refraction needs WebGL, which themes cannot ship, so this is an
  approximation.

Expect rough edges on all three. Bug reports against base get priority.

## Layout

- `border-city/`: the merged theme. `theme.css` is built, never hand-edited.
  `build.mjs` regenerates it from the vendored sources below.
- `border-city-fluent/`, `border-city-material/`, `border-city-liquid/`:
  variant themes, emitted by the build, git-ignored.
- `obsidian-velocity-master/`: upstream Velocity source (Floodlight).
- `obsidian-border-main/`: upstream Border source (Akifyss).
- `AGENTS.md`: working rules for agents (rebuild, edit policy, tradeoffs).

## Rebuild

```sh
cd border-city && npm install && npm run build
```

## Credits

- Velocity by Floodlight (workspace look, colors)
- Border by Akifyss (markdown render)

Upstream licenses ship in their folders.
