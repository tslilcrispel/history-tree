# history-tree

A branching **step-history tree** for investigation / graph tools, extracted from
the GraphScope console. React + TypeScript, zero runtime dependencies (React is a
peer dependency).

It renders the history **tree only** — the branching cards and their connectors.
It deliberately leaves out the surrounding panel chrome (collapse/expand, the
History/Timeline tabs, the collapsed mini-strip) so you can drop it into your own
layout.

```
┌── Seed ──┬── Expand ──── Shared
│          └── Path ───┬── Expand   ← current (highlighted, glowing)
│                      └── Community
```

## Install

```bash
npm install history-tree
# peer deps, if you don't already have them:
npm install react react-dom
```

## Quick start

```tsx
import { HistoryTree, type HistoryStep } from "history-tree";

const steps: HistoryStep[] = [
  { id: "s1", parentId: null, title: "Seed Entity",       subtitle: "Aria Vance",  tag: "●",  accent: "#8ea3bd" },
  { id: "s2", parentId: "s1", title: "Expand Associates", subtitle: "Aria Vance",  tag: "EX", accent: "#4dd0e1" },
  { id: "s3", parentId: "s2", title: "Shortest Path",     subtitle: "Aria, Ben",   tag: "SP", accent: "#5b9bff" },
  { id: "s4", parentId: "s2", title: "Shared-Attribute",  subtitle: "3 people",    tag: "SA", accent: "#f7c948" },
];

function Panel() {
  const [current, setCurrent] = React.useState("s4");

  return (
    <div style={{ overflow: "auto", height: 240 }}>
      <HistoryTree
        steps={steps}
        currentStepId={current}
        onStepClick={(step) => setCurrent(step.id)}          // restore that step
        onStepMore={(step, e) => openMenu(step, e)}          // ⋯ button → branch / menu
        onStepHover={(step) => highlightOnGraph(step?.id)}   // null on leave
      />
    </div>
  );
}
```

The component **sizes itself** to its content (`position: relative`). Put it in an
`overflow: auto` container to scroll a large history.

## Data model

One flat array of steps; the tree structure comes from `parentId`.

```ts
interface HistoryStep<T = unknown> {
  id: string;
  parentId: string | null;   // null (or unknown parent) = a root
  title: string;             // primary line
  subtitle?: string;         // secondary line
  tag?: React.ReactNode;     // chip content: a string OR an icon element
  accent?: string;           // chip + active-border colour
  disabled?: boolean;        // faded + non-interactive (see below)
  data?: T;                  // opaque payload echoed back on every event
}
```

- Supports a **forest** (multiple roots).
- `currentStepId` highlights the current card and the path back to its root.
- Steps with an unknown `parentId` are treated as roots; cycles are guarded against.

### Disabled steps

Set `disabled: true` to render a step faded and **non-interactive** — e.g. a step
whose snapshot can no longer be restored, or one that is still being computed.

```tsx
{ id: "s7", parentId: "s2", title: "Circular-Flow", subtitle: "stale snapshot", disabled: true }
```

- `onStepClick` and `onStepMore` never fire for it: the ⋯ button isn't rendered,
  right-click falls through to the browser's own menu, and Enter/Space do
  nothing. The card is skipped by tab navigation (`tabIndex={-1}`, plus
  `aria-disabled`).
- `onStepHover` **still** fires, so you can explain *why* it's disabled in your
  own tooltip or side panel.
- It keeps its place in the layout and still counts towards the path to the
  current step — disabling a step never re-shapes the tree.
- Works in both variants: the card / dot gets a dashed border at
  `theme.disabledOpacity` (default `0.4`), and the current-step glow is dropped
  while it's disabled.
- `renderCard` receives `node.disabled`, so custom cards can style it too.

### Tag: string or icon

`tag` accepts any `ReactNode`. A plain string renders as a compact monospace
label; anything else renders as-is, so you can use an icon from any library — no
icon dependency is bundled, you bring your own.

```tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRoute, faUsers } from "@fortawesome/free-solid-svg-icons";

const steps = [
  { id: "s1", parentId: null, title: "Seed",          tag: "●" },                             // string
  { id: "s2", parentId: "s1", title: "Shortest Path", tag: <FontAwesomeIcon icon={faRoute} />, accent: "#5b9bff" },
  { id: "s3", parentId: "s2", title: "Community",     tag: <FontAwesomeIcon icon={faUsers} />, accent: "#b98bff" },
  { id: "s4", parentId: "s2", title: "Custom SVG",    tag: <i className="fa-solid fa-star" /> }, // or any element / emoji
];
```

The `accent` colour is applied to the chip, so icons inherit it automatically
(`color: currentColor`).

## Events

| Prop | When | Signature |
| --- | --- | --- |
| `onStepClick` | a card is clicked (or Enter/Space) | `(step, event) => void` |
| `onStepMore` | the **⋯** button is clicked **or** a step is **right-clicked** | `(step, event) => void` |
| `onStepHover` | pointer enters (`step`) / leaves (`null`) | `(step \| null, event) => void` |

The **⋯ button only renders when `onStepMore` is provided** (by default only on
hover / for the current card — set `moreOnHoverOnly={false}` to always show it).
When `onStepMore` is set, **right-clicking a step** also fires it (in both
variants) and suppresses the browser's native context menu — position your menu
from `event.clientX/clientY`.

## Variants: tree vs. mini

`variant="tree"` (default) renders the full branching layout. `variant="mini"`
renders the compact horizontal strip of step dots — the collapsed history bar
from GraphScope: a flat, insertion-order row where the current dot is enlarged
and filled with its accent, on-path connectors are brighter, and the current
step's title/subtitle trails the strip. Steps **not on the path** to the current
step are dimmed so the active branch stands out (hover un-dims them).

```tsx
// A slim history bar, e.g. docked at the bottom of your app.
<div style={{ overflowX: "auto" }}>
  <HistoryTree
    steps={steps}
    currentStepId={current}
    variant="mini"
    onStepClick={(s) => setCurrent(s.id)}
    onStepHover={(s) => highlightOnGraph(s?.id)}
  />
</div>
```

Same `steps` / `currentStepId` / `theme` for both variants, so you can flip
between them with a single prop. Mini-only knobs:

| Prop | Default | Meaning |
| --- | --- | --- |
| `mini` | `{ dotSize: 19, currentDotSize: 24, connectorWidth: 13, summaryGap: 10, inactiveOpacity: 0.4 }` | dot / connector geometry + off-branch fade (`inactiveOpacity: 1` disables the fade) |
| `showCurrentSummary` | `true` | show the current step's title/subtitle after the strip |

The ⋯ "more" button and `renderCard` apply to the tree variant only.

## Layout direction

The tree can grow in any of four directions via `layout.direction`:
`"LR"` left→right (default), `"RL"` right→left, `"TB"` top→bottom, `"BT"` bottom→top.
Connectors re-anchor to the facing card edges automatically, and the same
geometry defaults space the tree correctly in every direction — no retuning.

```tsx
<HistoryTree steps={steps} currentStepId={current} layout={{ direction: "TB" }} />
```

Direction applies to the tree variant; the `mini` strip is always a horizontal row.

## Theming

Pass a partial `theme` (merged over the built-in `darkTheme`), and/or `layout`
geometry overrides.

```tsx
import { HistoryTree, lightTheme } from "history-tree";

<HistoryTree
  steps={steps}
  theme={lightTheme}                       // or { titleColor: "#fff", ... }
  layout={{ columnWidth: 200, cardWidth: 170 }}
/>
```

Custom card body while keeping automatic positioning:

```tsx
<HistoryTree steps={steps} renderCard={(node) => <MyCard step={node.step} />} />
```

## Headless layout

`computeLayout(steps, currentStepId, options)` is a pure function returning
positioned `nodes` + SVG `links` + total `width`/`height`. Use it directly if you
want to render the tree yourself (canvas, a different framework, tests).

`chainToStep(steps, stepId)` returns the step **and all of its parents** — the
whole branch from a root down to that step, in breadcrumb order (root first,
`stepId` last). Handy for a breadcrumb bar, a "replay from the top" action, or
just reading the path that led to a step.

```tsx
import { chainToStep } from "history-tree";

const chain = chainToStep(steps, currentStepId);

chain.map((s) => s.title).join(" › "); // "Load › Expand › Filter"
const step = chain.at(-1);             // the step itself
const parents = chain.slice(0, -1);    // only its ancestors
[...chain].reverse();                  // step first, ancestors after
```

It accepts either the `HistoryStep[]` array or an `id → step` `Map` (pass the
map if you call it in a loop), returns `[]` for an unknown id, and terminates
safely on missing parents and cycles.

## Example

A runnable Vite demo lives in [`example/`](./example) — it imports the library
straight from source and exercises every feature (click-to-restore, the ⋯ action
menu, hover highlighting, theming, and live branching).

```bash
cd example
npm install
npm run dev        # open the printed localhost URL
```

## Build

```bash
npm install
npm run build      # → dist/ (ESM + CJS + .d.ts) via tsup
npm run typecheck
```

## License

MIT
