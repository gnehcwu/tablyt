import { browser } from "wxt/browser";
import {
  BP_TOGGLE_PALETTE,
  BP_SEARCH_BOOKMARKS,
  BP_SEARCH_OPENED_TABS,
  BP_OPEN_TAB,
  BP_DUPLICATE_TAB,
  BP_OPEN_HISTORY_TAB,
  BP_OPEN_DOWNLOADS_TAB,
  BP_OPEN_EXTENSIONS_TAB,
  BP_OPEN_SETTINGS_TAB,
  BP_OPEN_HELP_TAB,
} from "../utils/constants";
import type { ActionItem } from "../utils/types";

export default defineBackground(() => {
  function transformBookmarks(
    bookmarkNodes: Browser.bookmarks.BookmarkTreeNode[] = [],
    parent: string = "",
    bookmarks: ActionItem[] = []
  ): ActionItem[] {
    for (let item of bookmarkNodes) {
      if (item.children) {
        const path = parent ? `${parent}/${item.title}` : item.title;
        transformBookmarks(item.children, path, bookmarks);
      } else {
        bookmarks.push({
          title: item.title,
          url: item.url as string,
          domain: new URL(item.url as string).hostname,
          path: parent,
        });
      }
    }

    return bookmarks;
  }

  async function extractBookmarks() {
    const bookmarkNodes = await browser.bookmarks.getTree();
    return transformBookmarks(bookmarkNodes[0]?.children || []);
  }

  /**
   * Get all the currently opened tabs, including tabs across all opening windows, not just the current window
   */
  async function getOpenedTabs(): Promise<ActionItem[]> {
    const tabs = await browser.tabs.query({});

    return tabs.map((item) => ({
      id: item.id,
      title: item.title?.toString() || "",
      url: item.url as string,
      domain: new URL(item.url as string).hostname,
    }));
  }

  /**
   * Get currently active browser tab
   * @returns current active tab
   */
  async function getActiveTab() {
    const queryOptions = { active: true, currentWindow: true };
    const [tab] = await browser.tabs.query(queryOptions);
    return tab;
  }

  /**
   * Notify content script with given action type
   */
  async function notifyContent(action: string): Promise<void> {
    const activeTab = await getActiveTab();

    if (!activeTab?.id || activeTab.url?.includes("chrome://") || activeTab.url?.includes("browser.google.com")) return;

    browser.tabs.sendMessage(activeTab.id, { action });
  }

  // Listener for clicking on extension icon
  browser.action.onClicked.addListener(function () {
    notifyContent(BP_TOGGLE_PALETTE);
  });

  // Listener for registered command
  browser.commands.onCommand.addListener((command) => {
    if (command === BP_TOGGLE_PALETTE) {
      notifyContent(BP_TOGGLE_PALETTE);
    }
  });

  browser.runtime.onMessage.addListener(
    (
      request: { action: string; url?: string },
      _,
      sendResponse: (response: { bookmarks?: ActionItem[]; openerTabId?: number }) => void
    ) => {
      if (request.action === BP_SEARCH_BOOKMARKS) {
        extractBookmarks()
          .then((bookmarks) => {
            sendResponse({ bookmarks });
          })
          .catch(() => {
            sendResponse({ bookmarks: [] });
          });

        // To keep message channel alive until response returned
        return true;
      }

      if (request.action === BP_SEARCH_OPENED_TABS) {
        getOpenedTabs()
          .then((openedTabs) => {
            sendResponse({ bookmarks: openedTabs });
          })
          .catch(() => {
            sendResponse({ bookmarks: [] });
          });

        // To keep message channel alive until response returned
        return true;
      }
    }
  );

  function openTab(url: string, callback: () => void) {
    browser.tabs.create({ url }, () => callback());
  }

  browser.runtime.onMessage.addListener(
    (
      request: { action: string; url?: string; tabId?: number },
      sender,
      sendResponse: (response?: { success?: boolean }) => void
    ) => {
      const { action, url, tabId } = request || {};

      if (action === BP_OPEN_TAB) {
        if (tabId) {
          // Handle tab switching asynchronously
          (async () => {
            try {
              const tab = await browser.tabs.get(tabId);
              if (tab.windowId) {
                // Focus the window first (brings it to front)
                await browser.windows.update(tab.windowId, { focused: true });
                await browser.tabs.update(tabId, { active: true });
              } else {
                // Fallback: just activate the tab
                await browser.tabs.update(tabId, { active: true });
              }
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false });
            }
          })();
        } else if (url) {
          openTab(url, () => {
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: false });
        }

        return true; // Keep the message channel open for async response
      } else if (action === BP_DUPLICATE_TAB) {
        getActiveTab().then((tab) => {
          if (tab.url) {
            openTab(tab.url, () => {
              sendResponse({ success: true });
            });
          }
        });

        return true; // Keep the message channel open for async response
      }

      return true;
    }
  );

  // open history tab
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === BP_OPEN_HISTORY_TAB) {
      browser.tabs.create({ url: "chrome://history" });
      sendResponse({ success: true });
      return true;
    }
    return false;
  });

  // open downloads tab
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === BP_OPEN_DOWNLOADS_TAB) {
      browser.tabs.create({ url: "chrome://downloads" });
      sendResponse({ success: true });
      return true;
    }
    return false;
  });

  // open chrome://extensions
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === BP_OPEN_EXTENSIONS_TAB) {
      browser.tabs.create({ url: "chrome://extensions" });
      sendResponse({ success: true });
      return true;
    }
    return false;
  });

  // open chrome://settings
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === BP_OPEN_SETTINGS_TAB) {
      browser.tabs.create({ url: "chrome://settings" });
      sendResponse({ success: true });
      return true;
    }
    return false;
  });

  // open chrome://help
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === BP_OPEN_HELP_TAB) {
      browser.tabs.create({ url: "chrome://help" });
      sendResponse({ success: true });
      return true;
    }
    return false;
  });
});
