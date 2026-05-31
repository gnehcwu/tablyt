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
  BP_OPEN_OPTIONS,
  ACTION_MODE,
  BP_TOGGLE_MUTE,
  BP_SEARCH_WEB,
} from "@/utils/constants";
import scoreActions from "@/utils/scoring/scoreActions";
import Filter from "./Filter";
import ActionList from "./ActionList";
import Footer from "./Footer";
import usePalette from "@/hooks/usePalette";
import { CopyPlus, History, FolderDown, Blocks, Cog, VolumeX, Settings2, Search } from "lucide-react";
import "@/assets/tailwind.css";

// Fixed display order for the merged default scope.
const SECTION_ORDER = ["tab", "bookmark", "action"] as const;

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
  [BP_OPEN_HISTORY_TAB]: {
    action: BP_OPEN_HISTORY_TAB,
    title: "History",
    domain: "Search browser history",
    icon: getBrowserActionIcon(<History />),
    actionMode: ACTION_MODE.HISTORY,
  },
  [BP_TOGGLE_MUTE]: {
    action: BP_TOGGLE_MUTE,
    title: "Toggle Mute",
    domain: "Mute or unmute current tab",
    icon: getBrowserActionIcon(<VolumeX />),
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
    title: "Browser settings",
    domain: "Open browser settings page",
    icon: getBrowserActionIcon(<Cog />),
    url: BROWSER_ACTION_URL_MAP[BP_OPEN_SETTINGS_TAB],
  },
  [BP_OPEN_OPTIONS]: {
    action: BP_OPEN_OPTIONS,
    title: "Tablyt settings",
    domain: "Open Tablyt settings page",
    icon: getBrowserActionIcon(<Settings2 />),
  },
} as const;

const createWebSearchItem = (query: string): ActionItem => ({
  action: BP_SEARCH_WEB,
  title: `“${query}”`,
  domain: "Search the web with your default engine",
  query,
  hint: "Search",
  icon: getBrowserActionIcon(<Search />),
});

interface PaletteProps {
  embedded?: boolean;
}

function Palette({ embedded = false }: PaletteProps = {}) {
  const [{ open, search, selected, scoredActionItems, command, loading }, dispatch] = usePalette(embedded);
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

  const togglePalette = () => {
    if (embedded) {
      dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: "" });
      return;
    }
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

    const { url, id, action, actionMode, query } = actionItem || {};
    if (actionMode) {
      dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: actionMode });

      return;
    }

    messageBackground({
      action: action || BP_OPEN_TAB,
      url,
      tabId: id,
      query,
    }).catch(() => {});

    togglePalette();
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
        togglePalette();
        return;
      case "Tab":
        event.preventDefault();

        if (command === ACTION_MODE.HISTORY) {
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: "" });
        } else {
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: ACTION_MODE.HISTORY });
        }

        return;
      case "Backspace":
        if (!search && command) {
          event.preventDefault();
          dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: "" });
        }
        return;
      default:
        return;
    }
  };

  const handleLauncherClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      togglePalette();
    }
  };

  const fetchItems = (action: string) =>
    messageBackground<{ items: ActionItem[] }>({ action })
      .then((res) => res?.items ?? [])
      .catch(() => [] as ActionItem[]);

  async function fetchActionItems() {
    // History is the one separate scope — it's unbounded, so it stays behind Tab.
    if (command === ACTION_MODE.HISTORY) {
      const histories = await fetchItems(BP_SEARCH_HISTORIES);
      actionListRef.current = histories.map((item) => ({ ...item, source: "history" as const }));
      return;
    }

    // Default scope: open tabs + bookmarks + browser actions, all searched
    // together. Bookmarks are deduped against open tabs (switching beats
    // opening a duplicate). The per-row ⏎ hint is reserved for the web-search
    // fallback, where the action is non-obvious — common rows lean on the footer.
    const [rawTabs, rawBookmarks] = await Promise.all([
      fetchItems(BP_SEARCH_OPENED_TABS),
      fetchItems(BP_SEARCH_BOOKMARKS),
    ]);

    const tabs: ActionItem[] = rawTabs.map((item) => ({ ...item, source: "tab" }));
    const openTabUrls = new Set(tabs.map((t) => t.url));
    const bookmarks: ActionItem[] = rawBookmarks
      .filter((b) => !openTabUrls.has(b.url))
      .map((item) => ({ ...item, source: "bookmark" }));

    // Section order: open tabs → bookmarks → actions.
    const actions: ActionItem[] = Object.values(BROWSER_ACTIONS)
      .filter((a) => !tabs.some((t) => t.action === a.action))
      .map((a) => ({ ...a, source: "action" as const }));

    actionListRef.current = [...tabs, ...bookmarks, ...actions];
  }

  function scoreActionList() {
    const trimmedSearch = search.trim();
    const scored = scoreActions(actionListRef.current, search);

    // Keep results in fixed section order (open tabs → bookmarks → actions),
    // with each section internally ranked by score. History is its own
    // homogeneous scope, so it isn't regrouped.
    const grouped =
      command === ACTION_MODE.HISTORY
        ? scored
        : SECTION_ORDER.flatMap((src) => scored.filter((item) => item.source === src));

    // Fall back to a web search when nothing matches the current query
    const payload = grouped.length === 0 && trimmedSearch ? [createWebSearchItem(trimmedSearch)] : grouped;

    dispatch({
      type: ACTION_TYPES.SET_SCORED_ITEMS,
      payload,
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

  const card = (
    <div
      key={animationTrigger}
      data-animate={animationTrigger > 0 ? "true" : "false"}
      className={`border border-neutral-300 dark:border-neutral-600 relative bg-white dark:bg-black rounded-3xl shadow-2xl grid grid-rows-[min-content_1fr_min-content] animate-in zoom-in-95 duration-125 ${
        embedded ? "w-full max-w-[789px]" : "w-[min(789px,100vw)]"
      }`}
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
  );

  if (embedded) {
    return card;
  }

  return (
    <FocusLock>
      <RemoveScroll>
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/20 grid place-content-center animate-in fade-in duration-150 z-2147483648"
          onClick={handleLauncherClick}
        >
          {card}
        </div>
      </RemoveScroll>
    </FocusLock>
  );
}

export default Palette;
