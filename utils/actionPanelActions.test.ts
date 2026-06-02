import { describe, it, expect, vi } from "vitest";
import { getPanelActions, type PanelActionCtx } from "@/utils/actionPanelActions";
import { BP_SEARCH_WEB, BP_OPEN_OPTIONS } from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

// A ctx with every operation stubbed; isFavorite defaults to false.
function makeCtx(over: Partial<PanelActionCtx> = {}): PanelActionCtx {
  return {
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
    switchToTab: vi.fn(),
    open: vi.fn(),
    duplicateTab: vi.fn(),
    bookmarkItem: vi.fn(),
    removeItemBookmark: vi.fn(),
    closeTab: vi.fn(),
    removeBookmark: vi.fn(),
    openCommand: vi.fn(),
    ...over,
  };
}

const keys = (actions: { key: string }[]) => actions.map((a) => a.key);

describe("getPanelActions", () => {
  it("gives no panel to the synthetic web-search row", () => {
    const item: ActionItem = { title: "“q”", action: BP_SEARCH_WEB, query: "q", source: "action" };

    expect(getPanelActions(item, makeCtx())).toEqual([]);
  });

  describe("tab rows", () => {
    const tab: ActionItem = { id: 1, title: "Tab", url: "https://t.com", source: "tab" };

    it("offers switch, duplicate, bookmark, close", () => {
      expect(keys(getPanelActions(tab, makeCtx()))).toEqual(["switch", "duplicate", "bookmark", "close"]);
    });

    it("offers 'Remove bookmark' instead of 'Bookmark' when the tab is already bookmarked", () => {
      const bookmarkedTab = { ...tab, bookmarkId: "bk-1" };
      expect(keys(getPanelActions(bookmarkedTab, makeCtx()))).toContain("unbookmark");
    });

    it("wires each action to its ctx operation", () => {
      const ctx = makeCtx();
      const actions = getPanelActions(tab, ctx);

      actions.find((a) => a.key === "switch")!.run();
      actions.find((a) => a.key === "close")!.run();

      expect(ctx.switchToTab).toHaveBeenCalledWith(tab);
      expect(ctx.closeTab).toHaveBeenCalledWith(tab);
    });
  });

  describe("bookmark rows", () => {
    const bookmark: ActionItem = { id: "b1", title: "BM", url: "https://b.com", source: "bookmark" };

    it("offers open, favorite, remove", () => {
      expect(keys(getPanelActions(bookmark, makeCtx()))).toEqual(["open", "favorite", "remove"]);
    });

    it("labels the favorite action based on current favorite state", () => {
      const notFav = getPanelActions(bookmark, makeCtx({ isFavorite: () => false }));
      const isFav = getPanelActions(bookmark, makeCtx({ isFavorite: () => true }));

      expect(notFav.find((a) => a.key === "favorite")!.label).toBe("Add to favorites");
      expect(isFav.find((a) => a.key === "favorite")!.label).toBe("Remove from favorites");
    });
  });

  describe("browser action rows", () => {
    const action: ActionItem = { title: "Settings", action: BP_OPEN_OPTIONS, source: "action" };

    it("offers favorite and open-command", () => {
      expect(keys(getPanelActions(action, makeCtx()))).toEqual(["favorite", "open-command"]);
    });
  });

  describe("history rows", () => {
    const history: ActionItem = { id: "h1", title: "Old", url: "https://o.com", source: "history" };

    it("offers open and bookmark toggle", () => {
      expect(keys(getPanelActions(history, makeCtx()))).toEqual(["open", "bookmark"]);
    });
  });

  describe("favorite rows", () => {
    it("routes a favorited bookmark to the bookmark action set", () => {
      const fav: ActionItem = {
        title: "Fav",
        url: "https://f.com",
        source: "favorite",
        favoriteKind: "bookmark",
      };

      expect(keys(getPanelActions(fav, makeCtx()))).toEqual(["open", "favorite", "remove"]);
    });

    it("routes a favorited browser action to the action set", () => {
      const fav: ActionItem = {
        title: "Fav action",
        action: BP_OPEN_OPTIONS,
        source: "favorite",
        favoriteKind: "action",
      };

      expect(keys(getPanelActions(fav, makeCtx()))).toEqual(["favorite", "open-command"]);
    });
  });
});
