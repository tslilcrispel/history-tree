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

/**
 * A branching step-history tree, or (with `variant="mini"`) a compact strip.
 *
 * Presentational and self-sizing: it renders at the natural size of its content
 * (`position: relative`). Wrap it in an `overflow: auto` container to scroll.
 */
export function HistoryTree<T = unknown>(props: HistoryTreeProps<T>) {
  const {
    steps,
    currentStepId,
    variant = "tree",
    theme: themeProp,
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
      <div className={className} style={{ ...rootBase, ...style }} aria-label={ariaLabel}>
        {emptyState ?? (
          <div style={{ ...emptyBase, color: theme.subtitleColor, fontFamily: theme.fontFamily }}>
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
      className={className}
      role="tree"
      aria-label={ariaLabel}
      style={{
        ...rootBase,
        display: "flex",
        justifyContent,
        alignItems,
        width: layout.width,
        height: layout.height,
        fontFamily: theme.fontFamily,
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "0 0 auto",
          width: layout.width,
          height: layout.height,
        }}
      >
      <svg
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
      >
        {layout.links.map((ln) => (
          <path
            key={ln.id}
            d={ln.d}
            fill="none"
            stroke={ln.active ? theme.linkColorActive : theme.linkColor}
            strokeWidth={ln.active ? 2 : 1.4}
          />
        ))}
      </svg>

      {layout.nodes.map((node) => {
        const { step, disabled } = node;
        const accent = step.accent ?? DEFAULT_ACCENT;
        const border = node.isCurrent
          ? accent
          : node.onPath
            ? theme.cardBorderOnPath
            : theme.cardBorder;
        const background = node.isCurrent
          ? theme.cardBgActive
          : node.onPath
            ? theme.cardBgOnPath
            : theme.cardBg;
        const showMore =
          !disabled &&
          !!onStepMore &&
          (!moreOnHoverOnly || hoverId === step.id || node.isCurrent);

        return (
          <div
            key={step.id}
            role="treeitem"
            aria-selected={node.isCurrent}
            aria-disabled={disabled || undefined}
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
              padding: "6px 9px",
              borderRadius: 9,
              cursor: disabled ? "not-allowed" : onStepClick ? "pointer" : "default",
              boxSizing: "border-box",
              overflow: "hidden",
              // Dashed + faded, so "disabled" reads without relying on opacity alone.
              border: `1px ${disabled ? "dashed" : "solid"} ${border}`,
              background,
              opacity: disabled ? theme.disabledOpacity : 1,
              boxShadow:
                node.isCurrent && !disabled
                  ? `0 0 0 1px ${accent}55, 0 0 14px ${accent}33`
                  : "none",
              transition: "all .12s",
            }}
          >
            {renderCard ? (
              renderCard(node)
            ) : (
              <DefaultCard node={node} theme={theme} accent={accent} />
            )}

            {showMore && (
              <button
                type="button"
                aria-label="More actions"
                onClick={(e) => {
                  e.stopPropagation();
                  onStepMore?.(step, e);
                }}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  borderRadius: 5,
                  border: "none",
                  cursor: "pointer",
                  background: "transparent",
                  color: theme.moreColor,
                  fontSize: 13,
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
      className={className}
      role="list"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: mini.summaryGap,
        maxWidth: "100%",
        fontFamily: theme.fontFamily,
        padding: "4px 0",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
        {steps.map((step, idx) => {
          const accent = step.accent ?? DEFAULT_ACCENT;
          const isCurrent = step.id === currentStepId;
          const inPath = onPath.has(step.id);
          const disabled = step.disabled === true;
          // A disabled dot keeps its fade even while hovered.
          const opacity = disabled
            ? theme.disabledOpacity
            : !inPath && hoverId !== step.id
              ? mini.inactiveOpacity
              : 1;
          const size = isCurrent ? mini.currentDotSize : mini.dotSize;
          const tagIsText =
            typeof step.tag === "string" || typeof step.tag === "number";
          const tip = step.title + (step.subtitle ? " · " + step.subtitle : "");
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <span
                  aria-hidden
                  style={{
                    width: mini.connectorWidth,
                    height: 2,
                    flex: "0 0 auto",
                    background: inPath ? theme.linkColorActive : theme.linkColor,
                  }}
                />
              )}
              <button
                type="button"
                role="listitem"
                aria-current={isCurrent}
                aria-disabled={disabled || undefined}
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
                  width: size,
                  height: size,
                  padding: 0,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: tagIsText ? 9 : Math.round(size * 0.5),
                  fontWeight: 700,
                  fontFamily: tagIsText ? theme.monoFamily : theme.fontFamily,
                  lineHeight: 1,
                  cursor: disabled ? "not-allowed" : onStepClick ? "pointer" : "default",
                  color: isCurrent ? theme.accentText : accent,
                  background: isCurrent ? accent : `${accent}22`,
                  border: `1.5px ${disabled ? "dashed" : "solid"} ${
                    isCurrent ? accent : inPath ? `${accent}99` : `${accent}44`
                  }`,
                  boxShadow: isCurrent && !disabled ? `0 0 10px ${accent}88` : "none",
                  opacity,
                  transition: "all .12s",
                }}
              >
                {step.tag}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {showCurrentSummary && current && (
        <div
          style={{
            flex: "0 1 auto",
            minWidth: 0,
            borderLeft: `1px solid ${theme.cardBorder}`,
            paddingLeft: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 650,
              color: theme.titleColor,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {current.title}
          </div>
          {current.subtitle != null && (
            <div
              style={{
                fontSize: 9,
                color: theme.subtitleColor,
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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {step.tag != null && step.tag !== "" && (
          <span
            style={{
              flex: "0 0 auto",
              width: 20,
              height: 20,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: tagIsText ? 9 : 11.5,
              fontWeight: 700,
              fontFamily: tagIsText ? theme.monoFamily : theme.fontFamily,
              lineHeight: 1,
              color: accent,
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
            }}
          >
            {step.tag}
          </span>
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11.5,
            fontWeight: 600,
            color: theme.titleColor,
          }}
        >
          {step.title}
        </span>
      </div>

      {step.subtitle != null && (
        <div
          style={{
            fontSize: 9.5,
            color: theme.subtitleColor,
            marginTop: 3,
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

const emptyBase: React.CSSProperties = {
  padding: "24px 16px",
  fontSize: 12,
  textAlign: "center",
};
