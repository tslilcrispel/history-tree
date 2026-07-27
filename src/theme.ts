import type { HistoryTreeTheme } from "./types";

const FONT =
  "system-ui,-apple-system,'Segoe UI',sans-serif";
const MONO = "ui-monospace,monospace";

/** Dark theme (default), matching the reference GraphScope console. */
export const darkTheme: HistoryTreeTheme = {
  cardBg: "#0c121c",
  cardBgOnPath: "#0f1725",
  cardBgActive: "#141f30",
  cardBorder: "#1a2432",
  cardBorderOnPath: "#2c3c56",
  linkColor: "#1f2a3b",
  linkColorActive: "#3d5578",
  titleColor: "#e6edf3",
  subtitleColor: "#738299",
  moreColor: "#8ea3bd",
  accentText: "#0a0f18",
  disabledOpacity: 0.4,
  fontFamily: FONT,
  monoFamily: MONO,
};

/** Light theme companion. */
export const lightTheme: HistoryTreeTheme = {
  cardBg: "#f3f5f9",
  cardBgOnPath: "#f3f6fc",
  cardBgActive: "#e6eefb",
  cardBorder: "#d8dfea",
  cardBorderOnPath: "#b6c4dc",
  linkColor: "#dbe2ec",
  linkColorActive: "#93aed6",
  titleColor: "#15212f",
  subtitleColor: "#6a7a92",
  moreColor: "#5c6e88",
  accentText: "#0e1926",
  disabledOpacity: 0.45,
  fontFamily: FONT,
  monoFamily: MONO,
};

export const DEFAULT_ACCENT = "#8ea3bd";

/** Merge a partial theme over the dark default. */
export function resolveTheme(
  theme?: Partial<HistoryTreeTheme>
): HistoryTreeTheme {
  return theme ? { ...darkTheme, ...theme } : darkTheme;
}
