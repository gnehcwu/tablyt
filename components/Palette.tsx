import React, { useEffect, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import { RemoveScroll } from "react-remove-scroll";
import type { SupportedKey, ActionItem } from "@/utils/types";
import useChromeMessage from "@/hooks/useChromeMessage";
import messageBackground from "@/utils/messageBackground";
import {
  BP_TOGGLE_PALETTE,
  BP_SEARCH_OPENED_TABS,
  BP_OPEN_TAB,
  BP_DUPLICATE_TAB,
  ACTION_TYPES,
  BP_OPEN_HISTORY_TAB,
  BP_OPEN_DOWNLOADS_TAB,
  BP_OPEN_EXTENSIONS_TAB,
  BP_OPEN_SETTINGS_TAB,
  BP_OPEN_HELP_TAB,
  BP_ABOUT_EXTENSION,
  ACTION_MODE,
  ACTION_MODE_ACTIONS,
} from "@/utils/constants";
import scoreActions from "@/utils/scoring/scoreActions";
import Filter from "./Filter";
import ActionList from "./ActionList";
import Footer from "./Footer";
import usePalette from "@/hooks/usePalette";
import { CopyPlus, Bookmark, History, FolderDown, Blocks, Cog, BadgeQuestionMark, BadgeInfo } from "lucide-react";
import "@/assets/tailwind.css";

const getBrowserActionIcon = (icon: React.ReactElement<{ className?: string }>) => {
  return React.cloneElement(icon, {
    className: "w-5 h-5 rounded-[4px] inline-block dark:text-neutral-200 text-neutral-950",
  });
};

const BROWSER_ACTIONS: Record<string, ActionItem> = {
  [BP_DUPLICATE_TAB]: {
    action: BP_DUPLICATE_TAB,
    title: "Duplicate",
    domain: "Duplicate current tab",
    icon: getBrowserActionIcon(<CopyPlus />),
  },
  [BP_SEARCH_BOOKMARKS]: {
    action: BP_SEARCH_BOOKMARKS,
    title: "Bookmarks",
    domain: "Search bookmarks",
    icon: getBrowserActionIcon(<Bookmark />),
    actionMode: ACTION_MODE.BOOKMARKS,
  },
  [BP_OPEN_HISTORY_TAB]: {
    action: BP_OPEN_HISTORY_TAB,
    title: "History",
    domain: "Search browser history",
    icon: getBrowserActionIcon(<History />),
    actionMode: ACTION_MODE.HISTORY,
  },
  [BP_OPEN_DOWNLOADS_TAB]: {
    action: BP_OPEN_DOWNLOADS_TAB,
    title: "Downloads",
    domain: "Open browser downloads",
    icon: getBrowserActionIcon(<FolderDown />),
    url: BROWSER_ACTION_URL_MAP[BP_OPEN_DOWNLOADS_TAB],
  },
  [BP_OPEN_EXTENSIONS_TAB]: {
    action: BP_OPEN_EXTENSIONS_TAB,
    title: "Extensions",
    domain: "Manage browser extensions",
    icon: getBrowserActionIcon(<Blocks />),
    url: BROWSER_ACTION_URL_MAP[BP_OPEN_EXTENSIONS_TAB],
  },
  [BP_OPEN_SETTINGS_TAB]: {
    action: BP_OPEN_SETTINGS_TAB,
    title: "Settings",
    domain: "Open browser settings page",
    icon: getBrowserActionIcon(<Cog />),
    url: BROWSER_ACTION_URL_MAP[BP_OPEN_SETTINGS_TAB],
  },
  [BP_OPEN_HELP_TAB]: {
    action: BP_OPEN_HELP_TAB,
    title: "Help",
    domain: "Open browser help page",
    icon: getBrowserActionIcon(<BadgeQuestionMark />),
    url: BROWSER_ACTION_URL_MAP[BP_OPEN_HELP_TAB],
  },
  [BP_ABOUT_EXTENSION]: {
    action: BP_ABOUT_EXTENSION,
    title: "About the extension",
    domain: "More information about the extension",
    icon: getBrowserActionIcon(<BadgeInfo />),
    url: BROWSER_ACTION_URL_MAP[BP_ABOUT_EXTENSION],
  },
} as const;

function Palette() {
  const [{ open, search, selected, scoredActionItems, command, loading }, dispatch] = usePalette();
  const actionListRef = useRef<ActionItem[]>([]);
  const previousCommand = useRef(command);
  const [animationTrigger, setAnimationTrigger] = useState(0);

  const handleSearchValueChange = (value: string) => {
    dispatch({ type: ACTION_TYPES.SET_FILTER, payload: value });
  };

  const handleMouseSelect = (nextSelect: number) => {
    if (nextSelect === selected) return;

    dispatch({ type: ACTION_TYPES.SET_SELECTED, payload: nextSelect });
  };

  const dismissPalette = () => {
    dispatch({ type: ACTION_TYPES.DISMISS_PALETTE });

    // Reset animation trigger when modal closes
    setAnimationTrigger(0);
  };

  const togglePalette = () => {
    dispatch({ type: ACTION_TYPES.TOGGLE_PALETTE });
    setAnimationTrigger(0);
  };

  const handleNavigation = (event: KeyboardEvent) => {
    const total = scoredActionItems?.length;

    if (!total) return;

    const isArrowDown = event.key === "ArrowDown";
    const nextIndex = ((isArrowDown ? selected + 1 : selected - 1) + total) % total;

    dispatch({ type: ACTION_TYPES.SET_SELECTED, payload: nextIndex });
  };

  const executeAction = () => {
    if (!open) return;

    const actionItem = scoredActionItems[selected];
    if (!actionItem) return;

    const { url, id, action, actionMode } = actionItem || {};
    if (actionMode) {
      dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: actionMode });

      return;
    }

    messageBackground({
      action: action || BP_OPEN_TAB,
      url,
      tabId: id,
    }).catch(() => {});

    dismissPalette();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();

    const key = event.key as SupportedKey;

    switch (key) {
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault();
        handleNavigation(event.nativeEvent);
        return;
      case "Enter":
        executeAction();
        return;
      case "Escape":
        dismissPalette();
        return;
      case "Tab":
        event.preventDefault();

        if (command === ACTION_MODE.BOOKMARKS) {
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: "" });
        } else {
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: ACTION_MODE.BOOKMARKS });
        }

        return;
      case "Backspace":
        if (!search && command) {
          event.preventDefault();
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: "" });
        }
        return;
      case "!": {
        event.preventDefault();

        if (command === ACTION_MODE.HISTORY) {
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: "" });
        } else {
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: ACTION_MODE.HISTORY });
        }
        return;
      }
      default:
        return;
    }
  };

  const handleLauncherClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      dismissPalette();
    }
  };

  async function fetchActionItems() {
    const action = ACTION_MODE_ACTIONS[command as keyof typeof ACTION_MODE_ACTIONS] || BP_SEARCH_OPENED_TABS;

    try {
      const response = await messageBackground<{ items: ActionItem[] }>({ action });
      const tabsResponse = response?.items as ActionItem[];
      actionListRef.current = tabsResponse || [];

      // Include browser actions while not in any extra mode
      if (!command) {
        Object.values(BROWSER_ACTIONS).forEach((actionItem) => {
          if (!actionListRef.current.some((item) => item.action === actionItem.action)) {
            actionListRef.current.push(actionItem);
          }
        });
      }
    } catch (_) {}
  }

  function scoreActionList() {
    const scoredItems = scoreActions(actionListRef.current, search);

    dispatch({
      type: ACTION_TYPES.SET_SCORED_ITEMS,
      payload: scoredItems,
    });
  }

  useEffect(() => {
    // Track command changes and trigger animation only when command actually changes
    if (previousCommand.current !== command) {
      setAnimationTrigger((prev) => prev + 1);
      previousCommand.current = command;
    }
  }, [command]);

  useEffect(() => {
    async function fetchAndScoreActionListInternal() {
      await fetchActionItems();
      scoreActionList();
      dispatch({
        type: ACTION_TYPES.SET_LOADING,
        payload: false,
      });
    }

    if (open) {
      fetchAndScoreActionListInternal();
    }
  }, [command, open, dispatch]);

  useEffect(() => {
    scoreActionList();
  }, [search]);

  useChromeMessage(BP_TOGGLE_PALETTE, togglePalette);

  if (!open) return null;

  return (
    <FocusLock>
      <RemoveScroll>
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/20 grid place-content-center animate-in fade-in duration-150 z-2147483648"
          onClick={handleLauncherClick}
        >
          <div
            key={animationTrigger}
            data-animate={animationTrigger > 0 ? "true" : "false"}
            className="border border-neutral-300 dark:border-neutral-600 relative bg-white dark:bg-black rounded-2xl shadow-2xl w-[min(789px,100vw)] grid grid-rows-[min-content_1fr_min-content] animate-in zoom-in-95 duration-125"
            onKeyDown={handleKeyDown}
          >
            <Filter value={search} command={command} onValueChange={handleSearchValueChange} />
            <ActionList
              loading={loading}
              actions={scoredActionItems}
              selected={selected}
              onSelect={handleMouseSelect}
              onAction={executeAction}
            />
            <Footer
              filteredActionItemsCount={scoredActionItems.length}
              totalActionItemsCount={actionListRef.current.length}
            />
          </div>
        </div>
      </RemoveScroll>
    </FocusLock>
  );
}

export default Palette;
