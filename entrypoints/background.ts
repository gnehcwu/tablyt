import { browser } from "wxt/browser";
import { BP_TOGGLE_PALETTE, BP_SEARCH_BOOKMARKS, BP_SEARCH_OPENED_TABS, BP_SEARCH_HISTORIES } from "@/utils/constants";
import type { ActionItem } from "@/utils/types";
import {
  extractBookmarks,
  getOpenedTabs,
  getHistories,
  getActiveTab,
  handleActionMessage,
  type ActionRequest,
} from "@/utils/backgroundActions";

export default defineBackground(() => {
  /**
   * Notify content script with given action type
   */
  async function notifyContent(action: string): Promise<void> {
    const activeTab = await getActiveTab(browser);

    if (!activeTab?.id || activeTab.url?.includes("chrome://") || activeTab.url?.includes("browser.google.com")) return;

    browser.tabs.sendMessage(activeTab.id, { action });
  }

  // Listener for clicking on extension icon
  browser.action.onClicked.addListener(function () {
    notifyContent(BP_TOGGLE_PALETTE);
  });

  const ACTION_MENU_OPEN_SETTINGS = "tablyt-open-settings";

  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: ACTION_MENU_OPEN_SETTINGS,
      title: "Settings",
      contexts: ["action"],
    });
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === ACTION_MENU_OPEN_SETTINGS) {
      browser.runtime.openOptionsPage();
    }
  });

  // Listener for registered command
  browser.commands.onCommand.addListener((command) => {
    if (command === BP_TOGGLE_PALETTE) {
      notifyContent(BP_TOGGLE_PALETTE);
    }
  });

  // Data-fetch requests from the palette: each returns `{ items }`.
  browser.runtime.onMessage.addListener(
    (request: { action: string }, _, sendResponse: (response: { items?: ActionItem[] }) => void) => {
      if (request.action === BP_SEARCH_BOOKMARKS) {
        extractBookmarks(browser).then(
          (items) => sendResponse({ items }),
          () => sendResponse({ items: [] })
        );
        return true;
      } else if (request.action === BP_SEARCH_OPENED_TABS) {
        getOpenedTabs(browser).then(
          (items) => sendResponse({ items }),
          () => sendResponse({ items: [] })
        );
        return true;
      } else if (request.action === BP_SEARCH_HISTORIES) {
        getHistories(browser).then((items) => sendResponse({ items }));
        return true;
      }

      return false;
    }
  );

  // Mutation/action requests from the palette: routed through handleActionMessage,
  // which returns `null` for actions it doesn't own (so we decline them here).
  browser.runtime.onMessage.addListener(
    (request: ActionRequest, _sender, sendResponse: (response?: { success?: boolean }) => void) => {
      const result = handleActionMessage(browser, request);
      if (!result) return false;

      result.then(sendResponse);
      return true;
    }
  );
});
