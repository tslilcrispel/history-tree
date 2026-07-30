/**
 * CSS custom properties ("CSS variables") for the history tree.
 *
 * Every value the component paints is written as `var(--ht-…, <fallback>)`,
 * where the fallback is the resolved `theme` / geometry prop. So the styling
 * can be driven entirely from CSS — a stylesheet, a design-token file, a
 * `:root` block, a `@media (prefers-color-scheme: …)` query, a `:hover` rule —
 * without touching props, and nothing changes for callers who never set one.
 *
 * Precedence: an inline `cssVars` value ▸ a CSS rule ▸ the `theme`/`mini` props
 * ▸ the built-in defaults.
 */
import type { HistoryTreeTheme } from "./types";

/** Prefix shared by every custom property the component reads. */
export const CSS_VAR_PREFIX = "--ht-";

/**
 * Every custom property the component reads, grouped by what it styles.
 *
 * `-active` always means "the current step", `-on-path` means "on the path to
 * the current step". Length values need units (`"9px"`, not `9`).
 */
export const HISTORY_TREE_CSS_VARS = [
  // ── global ──────────────────────────────────────────────────────────────
  /** Body font stack, on both variants. */
  "--ht-font-family",
  /** Font stack of a text tag chip / dot. */
  "--ht-mono-family",
  /** Transition shorthand applied to cards and mini dots. */
  "--ht-transition",
  /** Opacity of a `disabled` step, in both variants. */
  "--ht-disabled-opacity",
  /**
   * Accent of the step being painted. **Read-only**: the component sets it on
   * every card and mini dot from `step.accent`, so your own rules can derive
   * from it — `--ht-tag-bg: color-mix(in srgb, var(--ht-accent) 20%, transparent)`.
   * It is always defined, so `var(--ht-accent)` never needs a fallback.
   */
  "--ht-accent",
  /** Accent used for steps that carry no `accent` of their own. */
  "--ht-accent-default",

  // ── empty state ─────────────────────────────────────────────────────────
  "--ht-empty-color",
  "--ht-empty-padding",
  "--ht-empty-font-size",

  // ── connectors (tree) ───────────────────────────────────────────────────
  "--ht-link-color",
  "--ht-link-color-active",
  "--ht-link-width",
  "--ht-link-width-active",

  // ── card (tree) ─────────────────────────────────────────────────────────
  "--ht-card-bg",
  "--ht-card-bg-on-path",
  "--ht-card-bg-active",
  "--ht-card-border-color",
  "--ht-card-border-color-on-path",
  "--ht-card-border-color-active",
  "--ht-card-border-width",
  "--ht-card-border-style",
  "--ht-card-border-style-disabled",
  "--ht-card-radius",
  "--ht-card-padding",
  "--ht-card-shadow",
  "--ht-card-shadow-active",

  // ── card text (tree) ────────────────────────────────────────────────────
  "--ht-title-color",
  "--ht-title-font-size",
  "--ht-title-font-weight",
  "--ht-subtitle-color",
  "--ht-subtitle-font-size",
  "--ht-subtitle-gap",

  // ── tag chip (tree) ─────────────────────────────────────────────────────
  "--ht-tag-size",
  "--ht-tag-radius",
  "--ht-tag-gap",
  "--ht-tag-font-size",
  "--ht-tag-font-weight",
  "--ht-tag-color",
  "--ht-tag-bg",
  "--ht-tag-border-color",
  "--ht-tag-border-width",

  // ── ⋯ button (tree) ─────────────────────────────────────────────────────
  "--ht-more-color",
  "--ht-more-bg",
  "--ht-more-size",
  "--ht-more-font-size",
  "--ht-more-radius",
  "--ht-more-offset",

  // ── mini strip ──────────────────────────────────────────────────────────
  "--ht-mini-padding",
  "--ht-mini-inactive-opacity",
  "--ht-mini-dot-size",
  "--ht-mini-dot-size-active",
  "--ht-mini-dot-radius",
  "--ht-mini-dot-font-size",
  "--ht-mini-dot-font-weight",
  "--ht-mini-dot-color",
  "--ht-mini-dot-color-active",
  "--ht-mini-dot-bg",
  "--ht-mini-dot-bg-active",
  "--ht-mini-dot-border-width",
  "--ht-mini-dot-border-color",
  "--ht-mini-dot-border-color-on-path",
  "--ht-mini-dot-border-color-active",
  "--ht-mini-dot-shadow",
  "--ht-mini-dot-shadow-active",
  "--ht-mini-connector-width",
  "--ht-mini-connector-height",
  "--ht-mini-connector-color",
  "--ht-mini-connector-color-active",
  "--ht-mini-summary-gap",
  "--ht-mini-summary-padding",
  "--ht-mini-summary-border-color",
  "--ht-mini-summary-title-color",
  "--ht-mini-summary-title-font-size",
  "--ht-mini-summary-title-font-weight",
  "--ht-mini-summary-subtitle-color",
  "--ht-mini-summary-subtitle-font-size",
] as const;

/** Name of one custom property read by the component, e.g. `"--ht-card-bg"`. */
export type HistoryTreeCssVar = (typeof HISTORY_TREE_CSS_VARS)[number];

/**
 * A set of custom properties to set inline on the component's root.
 *
 * Values are raw CSS, so lengths need their unit: `{ "--ht-card-radius": "4px" }`.
 */
export type HistoryTreeCssVars = Partial<
  Record<HistoryTreeCssVar, string | number>
>;

/** `var(--ht-name, fallback)` — the fallback keeps prop-based theming working. */
export function cssVar(
  name: HistoryTreeCssVar,
  fallback: string | number
): string {
  return `var(${name}, ${fallback})`;
}

/**
 * Translate a theme object into the matching custom properties.
 *
 * Handy for setting the colours somewhere other than the component — a `:root`
 * block, a portal, an ancestor that also styles your own chrome:
 *
 * ```tsx
 * <div style={themeToCssVars(lightTheme)}>…</div>
 * ```
 */
export function themeToCssVars(
  theme: Partial<HistoryTreeTheme>
): HistoryTreeCssVars {
  const vars: HistoryTreeCssVars = {};
  const set = (name: HistoryTreeCssVar, value: string | number | undefined) => {
    if (value !== undefined) vars[name] = value;
  };
  set("--ht-card-bg", theme.cardBg);
  set("--ht-card-bg-on-path", theme.cardBgOnPath);
  set("--ht-card-bg-active", theme.cardBgActive);
  set("--ht-card-border-color", theme.cardBorder);
  set("--ht-card-border-color-on-path", theme.cardBorderOnPath);
  set("--ht-link-color", theme.linkColor);
  set("--ht-link-color-active", theme.linkColorActive);
  set("--ht-title-color", theme.titleColor);
  set("--ht-subtitle-color", theme.subtitleColor);
  set("--ht-more-color", theme.moreColor);
  set("--ht-mini-dot-color-active", theme.accentText);
  set("--ht-disabled-opacity", theme.disabledOpacity);
  set("--ht-font-family", theme.fontFamily);
  set("--ht-mono-family", theme.monoFamily);
  return vars;
}
