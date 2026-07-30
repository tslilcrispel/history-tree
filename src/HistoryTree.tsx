import * as React from "react";
import type {
  HistoryStep,
  HistoryTreeTheme,
  LaidOutNode,
  LayoutOptions,
  MiniLayoutOptions,
} from "./types";
import { ancestorsOf, computeLayout, DEFAULT_LAYOUT, DEFAULT_MINI } from "./layout";
import { DEFAULT_ACCENT, resolveTheme } from "./theme";
import { cssVar, type HistoryTreeCssVars } from "./cssVars";

/** Signature shared by the step event handlers. */
export type StepHandler<T> = (
  step: HistoryStep<T>,
  event: React.MouseEvent
) => void;

export interface HistoryTreeProps<T = unknown> {
  /** The full set of steps. Order is preserved for sibling layout. */
  steps: HistoryStep<T>[];
  /** Id of the currently active step; highlights it and the path back to the root. */
  currentStepId?: string | null;
  /**
   * `"tree"` (default) renders the full branching tree. `"mini"` renders the
   * compact horizontal strip of step dots — the collapsed history from GraphScope.
   */
  variant?: "tree" | "mini";
  /** Colour / font overrides, merged over the dark default. */
  theme?: Partial<HistoryTreeTheme>;
  /**
   * CSS custom properties set inline on the root, e.g.
   * `{ "--ht-card-radius": "4px", "--ht-title-color": "#fff" }`.
   *
   * Every painted value is written as `var(--ht-…, <theme fallback>)`, so the
   * same variables can equally be set from a stylesheet — on an ancestor, on
   * `:root`, in a media query, or in a `.ht-card:hover` rule. Values are raw
   * CSS: lengths need their unit. See {@link HistoryTreeCssVars}.
   */
  cssVars?: HistoryTreeCssVars;
  /** Geometry overrides for the tree (column width, card size, padding…). */
  layout?: Partial<LayoutOptions>;
  /** Geometry overrides for the `"mini"` strip (dot sizes, connector width…). */
  mini?: Partial<MiniLayoutOptions>;
  /**
   * In `"mini"`, show the current step's title/subtitle after the dot strip
   * (default `true`). Ignored in `"tree"`.
   */
  showCurrentSummary?: boolean;

  /** Fired when a step card is clicked (e.g. restore that step). */
  onStepClick?: StepHandler<T>;
  /** Fired on hover enter (`step`) and leave (`null`). */
  onStepHover?: (step: HistoryStep<T> | null, event: React.MouseEvent) => void;
  /**
   * Fired when the per-step "more" affordance is triggered: clicking the ⋯
   * button (tree only) **or right-clicking a step** (tree and mini). The ⋯
   * button only renders when this handler is provided, and right-click
   * suppresses the browser's native context menu. Use it to open a menu,
   * branch, etc. — `event.clientX/clientY` give you the anchor point.
   */
  onStepMore?: StepHandler<T>;
  /** Only reveal the ⋯ button on hover / focus (default `true`). */
  moreOnHoverOnly?: boolean;

  /** Rendered when `steps` is empty. */
  emptyState?: React.ReactNode;

  /** Replace the default card body. You still get positioning for free. */
  renderCard?: (node: LaidOutNode<T>) => React.ReactNode;

  /** Extra class on the root element. */
  className?: string;
  /** Extra styles on the root element (e.g. `minWidth: "100%"`). */
  style?: React.CSSProperties;
  /** Accessible label for the tree region. */
  ariaLabel?: string;
}

/** Join class names, skipping the empty ones. */
const cx = (...parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" ");

/** Custom properties aren't in `CSSProperties`; React passes them through fine. */
const varStyle = (vars?: HistoryTreeCssVars): React.CSSProperties | undefined =>
  vars as React.CSSProperties | undefined;

/**
 * A branching step-history tree, or (with `variant="mini"`) a compact strip.
 *
 * Presentational and self-sizing: it renders at the natural size of its content
 * (`position: relative`). Wrap it in an `overflow: auto` container to scroll.
 *
 * Every colour, font, radius, and spacing it paints reads from a `--ht-*` CSS
 * custom property that falls back to the `theme` / `mini` props, and every
 * element carries a stable `ht-*` class plus `data-*` state attributes — so the
 * whole look can be driven from CSS instead of props if you prefer.
 */
export function HistoryTree<T = unknown>(props: HistoryTreeProps<T>) {
  const {
    steps,
    currentStepId,
    variant = "tree",
    theme: themeProp,
    cssVars,
    layout: layoutProp,
    mini: miniProp,
    showCurrentSummary = true,
    onStepClick,
    onStepHover,
    onStepMore,
    moreOnHoverOnly = true,
    emptyState,
    renderCard,
    className,
    style,
    ariaLabel = "History",
  } = props;

  const theme = React.useMemo(() => resolveTheme(themeProp), [themeProp]);
  const layout = React.useMemo(
    () => computeLayout(steps, currentStepId, layoutProp),
    [steps, currentStepId, layoutProp]
  );

  const [hoverId, setHoverId] = React.useState<string | null>(null);

  if (!steps.length) {
    return (
      <div
        className={cx("ht-root", "ht-empty-root", className)}
        style={{ ...rootBase, ...style, ...varStyle(cssVars) }}
        aria-label={ariaLabel}
      >
        {emptyState ?? (
          <div
            className="ht-empty"
            style={{
              padding: cssVar("--ht-empty-padding", "24px 16px"),
              fontSize: cssVar("--ht-empty-font-size", "12px"),
              textAlign: "center",
              color: cssVar(
                "--ht-empty-color",
                cssVar("--ht-subtitle-color", theme.subtitleColor)
              ),
              fontFamily: cssVar("--ht-font-family", theme.fontFamily),
            }}
          >
            — no steps yet —
          </div>
        )}
      </div>
    );
  }

  if (variant === "mini") {
    return (
      <MiniStrip
        steps={steps}
        currentStepId={currentStepId}
        theme={theme}
        cssVars={cssVars}
        mini={{ ...DEFAULT_MINI, ...miniProp }}
        showCurrentSummary={showCurrentSummary}
        onStepClick={onStepClick}
        onStepHover={onStepHover}
        onStepMore={onStepMore}
        className={className}
        style={style}
        ariaLabel={ariaLabel}
      />
    );
  }

  // When the root is stretched wider/taller than its content (e.g. the caller
  // passes `minWidth/minHeight: 100%`), position the whole graph along the axis
  // it grows on: horizontal layouts hug the side the direction points *from*
  // (RL → right, LR → left) and sit at the top; vertical layouts hug the top or
  // bottom (BT → bottom) and centre horizontally. The root is a flex container
  // (main axis = horizontal); the fixed-size content block below is placed
  // accordingly instead of always pinning to the top-left.
  const direction = layoutProp?.direction ?? DEFAULT_LAYOUT.direction;
  const horizontal = direction === "LR" || direction === "RL";
  const justifyContent = horizontal
    ? direction === "RL"
      ? "flex-end"
      : "flex-start"
    : "center";
  const alignItems = direction === "BT" ? "flex-end" : "flex-start";

  return (
    <div
      className={cx("ht-root", "ht-tree", className)}
      role="tree"
      aria-label={ariaLabel}
      data-direction={direction}
      style={{
        ...rootBase,
        display: "flex",
        justifyContent,
        alignItems,
        width: layout.width,
        height: layout.height,
        fontFamily: cssVar("--ht-font-family", theme.fontFamily),
        ...style,
        ...varStyle(cssVars),
      }}
    >
      <div
        className="ht-canvas"
        style={{
          position: "relative",
          flex: "0 0 auto",
          width: layout.width,
          height: layout.height,
        }}
      >
      <svg
        className="ht-links"
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      >
        {layout.links.map((ln) => (
          <path
            key={ln.id}
            className="ht-link"
            data-active={ln.active || undefined}
            d={ln.d}
            fill="none"
            style={{
              stroke: ln.active
                ? cssVar("--ht-link-color-active", theme.linkColorActive)
                : cssVar("--ht-link-color", theme.linkColor),
              strokeWidth: ln.active
                ? cssVar("--ht-link-width-active", 2)
                : cssVar("--ht-link-width", 1.4),
            }}
          />
        ))}
      </svg>

      {layout.nodes.map((node) => {
        const { step, disabled } = node;
        const accent = step.accent ?? DEFAULT_ACCENT;
        const accentVar = cssVar("--ht-accent", accent);
        const border = node.isCurrent
          ? cssVar("--ht-card-border-color-active", accentVar)
          : node.onPath
            ? cssVar("--ht-card-border-color-on-path", theme.cardBorderOnPath)
            : cssVar("--ht-card-border-color", theme.cardBorder);
        const background = node.isCurrent
          ? cssVar("--ht-card-bg-active", theme.cardBgActive)
          : node.onPath
            ? cssVar("--ht-card-bg-on-path", theme.cardBgOnPath)
            : cssVar("--ht-card-bg", theme.cardBg);
        const showMore =
          !disabled &&
          !!onStepMore &&
          (!moreOnHoverOnly || hoverId === step.id || node.isCurrent);

        return (
          <div
            key={step.id}
            className="ht-card"
            role="treeitem"
            aria-selected={node.isCurrent}
            aria-disabled={disabled || undefined}
            data-current={node.isCurrent || undefined}
            data-on-path={node.onPath || undefined}
            data-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            title={step.subtitle ? `${step.title} · ${step.subtitle}` : step.title}
            onClick={disabled ? undefined : (e) => onStepClick?.(step, e)}
            onContextMenu={
              onStepMore && !disabled
                ? (e) => {
                    e.preventDefault();
                    onStepMore(step, e);
                  }
                : undefined
            }
            onKeyDown={(e) => {
              if (!disabled && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onStepClick?.(step, e as unknown as React.MouseEvent);
              }
            }}
            onMouseEnter={(e) => {
              setHoverId(step.id);
              onStepHover?.(step, e);
            }}
            onMouseLeave={(e) => {
              setHoverId((cur) => (cur === step.id ? null : cur));
              onStepHover?.(null, e);
            }}
            style={{
              position: "absolute",
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
              padding: cssVar("--ht-card-padding", "6px 9px"),
              borderRadius: cssVar("--ht-card-radius", "9px"),
              cursor: disabled ? "not-allowed" : onStepClick ? "pointer" : "default",
              boxSizing: "border-box",
              overflow: "hidden",
              // Dashed + faded, so "disabled" reads without relying on opacity alone.
              borderWidth: cssVar("--ht-card-border-width", "1px"),
              borderStyle: disabled
                ? cssVar("--ht-card-border-style-disabled", "dashed")
                : cssVar("--ht-card-border-style", "solid"),
              borderColor: border,
              background,
              opacity: disabled
                ? cssVar("--ht-disabled-opacity", theme.disabledOpacity)
                : 1,
              boxShadow:
                node.isCurrent && !disabled
                  ? cssVar(
                      "--ht-card-shadow-active",
                      `0 0 0 1px ${accent}55, 0 0 14px ${accent}33`
                    )
                  : cssVar("--ht-card-shadow", "none"),
              transition: cssVar("--ht-transition", "all .12s"),
              // Always published, so `var(--ht-accent)` in your own rules
              // always resolves; steps with no accent of their own pick up
              // `--ht-accent-default` if you set one.
              "--ht-accent":
                step.accent ?? cssVar("--ht-accent-default", DEFAULT_ACCENT),
            } as React.CSSProperties}
          >
            {renderCard ? (
              renderCard(node)
            ) : (
              <DefaultCard node={node} theme={theme} accent={accent} />
            )}

            {showMore && (
              <button
                type="button"
                className="ht-more"
                aria-label="More actions"
                onClick={(e) => {
                  e.stopPropagation();
                  onStepMore?.(step, e);
                }}
                style={{
                  position: "absolute",
                  top: cssVar("--ht-more-offset", "4px"),
                  right: cssVar("--ht-more-offset", "4px"),
                  width: cssVar("--ht-more-size", "18px"),
                  height: cssVar("--ht-more-size", "18px"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  borderRadius: cssVar("--ht-more-radius", "5px"),
                  border: "none",
                  cursor: "pointer",
                  background: cssVar("--ht-more-bg", "transparent"),
                  color: cssVar("--ht-more-color", theme.moreColor),
                  fontSize: cssVar("--ht-more-font-size", "13px"),
                  lineHeight: 1,
                }}
              >
                ⋯
              </button>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

/** The compact horizontal "mini" strip: a flat, insertion-order row of dots. */
function MiniStrip<T>({
  steps,
  currentStepId,
  theme,
  cssVars,
  mini,
  showCurrentSummary,
  onStepClick,
  onStepHover,
  onStepMore,
  className,
  style,
  ariaLabel,
}: {
  steps: HistoryStep<T>[];
  currentStepId?: string | null;
  theme: HistoryTreeTheme;
  cssVars?: HistoryTreeCssVars;
  mini: MiniLayoutOptions;
  showCurrentSummary: boolean;
  onStepClick?: StepHandler<T>;
  onStepHover?: (step: HistoryStep<T> | null, event: React.MouseEvent) => void;
  onStepMore?: StepHandler<T>;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel: string;
}) {
  const byId = React.useMemo(() => {
    const m = new Map<string, HistoryStep<T>>();
    for (const s of steps) m.set(s.id, s);
    return m;
  }, [steps]);
  const onPath = React.useMemo(
    () => ancestorsOf(byId, currentStepId),
    [byId, currentStepId]
  );
  const current = currentStepId ? byId.get(currentStepId) : undefined;
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  return (
    <div
      className={cx("ht-root", "ht-mini", className)}
      role="list"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: cssVar("--ht-mini-summary-gap", `${mini.summaryGap}px`),
        maxWidth: "100%",
        fontFamily: cssVar("--ht-font-family", theme.fontFamily),
        padding: cssVar("--ht-mini-padding", "4px 0"),
        boxSizing: "border-box",
        ...style,
        ...varStyle(cssVars),
      }}
    >
      <div className="ht-mini-strip" style={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
        {steps.map((step, idx) => {
          const accent = step.accent ?? DEFAULT_ACCENT;
          const accentVar = cssVar("--ht-accent", accent);
          const isCurrent = step.id === currentStepId;
          const inPath = onPath.has(step.id);
          const disabled = step.disabled === true;
          // A disabled dot keeps its fade even while hovered.
          const opacity = disabled
            ? cssVar("--ht-disabled-opacity", theme.disabledOpacity)
            : !inPath && hoverId !== step.id
              ? cssVar("--ht-mini-inactive-opacity", mini.inactiveOpacity)
              : 1;
          const size = isCurrent ? mini.currentDotSize : mini.dotSize;
          const sizeVar = cssVar(
            isCurrent ? "--ht-mini-dot-size-active" : "--ht-mini-dot-size",
            `${size}px`
          );
          const tagIsText =
            typeof step.tag === "string" || typeof step.tag === "number";
          const tip = step.title + (step.subtitle ? " · " + step.subtitle : "");
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <span
                  aria-hidden
                  className="ht-mini-connector"
                  data-active={inPath || undefined}
                  style={{
                    width: cssVar("--ht-mini-connector-width", `${mini.connectorWidth}px`),
                    height: cssVar("--ht-mini-connector-height", "2px"),
                    flex: "0 0 auto",
                    background: inPath
                      ? cssVar(
                          "--ht-mini-connector-color-active",
                          cssVar("--ht-link-color-active", theme.linkColorActive)
                        )
                      : cssVar(
                          "--ht-mini-connector-color",
                          cssVar("--ht-link-color", theme.linkColor)
                        ),
                  }}
                />
              )}
              <button
                type="button"
                className="ht-mini-dot"
                role="listitem"
                aria-current={isCurrent}
                aria-disabled={disabled || undefined}
                data-current={isCurrent || undefined}
                data-on-path={inPath || undefined}
                data-disabled={disabled || undefined}
                title={tip}
                onClick={disabled ? undefined : (e) => onStepClick?.(step, e)}
                onContextMenu={
                  onStepMore && !disabled
                    ? (e) => {
                        e.preventDefault();
                        onStepMore(step, e);
                      }
                    : undefined
                }
                onMouseEnter={(e) => {
                  setHoverId(step.id);
                  onStepHover?.(step, e);
                }}
                onMouseLeave={(e) => {
                  setHoverId((cur) => (cur === step.id ? null : cur));
                  onStepHover?.(null, e);
                }}
                style={{
                  flex: "0 0 auto",
                  width: sizeVar,
                  height: sizeVar,
                  padding: 0,
                  borderRadius: cssVar("--ht-mini-dot-radius", "50%"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  // Icon dots scale with the dot itself, so overriding
                  // `--ht-mini-dot-size` alone keeps the glyph proportional.
                  fontSize: cssVar(
                    "--ht-mini-dot-font-size",
                    tagIsText ? "9px" : `calc(${sizeVar} * 0.5)`
                  ),
                  fontWeight: cssVar("--ht-mini-dot-font-weight", 700),
                  fontFamily: tagIsText
                    ? cssVar("--ht-mono-family", theme.monoFamily)
                    : cssVar("--ht-font-family", theme.fontFamily),
                  lineHeight: 1,
                  cursor: disabled ? "not-allowed" : onStepClick ? "pointer" : "default",
                  color: isCurrent
                    ? cssVar("--ht-mini-dot-color-active", theme.accentText)
                    : cssVar("--ht-mini-dot-color", accentVar),
                  background: isCurrent
                    ? cssVar("--ht-mini-dot-bg-active", accentVar)
                    : cssVar("--ht-mini-dot-bg", `${accent}22`),
                  borderWidth: cssVar("--ht-mini-dot-border-width", "1.5px"),
                  borderStyle: disabled
                    ? cssVar("--ht-card-border-style-disabled", "dashed")
                    : cssVar("--ht-card-border-style", "solid"),
                  borderColor: isCurrent
                    ? cssVar("--ht-mini-dot-border-color-active", accentVar)
                    : inPath
                      ? cssVar("--ht-mini-dot-border-color-on-path", `${accent}99`)
                      : cssVar("--ht-mini-dot-border-color", `${accent}44`),
                  boxShadow:
                    isCurrent && !disabled
                      ? cssVar("--ht-mini-dot-shadow-active", `0 0 10px ${accent}88`)
                      : cssVar("--ht-mini-dot-shadow", "none"),
                  opacity,
                  transition: cssVar("--ht-transition", "all .12s"),
                  "--ht-accent":
                    step.accent ?? cssVar("--ht-accent-default", DEFAULT_ACCENT),
                } as React.CSSProperties}
              >
                {step.tag}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {showCurrentSummary && current && (
        <div
          className="ht-mini-summary"
          style={{
            flex: "0 1 auto",
            minWidth: 0,
            borderLeft: `1px solid ${cssVar(
              "--ht-mini-summary-border-color",
              cssVar("--ht-card-border-color", theme.cardBorder)
            )}`,
            paddingLeft: cssVar("--ht-mini-summary-padding", "10px"),
          }}
        >
          <div
            className="ht-mini-summary-title"
            style={{
              fontSize: cssVar("--ht-mini-summary-title-font-size", "11px"),
              fontWeight: cssVar("--ht-mini-summary-title-font-weight", 650),
              color: cssVar(
                "--ht-mini-summary-title-color",
                cssVar("--ht-title-color", theme.titleColor)
              ),
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {current.title}
          </div>
          {current.subtitle != null && (
            <div
              className="ht-mini-summary-subtitle"
              style={{
                fontSize: cssVar("--ht-mini-summary-subtitle-font-size", "9px"),
                color: cssVar(
                  "--ht-mini-summary-subtitle-color",
                  cssVar("--ht-subtitle-color", theme.subtitleColor)
                ),
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {current.subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DefaultCard<T>({
  node,
  theme,
  accent,
}: {
  node: LaidOutNode<T>;
  theme: HistoryTreeTheme;
  accent: string;
}) {
  const { step } = node;
  // Plain strings/numbers render as a compact monospace label; anything else
  // (an icon element) gets a slightly larger, non-mono chip.
  const tagIsText = typeof step.tag === "string" || typeof step.tag === "number";
  return (
    <>
      <div
        className="ht-card-head"
        style={{
          display: "flex",
          alignItems: "center",
          gap: cssVar("--ht-tag-gap", "6px"),
        }}
      >
        {step.tag != null && step.tag !== "" && (
          <span
            className="ht-tag"
            style={{
              flex: "0 0 auto",
              width: cssVar("--ht-tag-size", "20px"),
              height: cssVar("--ht-tag-size", "20px"),
              borderRadius: cssVar("--ht-tag-radius", "6px"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: cssVar("--ht-tag-font-size", tagIsText ? "9px" : "11.5px"),
              fontWeight: cssVar("--ht-tag-font-weight", 700),
              fontFamily: tagIsText
                ? cssVar("--ht-mono-family", theme.monoFamily)
                : cssVar("--ht-font-family", theme.fontFamily),
              lineHeight: 1,
              color: cssVar("--ht-tag-color", cssVar("--ht-accent", accent)),
              background: cssVar("--ht-tag-bg", `${accent}22`),
              border: `${cssVar("--ht-tag-border-width", "1px")} solid ${cssVar(
                "--ht-tag-border-color",
                `${accent}55`
              )}`,
            }}
          >
            {step.tag}
          </span>
        )}
        <span
          className="ht-title"
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: cssVar("--ht-title-font-size", "11.5px"),
            fontWeight: cssVar("--ht-title-font-weight", 600),
            color: cssVar("--ht-title-color", theme.titleColor),
          }}
        >
          {step.title}
        </span>
      </div>

      {step.subtitle != null && (
        <div
          className="ht-subtitle"
          style={{
            fontSize: cssVar("--ht-subtitle-font-size", "9.5px"),
            color: cssVar("--ht-subtitle-color", theme.subtitleColor),
            marginTop: cssVar("--ht-subtitle-gap", "3px"),
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {step.subtitle}
        </div>
      )}
    </>
  );
}

const rootBase: React.CSSProperties = {
  position: "relative",
  boxSizing: "border-box",
};
