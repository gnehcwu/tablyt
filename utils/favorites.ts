import type { ActionItem } from "@/utils/types";

// A persisted favorite. Only bookmarks and browser actions can be favorited —
// open tabs are ephemeral. Stored as a plain JSON array in chrome.storage.local
// (icons are never stored; action icons are re-resolved from BROWSER_ACTIONS at
// render time, bookmarks fall back to the favicon service).
export type FavoriteEntry =
  | { kind: "bookmark"; key: string; id?: string; title: string; url: string; domain?: string }
  | { kind: "action"; key: string; action: string; title: string; domain?: string };

export const FAVORITES_STORAGE_KEY = "tablyt:favorites";

export async function getFavorites(): Promise<FavoriteEntry[]> {
  const stored = await chrome.storage.local.get(FAVORITES_STORAGE_KEY);
  const value = stored[FAVORITES_STORAGE_KEY];
  return Array.isArray(value) ? (value as FavoriteEntry[]) : [];
}

export async function setFavorites(favorites: FavoriteEntry[]): Promise<void> {
  await chrome.storage.local.set({ [FAVORITES_STORAGE_KEY]: favorites });
}

// Add or remove an entry, matching on `key`. Returns the new list.
export async function toggleFavorite(entry: FavoriteEntry): Promise<FavoriteEntry[]> {
  const current = await getFavorites();
  const exists = current.some((f) => f.key === entry.key);
  const next = exists ? current.filter((f) => f.key !== entry.key) : [...current, entry];
  await setFavorites(next);
  return next;
}

// The stable favorite key for a list item, or undefined when it can't be
// favorited (open tabs, the web-search fallback). Actions key off their action
// constant; bookmarks key off their URL.
export function favoriteKeyForItem(item: ActionItem): string | undefined {
  if (item.source === "action" || item.favoriteKind === "action") return item.action;
  if (item.source === "bookmark" || item.favoriteKind === "bookmark") return item.url;
  return undefined;
}

// Build a FavoriteEntry from a list item, or null when the item isn't favoritable.
export function entryForItem(item: ActionItem): FavoriteEntry | null {
  if (item.source === "action" || item.favoriteKind === "action") {
    if (!item.action) return null;
    return { kind: "action", key: item.action, action: item.action, title: item.title, domain: item.domain };
  }
  if (item.source === "bookmark" || item.favoriteKind === "bookmark") {
    if (!item.url) return null;
    return {
      kind: "bookmark",
      key: item.url,
      id: typeof item.id === "string" ? item.id : undefined,
      title: item.title,
      url: item.url,
      domain: item.domain,
    };
  }
  return null;
}

// Subscribe to favorites changes. Emits the current value immediately, then on
// every storage write. Returns an unsubscribe function. Mirrors `subscribeTheme`.
export function subscribeFavorites(callback: (favorites: FavoriteEntry[]) => void): () => void {
  getFavorites().then(callback);

  const storageListener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName
  ) => {
    if (area !== "local" || !(FAVORITES_STORAGE_KEY in changes)) return;
    const next = changes[FAVORITES_STORAGE_KEY].newValue;
    callback(Array.isArray(next) ? (next as FavoriteEntry[]) : []);
  };
  chrome.storage.onChanged.addListener(storageListener);

  return () => {
    chrome.storage.onChanged.removeListener(storageListener);
  };
}
