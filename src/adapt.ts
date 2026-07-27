import type { ReactNode } from "react";
import type { HistoryStep } from "./types";

/**
 * Shape of the raw step objects used by the GraphScope-style app state
 * (`state.steps` keyed by id). Only the fields the tree needs are typed;
 * anything else (like `snap`) is carried through as `data`.
 */
export interface RawStep {
  id: string;
  parent: string | null;
  logicName: string;
  inputLabel?: string;
  tag?: ReactNode;
  accent?: string;
  /** Render this step faded and non-interactive. */
  disabled?: boolean;
  /** Kept for host use (e.g. a side panel); the tree no longer renders these. */
  addedCount?: number;
  groupCount?: number;
  [k: string]: unknown;
}

/**
 * Convert a `{ [id]: RawStep }` map (as produced by `applyMerge` / `applyMergeSeed`)
 * into the `HistoryStep[]` this package renders. The original object is kept on
 * `data` so your event handlers can reach the snapshot etc.
 */
export function fromStepMap<T extends RawStep = RawStep>(
  stepMap: Record<string, T>
): HistoryStep<T>[] {
  return Object.values(stepMap).map((s) => ({
    id: s.id,
    parentId: s.parent ?? null,
    title: s.logicName,
    subtitle: s.inputLabel,
    tag: s.tag,
    accent: s.accent,
    disabled: s.disabled,
    data: s,
  }));
}
