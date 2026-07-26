import React from "react";
import {
  HistoryTree,
  fromStepMap,
  darkTheme,
  lightTheme,
  type HistoryStep,
  type RawStep,
  type LayoutDirection,
} from "history-tree";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRoute,
  faArrowsSpin,
  faUsers,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

/**
 * A small demo app that exercises every feature of `history-tree`:
 *  - feeding data (built from a GraphScope-style raw step map via `fromStepMap`)
 *  - onStepClick   → restore / set the current step
 *  - onStepMore    → open a real action menu (branch / set current / delete)
 *  - onStepHover   → live highlight in the side panel
 *  - theme + layout overrides
 */

// A `tag` can be any React node. This example mixes both kinds so you can see
// them together: some steps use a Font Awesome icon, others a short text label.
const icon = (def: IconDefinition) => <FontAwesomeIcon icon={def} />;

// The "logics" a branch can create — mirrors the GraphScope console.
// Tags are intentionally mixed: "EX"/"SA" are text, the rest are icons.
const LOGICS = [
  { logicName: "Expand Associates", tag: "EX", accent: "#4dd0e1", added: 8, groups: 0 },
  { logicName: "Shortest Path", tag: icon(faRoute), accent: "#5b9bff", added: 3, groups: 0 },
  { logicName: "Shared-Attribute", tag: "SA", accent: "#f7c948", added: 4, groups: 1 },
  { logicName: "Circular-Flow", tag: icon(faArrowsSpin), accent: "#ff6b6b", added: 5, groups: 1 },
  { logicName: "Community", tag: icon(faUsers), accent: "#b98bff", added: 0, groups: 2 },
] as const;

// Seed history: a small branching investigation. `parent`/children come from `parent`.
// Tags mix text ("●", "EX", "SA") and icons (Path, Community, Circular).
const SEED: Record<string, RawStep> = {
  s1: { id: "s1", parent: null, logicName: "Seed Entity", inputLabel: "Aria Vance", tag: "●", accent: "#8ea3bd", addedCount: 1, groupCount: 0 },
  s2: { id: "s2", parent: "s1", logicName: "Expand Associates", inputLabel: "Aria Vance", tag: "EX", accent: "#4dd0e1", addedCount: 8, groupCount: 0 },
  s3: { id: "s3", parent: "s2", logicName: "Shortest Path", inputLabel: "Aria, Ben", tag: icon(faRoute), accent: "#5b9bff", addedCount: 3, groupCount: 0 },
  s4: { id: "s4", parent: "s2", logicName: "Shared-Attribute", inputLabel: "3 people", tag: "SA", accent: "#f7c948", addedCount: 4, groupCount: 1 },
  s5: { id: "s5", parent: "s4", logicName: "Community", inputLabel: "whole graph", tag: icon(faUsers), accent: "#b98bff", addedCount: 0, groupCount: 2 },
  s6: { id: "s6", parent: "s3", logicName: "Circular-Flow", inputLabel: "12 accounts", tag: icon(faArrowsSpin), accent: "#ff6b6b", addedCount: 5, groupCount: 1 },
};

type MenuState = { step: HistoryStep<RawStep>; x: number; y: number } | null;

export function App() {
  const [stepMap, setStepMap] = React.useState<Record<string, RawStep>>(SEED);
  const [currentId, setCurrentId] = React.useState<string>("s4");
  const [dark, setDark] = React.useState(true);
  const [view, setView] = React.useState<"tree" | "mini">("tree");
  const [dir, setDir] = React.useState<LayoutDirection>("LR");
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<MenuState>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const nextId = React.useRef(7);

  // The library takes a flat array; convert the raw map (data payload preserved).
  const steps = React.useMemo(() => fromStepMap(stepMap), [stepMap]);

  const addLog = (msg: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...l].slice(0, 40));

  // ---- actions --------------------------------------------------------------
  const branchFrom = (parentId: string) => {
    const spec = LOGICS[Math.floor(Math.random() * LOGICS.length)];
    const id = `s${nextId.current++}`;
    setStepMap((m) => ({
      ...m,
      [id]: {
        id,
        parent: parentId,
        logicName: spec.logicName,
        inputLabel: "from " + parentId,
        tag: spec.tag,
        accent: spec.accent,
        addedCount: spec.added,
        groupCount: spec.groups,
      },
    }));
    setCurrentId(id);
    addLog(`branched → ${spec.logicName} (${id}) under ${parentId}`);
  };

  const deleteSubtree = (rootId: string) => {
    setStepMap((m) => {
      const kill = new Set<string>();
      const visit = (id: string) => {
        kill.add(id);
        for (const s of Object.values(m)) if (s.parent === id) visit(s.id);
      };
      visit(rootId);
      const next: Record<string, RawStep> = {};
      for (const s of Object.values(m)) if (!kill.has(s.id)) next[s.id] = s;
      if (kill.has(currentId)) {
        const fallback = m[rootId]?.parent ?? Object.keys(next)[0] ?? "";
        setCurrentId(fallback);
      }
      return next;
    });
    addLog(`deleted subtree at ${rootId}`);
  };

  const reset = () => {
    setStepMap(SEED);
    setCurrentId("s4");
    nextId.current = 7;
    addLog("reset to seed history");
  };

  // ---- render ---------------------------------------------------------------
  const c = dark ? colorsDark : colorsLight;

  return (
    <div style={{ ...page, background: c.pageBg, color: c.text }} onClick={() => setMenu(null)}>
      <header style={{ ...header, borderColor: c.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>history-tree</span>
          <span style={{ fontSize: 12, color: c.dim }}>interactive example</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", border: `1px solid ${c.border}`, borderRadius: 7, overflow: "hidden" }}>
          {(["tree", "mini"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                ...btn(c),
                border: "none",
                borderRadius: 0,
                textTransform: "capitalize",
                background: view === v ? c.border : "transparent",
              }}
            >
              {v}
            </button>
          ))}
        </div>
        {view === "tree" && (
          <select
            value={dir}
            onChange={(e) => setDir(e.target.value as LayoutDirection)}
            title="Layout direction"
            style={{ ...btn(c), appearance: "auto" }}
          >
            <option value="LR">Left → Right</option>
            <option value="RL">Right → Left</option>
            <option value="TB">Top → Bottom</option>
            <option value="BT">Bottom → Top</option>
          </select>
        )}
        <button style={btn(c)} onClick={reset}>Reset</button>
        <button style={btn(c)} onClick={() => branchFrom(currentId)}>
          + Branch from current
        </button>
        <button style={btn(c)} onClick={() => setDark((d) => !d)}>
          {dark ? "☾ Dark" : "☀ Light"}
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Scroll container — the component sizes itself to content. */}
        <div style={{ flex: 1, minWidth: 0, overflow: "auto", padding: 12 }}>
          <HistoryTree
            steps={steps}
            currentStepId={currentId}
            variant={view}
            layout={{ direction: dir }}
            theme={dark ? darkTheme : lightTheme}
            style={view === "tree" ? { minWidth: "100%", minHeight: "100%" } : undefined}
            onStepClick={(s) => {
              setCurrentId(s.id);
              addLog(`click → restore ${s.id} (${s.title})`);
            }}
            onStepHover={(s) => setHoverId(s ? s.id : null)}
            onStepMore={(s, e) => {
              e.stopPropagation();
              setMenu({ step: s, x: e.clientX, y: e.clientY });
              addLog(`more → menu for ${s.id}`);
            }}
          />
        </div>

        {/* Side panel: current + hover inspector, feature notes, event log. */}
        <aside style={{ ...aside, borderColor: c.border, background: c.panelBg }}>
          <Section title="Current step">
            <StepInfo step={stepMap[currentId]} dim={c.dim} />
          </Section>
          <Section title="Hovered step">
            {hoverId ? <StepInfo step={stepMap[hoverId]} dim={c.dim} /> : <Muted c={c}>— hover a card —</Muted>}
          </Section>
          <Section title="Try">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: c.dim }}>
              <li><b style={{ color: c.text }}>Click</b> a card to restore it (path highlights).</li>
              <li>Hover the <b style={{ color: c.text }}>current</b> card → the <b style={{ color: c.text }}>⋯</b> button appears.</li>
              <li><b style={{ color: c.text }}>Right-click</b> any node for the same menu (works in mini too).</li>
              <li><b style={{ color: c.text }}>⋯ → Branch</b> to grow a new child.</li>
              <li>Toggle the theme; drop a wide history to scroll.</li>
            </ul>
          </Section>
          <Section title="Event log">
            <div style={{ fontSize: 11, fontFamily: "ui-monospace,monospace", color: c.dim, lineHeight: 1.6, maxHeight: 220, overflow: "auto" }}>
              {log.length ? log.map((l, i) => <div key={i}>{l}</div>) : <Muted c={c}>— no events yet —</Muted>}
            </div>
          </Section>
        </aside>
      </div>

      {menu && (
        <MoreMenu
          menu={menu}
          c={c}
          onClose={() => setMenu(null)}
          onBranch={branchFrom}
          onSetCurrent={setCurrentId}
          onDelete={deleteSubtree}
        />
      )}
    </div>
  );
}

// ---- little presentational helpers -----------------------------------------

function MoreMenu({
  menu,
  c,
  onClose,
  onBranch,
  onSetCurrent,
  onDelete,
}: {
  menu: NonNullable<MenuState>;
  c: Palette;
  onClose: () => void;
  onBranch: (id: string) => void;
  onSetCurrent: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const id = menu.step.id;
  // Run the action, then always close the menu.
  const run = (fn: (id: string) => void) => () => {
    fn(id);
    onClose();
  };
  const item: React.CSSProperties = { padding: "7px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" };
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: Math.min(menu.x, window.innerWidth - 180),
        top: Math.min(menu.y, window.innerHeight - 130),
        zIndex: 100,
        minWidth: 160,
        background: c.panelBg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        boxShadow: "0 12px 30px rgba(0,0,0,.4)",
        padding: "4px 0",
        color: c.text,
      }}
    >
      <div style={{ padding: "6px 12px", fontSize: 10, letterSpacing: 0.6, color: c.dim, textTransform: "uppercase" }}>
        {menu.step.title}
      </div>
      <div style={item} onClick={run(onBranch)}>Branch from here</div>
      <div style={item} onClick={run(onSetCurrent)}>Set as current</div>
      <div style={{ ...item, color: "#ff8080" }} onClick={run(onDelete)}>Delete subtree</div>
    </div>
  );
}

function StepInfo({ step, dim }: { step?: RawStep; dim: string }) {
  if (!step) return <span style={{ color: dim, fontSize: 12 }}>—</span>;
  return (
    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
      <div><b>{step.logicName}</b> <code style={{ color: dim }}>({step.id})</code></div>
      <div style={{ color: dim }}>input: {step.inputLabel ?? "—"}</div>
      <div style={{ color: dim }}>parent: {step.parent ?? "root"} · +{step.addedCount ?? 0}n · +{step.groupCount ?? 0}g</div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", opacity: 0.6, fontWeight: 700, marginBottom: 8 }}>{title}</div>
    {children}
  </div>
);

const Muted = ({ children, c }: { children: React.ReactNode; c: Palette }) => (
  <span style={{ color: c.dim, fontSize: 12 }}>{children}</span>
);

// ---- palettes / styles ------------------------------------------------------

interface Palette { pageBg: string; panelBg: string; text: string; dim: string; border: string; }
const colorsDark: Palette = { pageBg: "#080b11", panelBg: "#0d1420", text: "#e6edf3", dim: "#738299", border: "#1a2432" };
const colorsLight: Palette = { pageBg: "#eef1f6", panelBg: "#ffffff", text: "#15212f", dim: "#66768e", border: "#d8dfea" };

const page: React.CSSProperties = { height: "100vh", display: "flex", flexDirection: "column", fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", overflow: "hidden" };
const header: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "0 16px", height: 52, flex: "0 0 auto", borderBottom: "1px solid" };
const aside: React.CSSProperties = { width: 300, flex: "0 0 auto", borderLeft: "1px solid", padding: 16, overflow: "auto" };
const btn = (c: Palette): React.CSSProperties => ({ fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 7, cursor: "pointer", color: c.text, background: "transparent", border: `1px solid ${c.border}` });
