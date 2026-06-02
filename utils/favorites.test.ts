import { describe, it, expect } from "vitest";
import {
  getFavorites,
  setFavorites,
  toggleFavorite,
  favoriteKeyForItem,
  entryForItem,
  subscribeFavorites,
  FAVORITES_STORAGE_KEY,
  type FavoriteEntry,
} from "@/utils/favorites";
import type { ActionItem } from "@/utils/types";

const bookmarkEntry: FavoriteEntry = {
  kind: "bookmark",
  key: "https://b.com",
  title: "B",
  url: "https://b.com",
};

describe("favorites storage", () => {
  it("returns an empty list when nothing is stored", async () => {
    expect(await getFavorites()).toEqual([]);
  });

  it("round-trips through chrome.storage.local", async () => {
    await setFavorites([bookmarkEntry]);
    expect(await getFavorites()).toEqual([bookmarkEntry]);
  });

  it("ignores a non-array stored value", async () => {
    await chrome.storage.local.set({ [FAVORITES_STORAGE_KEY]: "corrupt" });
    expect(await getFavorites()).toEqual([]);
  });

  it("toggleFavorite adds when absent and removes when present (matched by key)", async () => {
    const added = await toggleFavorite(bookmarkEntry);
    expect(added).toEqual([bookmarkEntry]);

    const removed = await toggleFavorite(bookmarkEntry);
    expect(removed).toEqual([]);
  });

  it("subscribeFavorites emits the current value, then on each change", async () => {
    const seen: FavoriteEntry[][] = [];
    const unsubscribe = subscribeFavorites((favs) => seen.push(favs));

    // Allow the initial async getFavorites().then(callback) to resolve.
    await Promise.resolve();
    await toggleFavorite(bookmarkEntry);

    unsubscribe();
    expect(seen[0]).toEqual([]);
    expect(seen.at(-1)).toEqual([bookmarkEntry]);
  });
});

describe("favoriteKeyForItem", () => {
  it("keys bookmarks off their url and actions off their action constant", () => {
    expect(favoriteKeyForItem({ title: "x", url: "https://u.com", source: "bookmark" })).toBe("https://u.com");
    expect(favoriteKeyForItem({ title: "x", action: "bp-a", source: "action" })).toBe("bp-a");
  });

  it("returns undefined for items that can't be favorited (tabs, web search)", () => {
    expect(favoriteKeyForItem({ title: "tab", url: "https://t.com", source: "tab" })).toBeUndefined();
  });

  it("resolves favorite rows via their favoriteKind", () => {
    const item: ActionItem = { title: "f", url: "https://f.com", source: "favorite", favoriteKind: "bookmark" };
    expect(favoriteKeyForItem(item)).toBe("https://f.com");
  });
});

describe("entryForItem", () => {
  it("builds a bookmark entry, keeping a string id but dropping a numeric one", () => {
    expect(entryForItem({ title: "B", url: "https://b.com", id: "bk-1", source: "bookmark" })).toMatchObject({
      kind: "bookmark",
      key: "https://b.com",
      id: "bk-1",
    });
    expect(entryForItem({ title: "B", url: "https://b.com", id: 5, source: "bookmark" })).toMatchObject({
      id: undefined,
    });
  });

  it("returns null for non-favoritable items", () => {
    expect(entryForItem({ title: "tab", url: "https://t.com", source: "tab" })).toBeNull();
  });
});
