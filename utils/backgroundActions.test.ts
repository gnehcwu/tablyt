import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  transformBookmarks,
  transformFolders,
  getHistories,
  handleActionMessage,
  type WxtBrowser,
} from "@/utils/backgroundActions";
import {
  BP_OPEN_TAB,
  BP_DUPLICATE_TAB,
  BP_CLOSE_TAB,
  BP_REMOVE_BOOKMARK,
  BP_ADD_BOOKMARK,
  BP_MOVE_BOOKMARK,
  BP_TOGGLE_MUTE,
  BP_OPEN_DOWNLOADS_TAB,
  BROWSER_ACTION_URL_MAP,
} from "@/utils/constants";

// A controlled browser mock with sensible resolved defaults; individual tests
// override the methods they care about. Cast to WxtBrowser for the call sites.
function makeBrowser() {
  return {
    tabs: {
      get: vi.fn().mockResolvedValue({ id: 1, windowId: 10 }),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
      duplicate: vi.fn().mockResolvedValue({}),
      query: vi.fn().mockResolvedValue([{ id: 5, url: "https://active.com", mutedInfo: { muted: false } }]),
    },
    windows: { update: vi.fn().mockResolvedValue({}) },
    bookmarks: {
      search: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue({}),
    },
    history: { search: vi.fn().mockResolvedValue([]) },
    runtime: { openOptionsPage: vi.fn().mockResolvedValue(undefined) },
  };
}

let browser: ReturnType<typeof makeBrowser>;
const run = (request: { action: string; [k: string]: unknown }) =>
  handleActionMessage(browser as unknown as WxtBrowser, request);

beforeEach(() => {
  browser = makeBrowser();
});

describe("transformBookmarks", () => {
  it("flattens the tree and builds a folder breadcrumb path", () => {
    const result = transformBookmarks([
      {
        id: "root",
        title: "Bookmarks Bar",
        children: [
          { id: "1", title: "GitHub", url: "https://github.com" },
          {
            id: "f",
            title: "Work",
            children: [{ id: "2", title: "Docs", url: "https://docs.example.com" }],
          },
        ],
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "1", url: "https://github.com", path: "Bookmarks Bar" });
    expect(result[1]).toMatchObject({ id: "2", path: `Bookmarks Bar${" › "}Work` });
  });

  it("skips nodes without a url and tolerates an unparseable url", () => {
    const result = transformBookmarks([
      { id: "sep", title: "separator" }, // no url, no children
      { id: "bad", title: "Bookmarklet", url: "javascript:void0" },
    ]);

    expect(result.map((b) => b.id)).toEqual(["bad"]);
    expect(result[0].domain).toBe(""); // URL() threw → empty domain, not a crash
  });
});

describe("transformFolders", () => {
  it("returns folders (not leaf bookmarks) with breadcrumb paths", () => {
    const result = transformFolders([
      {
        id: "root",
        title: "Bookmarks Bar",
        children: [
          { id: "1", title: "GitHub", url: "https://github.com" },
          {
            id: "f",
            title: "Work",
            children: [
              { id: "2", title: "Docs", url: "https://docs.example.com" },
              { id: "g", title: "Specs", children: [] },
            ],
          },
        ],
      },
    ]);

    // Bookmarks Bar, Work, Specs — leaf bookmarks excluded.
    expect(result.map((f) => f.id)).toEqual(["root", "f", "g"]);
    expect(result.every((f) => f.source === "folder")).toBe(true);
    expect(result.find((f) => f.id === "f")).toMatchObject({ title: "Work", path: "Bookmarks Bar" });
    expect(result.find((f) => f.id === "g")).toMatchObject({ path: `Bookmarks Bar${" › "}Work` });
  });
});

describe("getHistories", () => {
  it("dedupes history entries by url", async () => {
    browser.history.search.mockResolvedValue([
      { title: "A", url: "https://a.com" },
      { title: "A again", url: "https://a.com" },
      { title: "B", url: "https://b.com" },
      { title: "no url" },
    ]);

    const result = await getHistories(browser as unknown as WxtBrowser);

    expect(result.map((h) => h.url)).toEqual(["https://a.com", "https://b.com"]);
  });
});

describe("handleActionMessage routing", () => {
  it("declines actions it doesn't own", () => {
    expect(run({ action: "bp-not-a-real-action" })).toBeNull();
  });

  describe("BP_OPEN_TAB", () => {
    it("switches to an existing tab by id: focuses its window, then activates it", async () => {
      browser.tabs.get.mockResolvedValue({ id: 7, windowId: 99 });

      const res = await run({ action: BP_OPEN_TAB, tabId: 7 });

      expect(browser.tabs.get).toHaveBeenCalledWith(7);
      expect(browser.windows.update).toHaveBeenCalledWith(99, { focused: true });
      expect(browser.tabs.update).toHaveBeenCalledWith(7, { active: true });
      expect(browser.tabs.create).not.toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });

    // The original bug surfaced here: a bookmark id sent as `tabId` made tabs.get
    // reject and nothing opened. This guards the failure shape.
    it("reports failure when the tab id can't be resolved", async () => {
      browser.tabs.get.mockRejectedValue(new Error("No tab with id"));

      const res = await run({ action: BP_OPEN_TAB, tabId: 123 });

      expect(res).toEqual({ success: false });
      expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it("opens a new tab by url when no tab id is given (the bookmark/history path)", async () => {
      const res = await run({ action: BP_OPEN_TAB, url: "https://docs.example.com" });

      expect(browser.tabs.create).toHaveBeenCalledWith({ url: "https://docs.example.com" });
      expect(browser.tabs.get).not.toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });
  });

  describe("BP_DUPLICATE_TAB", () => {
    it("duplicates a specific tab by id", async () => {
      const res = await run({ action: BP_DUPLICATE_TAB, tabId: 3 });
      expect(browser.tabs.duplicate).toHaveBeenCalledWith(3);
      expect(res).toEqual({ success: true });
    });

    it("falls back to reopening the active tab's url when no id is given", async () => {
      browser.tabs.query.mockResolvedValue([{ id: 5, url: "https://active.com" }]);
      const res = await run({ action: BP_DUPLICATE_TAB });
      expect(browser.tabs.create).toHaveBeenCalledWith({ url: "https://active.com" });
      expect(res).toEqual({ success: true });
    });
  });

  describe("BP_CLOSE_TAB", () => {
    it("removes the tab when given an id", async () => {
      const res = await run({ action: BP_CLOSE_TAB, tabId: 8 });
      expect(browser.tabs.remove).toHaveBeenCalledWith(8);
      expect(res).toEqual({ success: true });
    });

    it("fails when no tab id is given", async () => {
      const res = await run({ action: BP_CLOSE_TAB });
      expect(browser.tabs.remove).not.toHaveBeenCalled();
      expect(res).toEqual({ success: false });
    });
  });

  describe("BP_REMOVE_BOOKMARK", () => {
    it("removes by bookmark id", async () => {
      const res = await run({ action: BP_REMOVE_BOOKMARK, bookmarkId: "bk-1" });
      expect(browser.bookmarks.remove).toHaveBeenCalledWith("bk-1");
      expect(res).toEqual({ success: true });
    });

    it("fails without a bookmark id", async () => {
      const res = await run({ action: BP_REMOVE_BOOKMARK });
      expect(browser.bookmarks.remove).not.toHaveBeenCalled();
      expect(res).toEqual({ success: false });
    });
  });

  describe("BP_ADD_BOOKMARK", () => {
    it("creates a bookmark when the url isn't already saved", async () => {
      browser.bookmarks.search.mockResolvedValue([]);
      const res = await run({ action: BP_ADD_BOOKMARK, url: "https://new.com", title: "New" });
      expect(browser.bookmarks.create).toHaveBeenCalledWith({ title: "New", url: "https://new.com" });
      expect(res).toEqual({ success: true });
    });

    it("is idempotent: skips creating when the url is already bookmarked", async () => {
      browser.bookmarks.search.mockResolvedValue([{ id: "existing" }]);
      const res = await run({ action: BP_ADD_BOOKMARK, url: "https://dup.com" });
      expect(browser.bookmarks.create).not.toHaveBeenCalled();
      expect(res).toEqual({ success: true });
    });

    it("falls back to the url as the title when none is provided", async () => {
      await run({ action: BP_ADD_BOOKMARK, url: "https://x.com" });
      expect(browser.bookmarks.create).toHaveBeenCalledWith({ title: "https://x.com", url: "https://x.com" });
    });

    it("creates inside the target folder when a parentId is given (bookmark-to-folder)", async () => {
      const res = await run({ action: BP_ADD_BOOKMARK, url: "https://n.com", title: "N", parentId: "folder-9" });
      expect(browser.bookmarks.create).toHaveBeenCalledWith({ title: "N", url: "https://n.com", parentId: "folder-9" });
      expect(res).toEqual({ success: true });
    });
  });

  describe("BP_MOVE_BOOKMARK", () => {
    it("moves a bookmark into the target folder", async () => {
      const res = await run({ action: BP_MOVE_BOOKMARK, bookmarkId: "bk-1", parentId: "folder-9" });
      expect(browser.bookmarks.move).toHaveBeenCalledWith("bk-1", { parentId: "folder-9" });
      expect(res).toEqual({ success: true });
    });

    it("fails when the bookmark id or parent id is missing", async () => {
      expect(await run({ action: BP_MOVE_BOOKMARK, bookmarkId: "bk-1" })).toEqual({ success: false });
      expect(await run({ action: BP_MOVE_BOOKMARK, parentId: "folder-9" })).toEqual({ success: false });
      expect(browser.bookmarks.move).not.toHaveBeenCalled();
    });

    it("reports failure when the move rejects", async () => {
      browser.bookmarks.move.mockRejectedValue(new Error("can't move"));
      const res = await run({ action: BP_MOVE_BOOKMARK, bookmarkId: "bk-1", parentId: "folder-9" });
      expect(res).toEqual({ success: false });
    });
  });

  describe("BP_TOGGLE_MUTE", () => {
    it("toggles mute on the active tab based on its current state", async () => {
      browser.tabs.query.mockResolvedValue([{ id: 5, mutedInfo: { muted: false } }]);
      const res = await run({ action: BP_TOGGLE_MUTE });
      expect(browser.tabs.update).toHaveBeenCalledWith(5, { muted: true });
      expect(res).toEqual({ success: true });
    });
  });

  describe("pure URL-opening browser actions", () => {
    it("opens the mapped URL in a new tab", async () => {
      const url = BROWSER_ACTION_URL_MAP[BP_OPEN_DOWNLOADS_TAB];
      const res = await run({ action: BP_OPEN_DOWNLOADS_TAB, url });
      expect(browser.tabs.create).toHaveBeenCalledWith({ url });
      expect(res).toEqual({ success: true });
    });
  });
});
