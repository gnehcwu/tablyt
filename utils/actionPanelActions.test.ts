import { describe, it, expect, vi } from "vitest";
import { getPanelActions, filterPanelActions, type PanelActionCtx } from "@/utils/actionPanelActions";
import { BP_SEARCH_WEB, BP_OPEN_OPTIONS } from "@/utils/constants";
import type { ActionItem, SubAction } from "@/utils/types";

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
    moveBookmark: vi.fn(),
    bookmarkToFolder: vi.fn(),
    copyLink: vi.fn(),
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

    it("offers switch, duplicate, copy-link, bookmark, bookmark-to-folder, close", () => {
      expect(keys(getPanelActions(tab, makeCtx()))).toEqual([
        "switch",
        "duplicate",
        "copy-link",
        "bookmark",
        "bookmark-folder",
        "close",
      ]);
    });

    it("offers 'Remove bookmark' and drops bookmark-to-folder when the tab is already bookmarked", () => {
      const bookmarkedTab = { ...tab, bookmarkId: "bk-1" };
      const ks = keys(getPanelActions(bookmarkedTab, makeCtx()));
      expect(ks).toContain("unbookmark");
      expect(ks).not.toContain("bookmark-folder");
    });

    it("wires each action to its ctx operation", () => {
      const ctx = makeCtx();
      const actions = getPanelActions(tab, ctx);

      actions.find((a) => a.key === "switch")!.run();
      actions.find((a) => a.key === "close")!.run();
      actions.find((a) => a.key === "bookmark-folder")!.run();
      actions.find((a) => a.key === "copy-link")!.run();

      expect(ctx.switchToTab).toHaveBeenCalledWith(tab);
      expect(ctx.closeTab).toHaveBeenCalledWith(tab);
      expect(ctx.bookmarkToFolder).toHaveBeenCalledWith(tab);
      expect(ctx.copyLink).toHaveBeenCalledWith(tab);
    });
  });

  describe("bookmark rows", () => {
    const bookmark: ActionItem = { id: "b1", title: "BM", url: "https://b.com", source: "bookmark" };

    it("offers open, copy-link, favorite, move, remove", () => {
      expect(keys(getPanelActions(bookmark, makeCtx()))).toEqual(["open", "copy-link", "favorite", "move", "remove"]);
    });

    it("wires the move action to ctx.moveBookmark", () => {
      const ctx = makeCtx();
      getPanelActions(bookmark, ctx).find((a) => a.key === "move")!.run();
      expect(ctx.moveBookmark).toHaveBeenCalledWith(bookmark);
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

    it("offers open-command first, then favorite", () => {
      expect(keys(getPanelActions(action, makeCtx()))).toEqual(["open-command", "favorite"]);
    });
  });

  describe("history rows", () => {
    const history: ActionItem = { id: "h1", title: "Old", url: "https://o.com", source: "history" };

    it("offers open, bookmark toggle, and bookmark-to-folder", () => {
      expect(keys(getPanelActions(history, makeCtx()))).toEqual(["open", "bookmark", "bookmark-folder"]);
    });

    it("drops bookmark-to-folder once the row is already bookmarked", () => {
      const bookmarked: ActionItem = { ...history, bookmarkId: "b1" };
      expect(keys(getPanelActions(bookmarked, makeCtx()))).toEqual(["open", "unbookmark"]);
    });
  });

  describe("filterPanelActions (fuzzy)", () => {
    const mk = (key: string, label: string): SubAction => ({ key, label, run: vi.fn() });
    const actions = [
      mk("switch", "Switch to"),
      mk("duplicate", "Duplicate"),
      mk("bookmark", "Bookmark"),
      mk("move", "Move to folder"),
      mk("close", "Close tab"),
    ];

    it("returns actions unchanged for an empty query", () => {
      expect(filterPanelActions(actions, "")).toEqual(actions);
      expect(filterPanelActions(actions, "   ")).toEqual(actions);
    });

    it("matches a contiguous substring and drops non-matches", () => {
      expect(keys(filterPanelActions(actions, "close"))).toEqual(["close"]);
    });

    it("matches a fuzzy acronym / word-jump, not just substrings", () => {
      // "mtf" → Move To Folder via word starts; no substring "mtf" exists.
      expect(keys(filterPanelActions(actions, "mtf"))).toContain("move");
    });

    it("ranks the best match first", () => {
      // "bo" matches the start of "Bookmark" strongly; it should lead.
      expect(keys(filterPanelActions(actions, "bo"))[0]).toBe("bookmark");
    });

    it("returns nothing when no label matches", () => {
      expect(filterPanelActions(actions, "zzzzz")).toEqual([]);
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

      expect(keys(getPanelActions(fav, makeCtx()))).toEqual(["open", "copy-link", "favorite", "move", "remove"]);
    });

    it("routes a favorited browser action to the action set", () => {
      const fav: ActionItem = {
        title: "Fav action",
        action: BP_OPEN_OPTIONS,
        source: "favorite",
        favoriteKind: "action",
      };

      expect(keys(getPanelActions(fav, makeCtx()))).toEqual(["open-command", "favorite"]);
    });
  });
});
