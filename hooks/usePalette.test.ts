import { describe, it, expect } from "vitest";
import { paletteReducer, INITIAL_STATE, type PaletteState } from "@/hooks/usePalette";
import { ACTION_TYPES, ACTION_MODE } from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

const state = (over: Partial<PaletteState> = {}): PaletteState => ({ ...INITIAL_STATE, ...over });

describe("paletteReducer", () => {
  it("TOGGLE_PALETTE flips open and resets search/selection/command", () => {
    const next = paletteReducer(state({ search: "x", selected: 3, command: ACTION_MODE.HISTORY }), {
      type: ACTION_TYPES.TOGGLE_PALETTE,
    });

    expect(next).toMatchObject({ open: true, search: "", selected: 0, command: "" });
  });

  it("DISMISS_PALETTE always closes and clears", () => {
    const next = paletteReducer(state({ open: true, search: "x", selected: 2 }), {
      type: ACTION_TYPES.DISMISS_PALETTE,
    });

    expect(next).toMatchObject({ open: false, search: "", selected: 0, command: "" });
  });

  it("SET_FILTER updates search and resets the selection to the top", () => {
    const next = paletteReducer(state({ selected: 5 }), { type: ACTION_TYPES.SET_FILTER, payload: "hello" });

    expect(next).toMatchObject({ search: "hello", selected: 0 });
  });

  it("SET_SELECTED moves the highlight without touching anything else", () => {
    const next = paletteReducer(state({ search: "keep" }), { type: ACTION_TYPES.SET_SELECTED, payload: 4 });

    expect(next).toMatchObject({ selected: 4, search: "keep" });
  });

  it("SET_COMMAND clears search/selection and turns on loading for History mode", () => {
    const next = paletteReducer(state({ search: "x", selected: 2 }), {
      type: ACTION_TYPES.SET_COMMAND,
      payload: ACTION_MODE.HISTORY,
    });

    expect(next).toMatchObject({ command: ACTION_MODE.HISTORY, search: "", selected: 0, loading: true });
  });

  it("SET_COMMAND back to default scope leaves loading off", () => {
    const next = paletteReducer(state({ command: ACTION_MODE.HISTORY, loading: true }), {
      type: ACTION_TYPES.SET_COMMAND,
      payload: "",
    });

    expect(next).toMatchObject({ command: "", loading: false });
  });

  it("SET_SCORED_ITEMS replaces the visible list", () => {
    const items: ActionItem[] = [{ title: "a" }, { title: "b" }];
    const next = paletteReducer(state(), { type: ACTION_TYPES.SET_SCORED_ITEMS, payload: items });

    expect(next.scoredActionItems).toBe(items);
  });
});
