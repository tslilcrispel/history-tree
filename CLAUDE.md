# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`history-tree` — a published npm package (currently 0.3.0): a React component that
renders a branching step-history tree (extracted from the "GraphScope" console).
Zero runtime dependencies; React/ReactDOM are peer deps and are never bundled.
It renders the tree only — no surrounding panel chrome.

The repo is two npm projects: the library at the root, and `example/` (a Vite demo).

## Commands

Library (root):

```bash
npm run build       # tsup → dist/ (ESM + CJS + .d.ts + sourcemaps)
npm run dev         # tsup --watch
npm run typecheck   # tsc --noEmit over src/
```

Example (`cd example`):

```bash
npm run dev         # Vite dev server; prints the localhost URL
npm run typecheck   # tsc --noEmit — also typechecks the library source, via the alias
npm run build       # production bundle, as a sanity check
```

There is **no test suite and no linter** in this repo. Verification is
`npm run typecheck` in both projects plus driving the example in a browser
(Playwright MCP is enabled in `example/.claude/settings.local.json` for that).
`tsconfig.json` is strict and includes `noUnusedLocals`/`noUnusedParameters`, so
typecheck catches more than types.

`example/vite.config.ts` aliases `history-tree` → `../src/index.ts`, so the demo
always runs the current source — **never rebuild the library to test a change in
the example.**

## Architecture

Five source files, each with one job:

- **`layout.ts`** — pure geometry. `computeLayout(steps, currentStepId, options)`
  turns the flat `HistoryStep[]` into positioned `nodes`, SVG-path `links`, and a
  total `width`/`height`. Also `ancestorsOf` (id set, used for highlighting) and
  the public `chainToStep` (step objects, breadcrumb order). No React, no DOM —
  callers can render the tree themselves.
- **`HistoryTree.tsx`** — all rendering. Three components in one file: the
  exported `HistoryTree` (tree variant + empty state + variant dispatch),
  `MiniStrip` (the `variant="mini"` dot strip, which does *not* use
  `computeLayout` — it is a flat insertion-order flex row), and `DefaultCard`.
- **`cssVars.ts`** — the `--ht-*` custom-property contract: the canonical
  `HISTORY_TREE_CSS_VARS` list, the `cssVar(name, fallback)` helper, and
  `themeToCssVars`.
- **`theme.ts`** — `darkTheme` (the default) / `lightTheme` / `resolveTheme`.
- **`types.ts`** — the public data model. `adapt.ts` is a host-specific
  convenience: `fromStepMap` converts a GraphScope `{ [id]: RawStep }` map into
  `HistoryStep[]`, keeping the raw object on `data`.

`index.ts` is the whole public API surface — anything a consumer should reach must
be re-exported there.

### The styling contract (the main invariant)

There are no stylesheets and no CSS-in-JS. Every painted value is an inline style
written as `cssVar("--ht-name", <resolved theme/geometry fallback>)`, i.e.
`var(--ht-name, fallback)`. That single pattern is what makes the documented
precedence work: inline `cssVars` prop ▸ a CSS rule ▸ the `theme`/`mini` props ▸
built-in defaults. A stylesheet rule that only *sets a variable* wins without
`!important`.

When touching anything visual:

- Never hard-code a colour, font, radius, border, shadow, spacing, font size, or
  transition. Wrap it in `cssVar(...)` with the current value as the fallback.
- A new variable must be added to `HISTORY_TREE_CSS_VARS` in `cssVars.ts` (that
  array types `HistoryTreeCssVar`, so it is the single source of truth) **and**
  to the variable table in `README.md`.
- Some variables intentionally chain to a more general one —
  `cssVar("--ht-mini-summary-title-color", cssVar("--ht-title-color", theme.titleColor))`.
  Follow that shape when a mini/summary value should default to a card value.
- Every element needs its stable `ht-*` class and its `data-*` state attributes
  (`data-current`, `data-on-path`, `data-disabled`, `data-active`) — CSS reaches
  states (`:hover`, `:focus-visible`, print) that props can't.
- Each card and mini dot publishes `--ht-accent` from `step.accent`, falling back
  to `var(--ht-accent-default, DEFAULT_ACCENT)`, so consumer rules can
  `color-mix` from it. It must always be defined.

**Sizes and positions are deliberately *not* CSS-driven**: `cardWidth`,
`cardHeight`, `columnWidth`, `rowHeight`, `padX`, `padY`, `direction` come from
`computeLayout` and stay on the `layout` prop. Don't move them into variables.

Adding a `HistoryTreeTheme` field means touching four places: `types.ts`, both
themes in `theme.ts`, `themeToCssVars` in `cssVars.ts`, and the README.

### Layout invariants

- One flat `steps` array; structure comes entirely from `parentId`. Supports a
  forest; an unknown `parentId` makes that step a root. Cycles, diamonds, and
  steps unreachable from any root are all guarded and still get a slot — keep
  `computeLayout` total (never throw, never loop forever) since it runs on every
  render inside a `useMemo`.
- Depth drives the growth axis, a leaf counter drives the sibling axis, and
  internal nodes are centred on the average row of their children.
- `direction` (`LR`/`RL`/`TB`/`BT`) is handled by swapping which spacing each
  axis uses (`depthSpacing`/`breadthSpacing`) and re-anchoring connectors to the
  facing card edges — `columnWidth` is always the horizontal step and `rowHeight`
  the vertical one, in every direction. New direction-sensitive code should
  follow that split rather than special-casing four cases.
- Sibling order follows `steps` array order; keep it stable.
- `disabled` never re-shapes the tree: the step keeps its slot and still counts
  towards the path to the current step. It suppresses `onStepClick`/`onStepMore`
  (⋯ button, right-click, Enter/Space) but `onStepHover` still fires so hosts can
  explain why.
- The component sizes itself to its content; the caller supplies the
  `overflow: auto` scroll container.

## Conventions

- `README.md` is the full public documentation and is unusually detailed (data
  model, every event, both variants, every CSS variable, class/state hooks). Any
  API, theme, variable, or behaviour change is incomplete until the README
  matches it.
- `example/src/App.tsx` is a deliberate feature harness — it exercises every
  prop, both variants, all four directions, icon *and* string tags, disabled
  steps, live branching, and both styling routes (`example/src/skins.css`
  stylesheet skins + the `cssVars` prop). New features are expected to show up
  there, and `example/README.md` lists what it demonstrates.
- Public API carries TSDoc; the prose explains *why* (see the direction and
  disabled comments) rather than restating the signature.
- Version bumps are their own commit (`change package version`) separate from the
  feature commit. `dist/` and the `*.tgz` packs are gitignored/untracked.
