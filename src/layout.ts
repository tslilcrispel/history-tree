import type {
  HistoryStep,
  LayoutOptions,
  LaidOutLink,
  LaidOutNode,
  MiniLayoutOptions,
  TreeLayout,
} from "./types";

/** Default geometry, matching the reference GraphScope layout. */
export const DEFAULT_LAYOUT: LayoutOptions = {
  direction: "LR",
  columnWidth: 176,
  rowHeight: 62,
  cardWidth: 150,
  cardHeight: 48,
  padX: 18,
  padY: 14,
};

/** Default geometry for the compact "mini" strip, matching GraphScope. */
export const DEFAULT_MINI: MiniLayoutOptions = {
  dotSize: 19,
  currentDotSize: 24,
  connectorWidth: 13,
  summaryGap: 10,
  inactiveOpacity: 0.4,
};

/**
 * Walk from `startId` up through parents, collecting the chain of ids.
 * Guards against cycles and missing parents.
 */
export function ancestorsOf<T>(
  byId: Map<string, HistoryStep<T>>,
  startId: string | null | undefined
): Set<string> {
  const set = new Set<string>();
  let cursor = startId ?? null;
  while (cursor && byId.has(cursor) && !set.has(cursor)) {
    set.add(cursor);
    cursor = byId.get(cursor)!.parentId;
  }
  return set;
}

/**
 * Position every step in a branching tree (or forest).
 *
 * Depth (distance from a root) drives the horizontal column; a leaf counter
 * drives the vertical row, and each internal node is centred on the average
 * row of its children — so branches fan out cleanly without overlap.
 *
 * Pure and side-effect free: safe to call inside a `useMemo`.
 */
export function computeLayout<T = unknown>(
  steps: HistoryStep<T>[],
  currentStepId: string | null | undefined,
  options?: Partial<LayoutOptions>
): TreeLayout<T> {
  const opts: LayoutOptions = { ...DEFAULT_LAYOUT, ...options };
  const { direction, columnWidth, rowHeight, cardWidth, cardHeight, padX, padY } = opts;

  const empty: TreeLayout<T> = {
    nodes: [],
    links: [],
    width: padX * 2,
    height: padY * 2,
  };
  if (!steps.length) return empty;

  const byId = new Map<string, HistoryStep<T>>();
  for (const s of steps) byId.set(s.id, s);

  // children in stable insertion order; roots = no (known) parent
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];
  for (const s of steps) {
    const parent = s.parentId;
    if (parent && byId.has(parent)) {
      const list = childrenOf.get(parent);
      if (list) list.push(s.id);
      else childrenOf.set(parent, [s.id]);
    } else {
      roots.push(s.id);
    }
  }

  const anc = ancestorsOf(byId, currentStepId);

  const depth = new Map<string, number>();
  const row = new Map<string, number>();
  const visited = new Set<string>();
  let leaf = 0;

  const assign = (id: string, d: number): void => {
    if (visited.has(id)) return; // cycle / diamond guard
    visited.add(id);
    depth.set(id, d);
    const children = (childrenOf.get(id) ?? []).filter((c) => byId.has(c));
    if (!children.length) {
      row.set(id, leaf++);
      return;
    }
    for (const c of children) assign(c, d + 1);
    const sum = children.reduce((a, c) => a + (row.get(c) ?? 0), 0);
    row.set(id, sum / children.length);
  };

  for (const r of roots) assign(r, 0);
  // Any step unreachable from a root (orphaned by a cycle) still gets a slot.
  for (const s of steps) if (!visited.has(s.id)) assign(s.id, 0);

  let maxDepth = 0;
  for (const d of depth.values()) if (d > maxDepth) maxDepth = d;

  // `columnWidth` is always the horizontal step and `rowHeight` the vertical
  // step. Horizontal layouts (LR/RL) grow along X, vertical (TB/BT) along Y —
  // so the depth/breadth axes swap which spacing they use.
  const horizontal = direction === "LR" || direction === "RL";
  const depthSpacing = horizontal ? columnWidth : rowHeight;
  const breadthSpacing = horizontal ? rowHeight : columnWidth;
  const depthSpan = maxDepth * depthSpacing;

  const pos = new Map<string, { left: number; top: number }>();
  const nodes: LaidOutNode<T>[] = steps.map((step) => {
    const d = depth.get(step.id) ?? 0;
    const r = row.get(step.id) ?? 0;
    const dp = d * depthSpacing; // offset along the growth axis
    const bp = r * breadthSpacing; // offset along the sibling axis
    let left = padX;
    let top = padY;
    if (horizontal) {
      left += direction === "RL" ? depthSpan - dp : dp;
      top += bp;
    } else {
      left += bp;
      top += direction === "BT" ? depthSpan - dp : dp;
    }
    pos.set(step.id, { left, top });
    const children = childrenOf.get(step.id);
    return {
      step,
      x: left,
      y: top,
      width: cardWidth,
      height: cardHeight,
      depth: d,
      isCurrent: step.id === currentStepId,
      onPath: anc.has(step.id),
      hasChildren: !!(children && children.length),
    };
  });

  const links: LaidOutLink[] = [];
  for (const s of steps) {
    const parentId = s.parentId;
    if (!parentId) continue;
    const p = pos.get(parentId);
    const c = pos.get(s.id);
    if (!p || !c) continue;

    // Anchor each end on the edge of the card that faces the growth direction,
    // then draw an S-curve along that axis.
    let x1: number, y1: number, x2: number, y2: number, d: string;
    if (horizontal) {
      y1 = p.top + cardHeight / 2;
      y2 = c.top + cardHeight / 2;
      if (direction === "LR") {
        x1 = p.left + cardWidth;
        x2 = c.left;
      } else {
        x1 = p.left;
        x2 = c.left + cardWidth;
      }
      const mx = (x1 + x2) / 2;
      d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    } else {
      x1 = p.left + cardWidth / 2;
      x2 = c.left + cardWidth / 2;
      if (direction === "TB") {
        y1 = p.top + cardHeight;
        y2 = c.top;
      } else {
        y1 = p.top;
        y2 = c.top + cardHeight;
      }
      const my = (y1 + y2) / 2;
      d = `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
    }
    links.push({ id: s.id, d, active: anc.has(s.id) && anc.has(parentId) });
  }

  let maxRight = 0;
  let maxBottom = 0;
  for (const n of nodes) {
    if (n.x + n.width > maxRight) maxRight = n.x + n.width;
    if (n.y + n.height > maxBottom) maxBottom = n.y + n.height;
  }

  return {
    nodes,
    links,
    width: maxRight + padX,
    height: maxBottom + padY,
  };
}
