/**
 * Public data model for the history tree.
 *
 * A step is one node in a branching history: it points at its parent, carries a
 * short label/tag for display, and can hold arbitrary host `data` (e.g. a graph
 * snapshot) that the component never inspects but hands back on every event.
 */
import type { ReactNode } from "react";

/**
 * One step in the history.
 *
 * @typeParam T - Type of the opaque `data` payload you attach to each step.
 */
export interface HistoryStep<T = unknown> {
  /** Unique, stable id. */
  id: string;
  /** Parent step id, or `null` for a root. Steps with an unknown parent are treated as roots. */
  parentId: string | null;
  /** Primary line, e.g. the name of the action that produced this step. */
  title: string;
  /** Secondary line, e.g. the input the action ran on. */
  subtitle?: string;
  /**
   * Content of the leading chip. Either a short string (rendered monospace,
   * e.g. `EX`, `SP`, `●`) or any React node — a Font Awesome icon
   * (`<FontAwesomeIcon icon={faRoute} />`), an `<i className="fa-solid …" />`,
   * an inline `<svg>`, an emoji, etc.
   */
  tag?: ReactNode;
  /** Accent colour for the chip and the active-card border/glow. */
  accent?: string;
  /** Opaque payload passed straight back to your event handlers. Never read by the component. */
  data?: T;
}

/** Geometry knobs for the compact "mini" strip. All values are in pixels. */
export interface MiniLayoutOptions {
  /** Diameter of a normal step dot. */
  dotSize: number;
  /** Diameter of the current step's dot. */
  currentDotSize: number;
  /** Width of the connector between consecutive dots. */
  connectorWidth: number;
  /** Gap between the dot strip and the trailing current-step summary. */
  summaryGap: number;
  /**
   * Opacity applied to steps that are NOT on the path to the current step, so
   * the active branch stands out (`1` disables the effect). Hovered dots are
   * always shown at full opacity. Default `0.4`.
   */
  inactiveOpacity: number;
}

/**
 * Direction the tree grows from its root(s):
 * `"LR"` left→right (default), `"RL"` right→left, `"TB"` top→bottom, `"BT"` bottom→top.
 */
export type LayoutDirection = "LR" | "RL" | "TB" | "BT";

/** Geometry knobs for the tree layout. All values are in pixels (except `direction`). */
export interface LayoutOptions {
  /** Direction the tree grows. Default `"LR"`. */
  direction: LayoutDirection;
  /** Horizontal distance between columns (applies in every direction). */
  columnWidth: number;
  /** Vertical distance between rows (applies in every direction). */
  rowHeight: number;
  /** Card width. */
  cardWidth: number;
  /** Card height. */
  cardHeight: number;
  /** Left/right padding around the whole tree. */
  padX: number;
  /** Top/bottom padding around the whole tree. */
  padY: number;
}

/** A step after layout, with its absolute position and highlight flags. */
export interface LaidOutNode<T = unknown> {
  step: HistoryStep<T>;
  /** Left offset in px. */
  x: number;
  /** Top offset in px. */
  y: number;
  width: number;
  height: number;
  /** Distance from its root (0 = root). */
  depth: number;
  /** True when this step is the current step. */
  isCurrent: boolean;
  /** True when this step is on the path from a root to the current step. */
  onPath: boolean;
  /** True when this step has at least one child. */
  hasChildren: boolean;
}

/** A parent → child connector, as an SVG cubic-bezier path. */
export interface LaidOutLink {
  /** Id of the child step this link points to. */
  id: string;
  /** `d` attribute for an SVG `<path>`. */
  d: string;
  /** True when both endpoints are on the active path. */
  active: boolean;
}

/** Result of {@link computeLayout}. */
export interface TreeLayout<T = unknown> {
  nodes: LaidOutNode<T>[];
  links: LaidOutLink[];
  /** Total content width in px. */
  width: number;
  /** Total content height in px. */
  height: number;
}

/** Colours and fonts for the tree. Every field is optional; unset fields fall back to the default theme. */
export interface HistoryTreeTheme {
  /** Card background (default state). */
  cardBg: string;
  /** Card background when on the active path. */
  cardBgOnPath: string;
  /** Card background for the current step. */
  cardBgActive: string;
  /** Card border (default state). */
  cardBorder: string;
  /** Card border when on the active path. */
  cardBorderOnPath: string;
  /** Connector colour (default). */
  linkColor: string;
  /** Connector colour on the active path. */
  linkColorActive: string;
  /** Title text colour. */
  titleColor: string;
  /** Subtitle text colour. */
  subtitleColor: string;
  /** Colour of the "more" (⋯) button. */
  moreColor: string;
  /** Text / icon colour when sitting on an accent fill (the current mini dot). */
  accentText: string;
  /** Body font stack. */
  fontFamily: string;
  /** Monospace font stack (tag chip). */
  monoFamily: string;
}
