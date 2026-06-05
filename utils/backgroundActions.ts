import {
  BP_OPEN_TAB,
  BP_DUPLICATE_TAB,
  BP_CLOSE_TAB,
  BP_REMOVE_BOOKMARK,
  BP_ADD_BOOKMARK,
  BP_MOVE_BOOKMARK,
  BP_TOGGLE_MUTE,
  BP_OPEN_OPTIONS,
  BP_SEARCH_WEB,
  BROWSER_ACTION_URL_MAP,
  BOOKMARK_PATH_SEPARATOR,
} from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

// The browser API surface this module needs. Typed off the real `wxt/browser`
// export (erased at runtime), so background.ts passes the live object and tests
// pass a mock — both structurally checked.
export type WxtBrowser = typeof import("wxt/browser").browser;

export interface ActionRequest {
  action: string;
  url?: string;
  title?: string;
  tabId?: number;
  bookmarkId?: string;
  parentId?: string;
  query?: string;
}

export interface ActionResponse {
  success: boolean;
}

// Minimal shape of a bookmark tree node (structural, so callers can pass the
// real Browser.bookmarks.BookmarkTreeNode without importing the global type).
export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

// Flatten the bookmark tree into a list, building a breadcrumb `path` from the
// containing folders. Folders (nodes with children) recurse; leaf bookmarks
// without a parseable URL are skipped rather than throwing and dropping the
// whole list.
export function transformBookmarks(
  bookmarkNodes: BookmarkNode[] = [],
  parent = "",
  bookmarks: ActionItem[] = []
): ActionItem[] {
  for (const item of bookmarkNodes) {
    if (item.children) {
      const path = parent ? `${parent}${BOOKMARK_PATH_SEPARATOR}${item.title}` : item.title;
      transformBookmarks(item.children, path, bookmarks);
    } else if (item.url) {
      let domain = "";
      try {
        domain = new URL(item.url).hostname;
      } catch {
        domain = "";
      }
      bookmarks.push({ id: item.id, title: item.title, url: item.url, domain, path: parent });
    }
  }

  return bookmarks;
}

export async function extractBookmarks(browser: WxtBrowser): Promise<ActionItem[]> {
  const bookmarkNodes = await browser.bookmarks.getTree();
  return transformBookmarks((bookmarkNodes[0]?.children as BookmarkNode[]) || []);
}

// Flatten the bookmark tree into its folders (the move-bookmark destinations).
// A node is a folder when it has no `url`; we include it and recurse, building
// the same breadcrumb `path` as `transformBookmarks`. Leaf bookmarks are skipped.
export function transformFolders(
  bookmarkNodes: BookmarkNode[] = [],
  parent = "",
  folders: ActionItem[] = []
): ActionItem[] {
  for (const item of bookmarkNodes) {
    if (item.url) continue;
    const path = parent ? `${parent}${BOOKMARK_PATH_SEPARATOR}${item.title}` : item.title;
    // Only `path` (the parent breadcrumb) is set — it surfaces as the right-side
    // badge. No `domain`, so the row renders a single title line with no subtitle.
    folders.push({ id: item.id, title: item.title, path: parent, source: "folder" });
    if (item.children) transformFolders(item.children, path, folders);
  }

  return folders;
}

export async function extractFolders(browser: WxtBrowser): Promise<ActionItem[]> {
  const bookmarkNodes = await browser.bookmarks.getTree();
  return transformFolders((bookmarkNodes[0]?.children as BookmarkNode[]) || []);
}

// All currently open tabs across every window (not just the current one).
export async function getOpenedTabs(browser: WxtBrowser): Promise<ActionItem[]> {
  const tabs = await browser.tabs.query({});
  return tabs.map((item) => ({
    id: item.id,
    title: item.title?.toString() || "",
    url: item.url as string,
    domain: new URL(item.url as string).hostname,
  }));
}

// Browser history, deduped by URL (history returns one entry per visit).
export async function getHistories(browser: WxtBrowser): Promise<ActionItem[]> {
  const historyItems = await browser.history.search({ text: "", maxResults: 100000, startTime: 0 });

  const processed = new Set<string>();
  const histories: ActionItem[] = [];
  for (const history of historyItems) {
    const { title = "", url = "" } = history;
    if (!url || processed.has(url)) continue;
    histories.push({ title, url, domain: new URL(url).hostname });
    processed.add(url);
  }
  return histories;
}

export async function getActiveTab(browser: WxtBrowser) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function openTab(browser: WxtBrowser, url: string) {
  return browser.tabs.create({ url });
}

// Search the web using the browser's configured default engine, falling back to
// a Google query URL when the search API is unavailable.
async function searchWeb(browser: WxtBrowser, query: string): Promise<void> {
  const search = (browser as typeof browser & { search?: any }).search;
  if (search?.query) {
    await Promise.resolve(search.query({ text: query, disposition: "NEW_TAB" }));
  } else if (search?.search) {
    search.search({ query });
  } else {
    await openTab(browser, `https://www.google.com/search?q=${encodeURIComponent(query)}`);
  }
}

// Switch to an existing tab by id (focusing its window first), or open a URL in
// a new tab. A bookmark/history row has no tab id and must arrive here with only
// a `url` — passing a non-tab id as `tabId` makes `tabs.get` reject (success:false).
async function openTabAction(browser: WxtBrowser, tabId?: number, url?: string): Promise<ActionResponse> {
  if (tabId) {
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab.windowId) {
        await browser.windows.update(tab.windowId, { focused: true });
        await browser.tabs.update(tabId, { active: true });
      } else {
        await browser.tabs.update(tabId, { active: true });
      }
      return { success: true };
    } catch {
      return { success: false };
    }
  }
  if (url) {
    await openTab(browser, url);
    return { success: true };
  }
  return { success: true };
}

async function duplicateTab(browser: WxtBrowser, tabId?: number): Promise<ActionResponse> {
  if (tabId) {
    try {
      await browser.tabs.duplicate(tabId);
      return { success: true };
    } catch {
      return { success: false };
    }
  }
  const tab = await getActiveTab(browser);
  if (tab?.url) {
    await openTab(browser, tab.url);
    return { success: true };
  }
  return { success: false };
}

async function closeTab(browser: WxtBrowser, tabId?: number): Promise<ActionResponse> {
  if (!tabId) return { success: false };
  try {
    await browser.tabs.remove(tabId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

async function removeBookmark(browser: WxtBrowser, bookmarkId?: string): Promise<ActionResponse> {
  if (!bookmarkId) return { success: false };
  try {
    await browser.bookmarks.remove(bookmarkId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Idempotent: skip creating when the URL is already bookmarked so repeated
// presses don't pile up duplicates. When `parentId` is given (bookmark-to-folder),
// the new bookmark is created inside that folder.
async function addBookmark(
  browser: WxtBrowser,
  url?: string,
  title?: string,
  parentId?: string
): Promise<ActionResponse> {
  if (!url) return { success: false };
  try {
    const existing = await browser.bookmarks.search({ url });
    if (existing.length > 0) return { success: true };
    await browser.bookmarks.create({ title: title || url, url, ...(parentId ? { parentId } : {}) });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Move an existing bookmark into another folder. Chrome's `move` reorders within
// the target folder when no index is given (appends), which is what we want.
async function moveBookmark(browser: WxtBrowser, bookmarkId?: string, parentId?: string): Promise<ActionResponse> {
  if (!bookmarkId || !parentId) return { success: false };
  try {
    await browser.bookmarks.move(bookmarkId, { parentId });
    return { success: true };
  } catch {
    return { success: false };
  }
}

async function toggleMute(browser: WxtBrowser): Promise<ActionResponse> {
  const tab = await getActiveTab(browser);
  if (tab?.id) {
    const muted = !tab.mutedInfo?.muted;
    await browser.tabs.update(tab.id, { muted });
  }
  return { success: true };
}

async function openOptions(browser: WxtBrowser): Promise<ActionResponse> {
  try {
    await browser.runtime.openOptionsPage();
    return { success: true };
  } catch {
    return { success: false };
  }
}

// Route a mutation/action message to its handler. Returns a Promise that
// resolves with the response, or `null` when the action isn't one this handler
// owns (so the caller can decline it). Centralizing the routing here makes it
// unit-testable against a mock browser, independent of the WXT background shell.
export function handleActionMessage(browser: WxtBrowser, request: ActionRequest): Promise<ActionResponse> | null {
  const { action, url, title, tabId, bookmarkId, parentId, query } = request || {};

  switch (action) {
    case BP_SEARCH_WEB:
      if (!query) return Promise.resolve({ success: false });
      return searchWeb(browser, query).then(() => ({ success: true }));
    case BP_OPEN_TAB:
      return openTabAction(browser, tabId, url);
    case BP_DUPLICATE_TAB:
      return duplicateTab(browser, tabId);
    case BP_CLOSE_TAB:
      return closeTab(browser, tabId);
    case BP_REMOVE_BOOKMARK:
      return removeBookmark(browser, bookmarkId);
    case BP_ADD_BOOKMARK:
      return addBookmark(browser, url, title, parentId);
    case BP_MOVE_BOOKMARK:
      return moveBookmark(browser, bookmarkId, parentId);
    case BP_TOGGLE_MUTE:
      return toggleMute(browser);
    case BP_OPEN_OPTIONS:
      return openOptions(browser);
    default:
      // Pure URL-opening browser actions (downloads/extensions/settings).
      if (action in BROWSER_ACTION_URL_MAP) {
        if (!url) return Promise.resolve({ success: false });
        return openTab(browser, url).then(() => ({ success: true }));
      }
      return null;
  }
}
