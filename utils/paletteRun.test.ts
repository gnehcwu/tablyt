import { describe, it, expect } from "vitest";
import { buildRunPlan } from "@/utils/paletteRun";
import {
  BP_OPEN_TAB,
  BP_SEARCH_WEB,
  BP_OPEN_OPTIONS,
  ACTION_MODE,
} from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

describe("buildRunPlan", () => {
  it("switches an open tab by its numeric tab id", () => {
    const tab: ActionItem = { id: 42, title: "GitHub", url: "https://github.com", source: "tab" };

    const plan = buildRunPlan(tab);

    expect(plan).toEqual({
      kind: "message",
      message: { action: BP_OPEN_TAB, url: "https://github.com", tabId: 42, query: undefined },
    });
  });

  // Regression: a bookmark's `id` is a *bookmark* id, not a tab id. Sending it
  // as tabId made the background try (and fail) to switch to a nonexistent tab,
  // so nothing opened. Bookmarks must open by url with no tabId.
  it("opens a bookmark by url and never sends its bookmark id as tabId", () => {
    const bookmark: ActionItem = {
      id: "bookmark-123",
      title: "Docs",
      url: "https://docs.example.com",
      source: "bookmark",
    };

    const plan = buildRunPlan(bookmark);

    expect(plan).toEqual({
      kind: "message",
      message: { action: BP_OPEN_TAB, url: "https://docs.example.com", tabId: undefined, query: undefined },
    });
  });

  it("opens a history row by url with no tabId", () => {
    const history: ActionItem = { id: "h-1", title: "Old page", url: "https://old.example.com", source: "history" };

    const plan = buildRunPlan(history);

    expect(plan.kind).toBe("message");
    expect(plan).toMatchObject({ message: { url: "https://old.example.com", tabId: undefined } });
  });

  it("opens a favorited bookmark by url, not as a tab", () => {
    const favorite: ActionItem = {
      id: "bookmark-9",
      title: "Pinned",
      url: "https://pinned.example.com",
      source: "favorite",
      favoriteKind: "bookmark",
    };

    const plan = buildRunPlan(favorite);

    expect(plan).toMatchObject({ message: { url: "https://pinned.example.com", tabId: undefined } });
  });

  it("returns a mode switch for items carrying an actionMode", () => {
    const historyAction: ActionItem = {
      title: "History",
      action: "bp-open-history-tab",
      actionMode: ACTION_MODE.HISTORY,
      source: "action",
    };

    expect(buildRunPlan(historyAction)).toEqual({ kind: "mode", mode: ACTION_MODE.HISTORY });
  });

  it("uses the item's own action constant for browser actions", () => {
    const action: ActionItem = { title: "Tablyt settings", action: BP_OPEN_OPTIONS, source: "action" };

    expect(buildRunPlan(action)).toMatchObject({ message: { action: BP_OPEN_OPTIONS, tabId: undefined } });
  });

  it("carries the query for the web-search row", () => {
    const web: ActionItem = { title: "“cats”", action: BP_SEARCH_WEB, query: "cats", source: "action" };

    expect(buildRunPlan(web)).toMatchObject({ message: { action: BP_SEARCH_WEB, query: "cats" } });
  });

  it("defaults to BP_OPEN_TAB when an item has no explicit action", () => {
    const bare: ActionItem = { title: "Mystery", url: "https://x.example.com" };

    expect(buildRunPlan(bare)).toMatchObject({ message: { action: BP_OPEN_TAB } });
  });
});
