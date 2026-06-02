import type { ActionItem } from "@/utils/types";
import { favoriteKeyForItem } from "@/utils/favorites";

// Fixed display order for the merged default scope: open tabs → actions →
// bookmarks. (Within `groupScoredItems` each section is already score-sorted.)
export const SECTION_ORDER = ["tab", "action", "bookmark"] as const;

// Map each bookmarked URL to its bookmark id, so tab/history rows can show a
// bookmark indicator and offer "Remove bookmark" without a duplicate row.
export function buildBookmarkIdMap(rawBookmarks: ActionItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const b of rawBookmarks) {
    if (b.url && typeof b.id === "string" && !map.has(b.url)) {
      map.set(b.url, b.id);
    }
  }
  return map;
}

// Default scope: open tabs + deduped bookmarks + browser actions, each tagged
// with its `source`. A bookmark whose URL is already open is dropped (switching
// beats opening a duplicate); the open tab instead carries that bookmark's id.
// Browser actions already represented by an open tab are filtered out.
export function composeDefaultItems({
  rawTabs,
  rawBookmarks,
  browserActions,
}: {
  rawTabs: ActionItem[];
  rawBookmarks: ActionItem[];
  browserActions: ActionItem[];
}): ActionItem[] {
  const bookmarkIdByUrl = buildBookmarkIdMap(rawBookmarks);

  const tabs: ActionItem[] = rawTabs.map((item) => ({
    ...item,
    source: "tab",
    bookmarkId: item.url ? bookmarkIdByUrl.get(item.url) : undefined,
  }));
  const openTabUrls = new Set(tabs.map((t) => t.url));
  const bookmarks: ActionItem[] = rawBookmarks
    .filter((b) => !openTabUrls.has(b.url))
    .map((item) => ({ ...item, source: "bookmark" }));
  const actions: ActionItem[] = browserActions
    .filter((a) => !tabs.some((t) => t.action === a.action))
    .map((a) => ({ ...a, source: "action" as const }));

  return [...tabs, ...bookmarks, ...actions];
}

// History scope: tag rows as history and attach a bookmark id when the URL is
// already bookmarked (so history rows can be (un)bookmarked in place).
export function composeHistoryItems({
  histories,
  rawBookmarks,
}: {
  histories: ActionItem[];
  rawBookmarks: ActionItem[];
}): ActionItem[] {
  const bookmarkIdByUrl = buildBookmarkIdMap(rawBookmarks);
  return histories.map((item) => ({
    ...item,
    source: "history" as const,
    bookmarkId: item.url ? bookmarkIdByUrl.get(item.url) : undefined,
  }));
}

// Group an already-scored list into the fixed section order. When `showFavorites`
// is set, favorited rows are lifted out of their normal sections (matched by
// `favoriteKeys`) and the resolved `favoriteItems` are pinned at the top. A
// `webSearchItem`, when provided, pins to the top of the actions section.
export function groupScoredItems({
  scored,
  showFavorites,
  favoriteKeys,
  favoriteItems,
  webSearchItem,
}: {
  scored: ActionItem[];
  showFavorites: boolean;
  favoriteKeys: Set<string>;
  favoriteItems: ActionItem[];
  webSearchItem?: ActionItem;
}): ActionItem[] {
  // Dedup: a favorited item lives only in the pinned Favorites section.
  const working = showFavorites
    ? scored.filter((item) => {
        const key = favoriteKeyForItem(item);
        return !(key !== undefined && favoriteKeys.has(key));
      })
    : scored;

  const sectionItems: Record<string, ActionItem[]> = {
    tab: working.filter((item) => item.source === "tab"),
    action: working.filter((item) => item.source === "action"),
    bookmark: working.filter((item) => item.source === "bookmark"),
  };

  if (webSearchItem) {
    sectionItems.action = [webSearchItem, ...sectionItems.action];
  }

  const grouped = SECTION_ORDER.flatMap((src) => sectionItems[src]);
  return showFavorites ? [...favoriteItems, ...grouped] : grouped;
}
