import { describe, it, expect } from "vitest";
import {
  buildBookmarkIdMap,
  composeDefaultItems,
  composeHistoryItems,
  groupScoredItems,
} from "@/utils/listComposition";
import type { ActionItem } from "@/utils/types";

const tab = (over: Partial<ActionItem>): ActionItem => ({ title: "tab", source: "tab", ...over });
const bookmark = (over: Partial<ActionItem>): ActionItem => ({ title: "bm", source: "bookmark", ...over });
const action = (over: Partial<ActionItem>): ActionItem => ({ title: "act", source: "action", ...over });

describe("buildBookmarkIdMap", () => {
  it("maps each bookmarked url to its (first) bookmark id", () => {
    const map = buildBookmarkIdMap([
      { title: "A", url: "https://a.com", id: "id-a" },
      { title: "A dup", url: "https://a.com", id: "id-a2" },
      { title: "B", url: "https://b.com", id: "id-b" },
    ]);

    expect(map.get("https://a.com")).toBe("id-a");
    expect(map.get("https://b.com")).toBe("id-b");
  });

  it("ignores entries without a url or with a non-string id", () => {
    const map = buildBookmarkIdMap([
      { title: "no url", id: "x" },
      { title: "numeric id", url: "https://c.com", id: 5 },
    ]);

    expect(map.size).toBe(0);
  });
});

describe("composeDefaultItems", () => {
  it("orders tabs, then deduped bookmarks, then actions", () => {
    const result = composeDefaultItems({
      rawTabs: [{ title: "Tab", url: "https://tab.com", id: 1 }],
      rawBookmarks: [{ title: "Book", url: "https://book.com", id: "b1" }],
      browserActions: [{ title: "Act", action: "bp-x" }],
    });

    expect(result.map((i) => i.source)).toEqual(["tab", "bookmark", "action"]);
  });

  it("drops a bookmark whose url is already an open tab and tags the tab with its bookmark id", () => {
    const result = composeDefaultItems({
      rawTabs: [{ title: "GitHub", url: "https://github.com", id: 1 }],
      rawBookmarks: [{ title: "GitHub bookmark", url: "https://github.com", id: "bk-1" }],
      browserActions: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ source: "tab", bookmarkId: "bk-1" });
  });

  it("filters out a browser action already present as an open tab", () => {
    const result = composeDefaultItems({
      rawTabs: [{ title: "Downloads", action: "bp-open-downloads-tab", id: 2 }],
      rawBookmarks: [],
      browserActions: [{ title: "Downloads", action: "bp-open-downloads-tab" }],
    });

    expect(result.some((i) => i.source === "action")).toBe(false);
  });
});

describe("composeHistoryItems", () => {
  it("tags rows as history and attaches a bookmark id when the url is bookmarked", () => {
    const result = composeHistoryItems({
      histories: [
        { title: "Bookmarked page", url: "https://saved.com" },
        { title: "Plain page", url: "https://plain.com" },
      ],
      rawBookmarks: [{ title: "Saved", url: "https://saved.com", id: "bk-9" }],
    });

    expect(result[0]).toMatchObject({ source: "history", bookmarkId: "bk-9" });
    expect(result[1]).toMatchObject({ source: "history", bookmarkId: undefined });
  });
});

describe("groupScoredItems", () => {
  const scored: ActionItem[] = [
    tab({ title: "T1" }),
    bookmark({ title: "B1", url: "https://b1.com" }),
    action({ title: "A1", action: "bp-a1" }),
  ];

  it("groups into tab → action → bookmark order", () => {
    const result = groupScoredItems({
      scored,
      showFavorites: false,
      favoriteKeys: new Set(),
      favoriteItems: [],
    });

    expect(result.map((i) => i.source)).toEqual(["tab", "action", "bookmark"]);
  });

  it("pins the web-search item to the top of the actions section", () => {
    const web = action({ title: "“q”", action: "bp-search-web", query: "q" });
    const result = groupScoredItems({
      scored,
      showFavorites: false,
      favoriteKeys: new Set(),
      favoriteItems: [],
      webSearchItem: web,
    });

    const actions = result.filter((i) => i.source === "action");
    expect(actions[0]).toBe(web);
  });

  it("lifts favorited rows out of their section and pins favorites on top", () => {
    const favItem = bookmark({ title: "Fav", url: "https://fav.com", source: "favorite", favoriteKind: "bookmark" });
    const result = groupScoredItems({
      scored: [...scored, bookmark({ title: "Fav source", url: "https://fav.com" })],
      showFavorites: true,
      favoriteKeys: new Set(["https://fav.com"]),
      favoriteItems: [favItem],
    });

    // Favorite is first, and the duplicate bookmark row was removed from its section.
    expect(result[0]).toBe(favItem);
    expect(result.filter((i) => i.url === "https://fav.com")).toHaveLength(1);
  });

  it("does not pin favorites when showFavorites is false (typing a query)", () => {
    const favItem = bookmark({ title: "Fav", url: "https://fav.com" });
    const result = groupScoredItems({
      scored,
      showFavorites: false,
      favoriteKeys: new Set(["https://b1.com"]),
      favoriteItems: [favItem],
    });

    expect(result).not.toContain(favItem);
    // The matching bookmark stays in its normal section.
    expect(result.some((i) => i.url === "https://b1.com")).toBe(true);
  });
});
