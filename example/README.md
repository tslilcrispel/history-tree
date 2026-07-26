# history-tree — example

A runnable Vite + React + TypeScript demo of the `history-tree` library. It
imports the library **straight from `../src`** (via a Vite alias), so anything
you change in the library shows up here immediately — no rebuild needed.

## Run

```bash
cd example
npm install
npm run dev        # open the printed http://localhost:5173
```

## What it demonstrates

- **Feeding data** — a GraphScope-style raw step map converted with `fromStepMap`.
- **`onStepClick`** — click a card to restore it; the path back to the root highlights.
- **`onStepMore`** — the per-card **⋯** button opens a real action menu
  (branch / set current / delete subtree).
- **`onStepHover`** — hovered step is inspected live in the side panel.
- **Theming** — toggle the built-in `darkTheme` / `lightTheme`.
- **Variants** — switch between the full `tree` and the compact `mini` strip.
- **Icon tags** — Font Awesome icons used as step `tag`s (the seed keeps a string tag).
- **Live branching** — grow the tree at runtime to watch layout reflow.

Every interaction is written to the on-screen **event log**.

## Other scripts

```bash
npm run typecheck  # tsc --noEmit against the library source
npm run build      # production bundle (sanity check)
```
