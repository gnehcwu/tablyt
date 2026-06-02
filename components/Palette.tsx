import React, { useEffect, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import { RemoveScroll } from "react-remove-scroll";
import type { SupportedKey, ActionItem } from "@/utils/types";
import useChromeMessage from "@/hooks/useChromeMessage";
import messageBackground from "@/utils/messageBackground";
import {
  BP_TOGGLE_PALETTE,
  BP_SEARCH_OPENED_TABS,
  BP_SEARCH_BOOKMARKS,
  BP_SEARCH_HISTORIES,
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
  BROWSER_ACTION_URL_MAP,
} from "@/utils/constants";
import scoreActions from "@/utils/scoring/scoreActions";
import Filter from "./Filter";
import ActionList from "./ActionList";
import ActionPanel from "./ActionPanel";
import Toast from "./Toast";
import Footer from "./Footer";
import usePalette from "@/hooks/usePalette";
import useFavorites from "@/hooks/useFavorites";
import useToast from "@/hooks/useToast";
import { type FavoriteEntry } from "@/utils/favorites";
import { getPanelActions, type PanelActionCtx } from "@/utils/actionPanelActions";
import { BP_CLOSE_TAB, BP_REMOVE_BOOKMARK, BP_ADD_BOOKMARK } from "@/utils/constants";
import { buildRunPlan } from "@/utils/paletteRun";
import { composeDefaultItems, composeHistoryItems, groupScoredItems } from "@/utils/listComposition";
import {
  CopyPlus,
  History,
  FolderDown,
  Blocks,
  Cog,
  VolumeX,
  Settings2,
  Search,
  BookmarkCheck,
  Check,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
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
  domain: "Search the web",
  query,
  hint: "Search",
  icon: getBrowserActionIcon(<Search />),
  source: "action",
});

interface PaletteProps {
  embedded?: boolean;
}

function Palette({ embedded = false }: PaletteProps = {}) {
  const [{ open, search, selected, scoredActionItems, command, loading }, dispatch] = usePalette(embedded);
  const actionListRef = useRef<ActionItem[]>([]);
  const previousCommand = useRef(command);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const { favorites, isFavorite, toggle } = useFavorites();
  const { toast, showToast } = useToast();
  // Action panel is ephemeral, view-specific state — kept local, not in the reducer.
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelSelected, setPanelSelected] = useState(0);

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

  // Run a single item's primary action. A mode-switching action (e.g. History)
  // stays open and swaps mode; everything else messages the background and closes.
  // The per-source routing lives in `buildRunPlan` so it can be unit-tested.
  const runItem = (item: ActionItem) => {
    const plan = buildRunPlan(item);
    if (plan.kind === "mode") {
      dispatch({ type: ACTION_TYPES.SET_COMMAND, payload: plan.mode });
      return;
    }

    messageBackground(plan.message).catch(() => {});
    togglePalette();
  };

  const executeAction = () => {
    if (!open) return;

    const actionItem = scoredActionItems[selected];
    if (!actionItem) return;

    runItem(actionItem);
  };

  // Re-fetch the current scope and re-score after a list-mutating panel action
  // (close tab / remove bookmark), keeping the palette open with fresh data.
  const refreshList = async () => {
    setPanelOpen(false);
    await fetchActionItems();
    scoreActionList();
  };

  const selectedItem = scoredActionItems[selected];

  const panelCtx: PanelActionCtx = {
    isFavorite,
    toggleFavorite: (item) => {
      // Read state before toggling so the toast reflects the resulting state.
      const wasFavorite = isFavorite(item);
      toggle(item);
      setPanelOpen(false);
      showToast(
        wasFavorite ? "Removed from favorites" : "Added to favorites",
        wasFavorite ? <StarOff size={14} /> : <Star size={14} />
      );
    },
    switchToTab: (item) => {
      messageBackground({ action: BP_OPEN_TAB, tabId: item.id }).catch(() => {});
      togglePalette();
    },
    open: (item) => {
      messageBackground({ action: BP_OPEN_TAB, url: item.url }).catch(() => {});
      togglePalette();
    },
    duplicateTab: (item) => {
      messageBackground({ action: BP_DUPLICATE_TAB, tabId: item.id }).catch(() => {});
      togglePalette();
    },
    bookmarkItem: async (item) => {
      await messageBackground({ action: BP_ADD_BOOKMARK, url: item.url, title: item.title }).catch(() => {});
      // Refresh so the row picks up its bookmark indicator / toggled action.
      refreshList();
      showToast("Bookmarked", <BookmarkCheck size={14} />);
    },
    removeItemBookmark: async (item) => {
      await messageBackground({ action: BP_REMOVE_BOOKMARK, bookmarkId: item.bookmarkId }).catch(() => {});
      refreshList();
      showToast("Bookmark removed", <Trash2 size={14} />);
    },
    closeTab: async (item) => {
      // Wait for the background to actually remove the tab before re-querying,
      // otherwise the closed tab is still present in the fresh list.
      await messageBackground({ action: BP_CLOSE_TAB, tabId: item.id }).catch(() => {});
      refreshList();
      showToast("Tab closed", <Check size={14} />);
    },
    removeBookmark: async (item) => {
      await messageBackground({ action: BP_REMOVE_BOOKMARK, bookmarkId: item.id }).catch(() => {});
      // Drop a stale favorite pointing at the now-deleted bookmark.
      if (isFavorite(item)) toggle(item);
      refreshList();
      showToast("Bookmark removed", <Trash2 size={14} />);
    },
    openCommand: (item) => {
      setPanelOpen(false);
      runItem(item);
    },
  };

  const panelActions = selectedItem ? getPanelActions(selectedItem, panelCtx) : [];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();

    // ⌘K / Ctrl+K toggles the action panel for the highlighted item.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (panelOpen) {
        setPanelOpen(false);
      } else if (selectedItem && panelActions.length > 0) {
        setPanelSelected(0);
        setPanelOpen(true);
      }
      return;
    }

    // While the panel is open it owns the keyboard; swallow everything else so
    // the search input underneath doesn't change.
    if (panelOpen) {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
        case "Tab": {
          event.preventDefault();
          const total = panelActions.length;
          if (!total) return;
          const dir = event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey) ? 1 : -1;
          setPanelSelected((panelSelected + dir + total) % total);
          return;
        }
        case "Enter": {
          event.preventDefault();
          panelActions[panelSelected]?.run();
          return;
        }
        case "Escape": {
          event.preventDefault();
          setPanelOpen(false);
          return;
        }
        default:
          event.preventDefault();
          return;
      }
    }

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
      const [histories, rawBookmarks] = await Promise.all([
        fetchItems(BP_SEARCH_HISTORIES),
        fetchItems(BP_SEARCH_BOOKMARKS),
      ]);
      actionListRef.current = composeHistoryItems({ histories, rawBookmarks });
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

    actionListRef.current = composeDefaultItems({
      rawTabs,
      rawBookmarks,
      browserActions: Object.values(BROWSER_ACTIONS),
    });
  }

  // Rehydrate a stored favorite into a renderable list item. Action icons /
  // mode are re-resolved from BROWSER_ACTIONS (never serialized); bookmark ids
  // are refreshed from the live list when available so "Remove bookmark" works.
  function favoriteEntryToItem(entry: FavoriteEntry): ActionItem {
    if (entry.kind === "action") {
      const base = BROWSER_ACTIONS[entry.action];
      if (base) return { ...base, source: "favorite", favoriteKind: "action" };
      return { action: entry.action, title: entry.title, domain: entry.domain, source: "favorite", favoriteKind: "action" };
    }

    const live = actionListRef.current.find((i) => i.source === "bookmark" && i.url === entry.url);
    return {
      title: entry.title,
      url: entry.url,
      domain: entry.domain,
      id: live?.id ?? entry.id,
      source: "favorite",
      favoriteKind: "bookmark",
    };
  }

  function scoreActionList() {
    const trimmedSearch = search.trim();
    const scored = scoreActions(actionListRef.current, search);

    // History is its own homogeneous scope, so it isn't regrouped.
    if (command === ACTION_MODE.HISTORY) {
      dispatch({ type: ACTION_TYPES.SET_SCORED_ITEMS, payload: scored });
      return;
    }

    // Favorites get a pinned section at the top, but only in the default
    // empty-query view — once the user types, results just score normally.
    // Section grouping / dedup ordering lives in `groupScoredItems`; the
    // React-bearing item factories stay here.
    const showFavorites = trimmedSearch === "" && favorites.length > 0;
    const composed = groupScoredItems({
      scored,
      showFavorites,
      favoriteKeys: new Set(favorites.map((f: FavoriteEntry) => f.key)),
      favoriteItems: showFavorites ? favorites.map(favoriteEntryToItem) : [],
      webSearchItem: trimmedSearch ? createWebSearchItem(trimmedSearch) : undefined,
    });

    dispatch({
      type: ACTION_TYPES.SET_SCORED_ITEMS,
      payload: composed,
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

  // Recompose when favorites change (toggled here or in another tab) so the
  // Favorites section and dedup stay in sync.
  useEffect(() => {
    if (open) scoreActionList();
  }, [favorites]);

  // The panel's actions are tied to one item/context — close it whenever that
  // context shifts, and whenever the palette itself closes.
  useEffect(() => {
    setPanelOpen(false);
  }, [selected, search, command]);

  useEffect(() => {
    if (!open) setPanelOpen(false);
  }, [open]);

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
      onContextMenu={(event) => event.preventDefault()}
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
        actionsAvailable={panelActions.length > 0}
      />
      {panelOpen && selectedItem && (
        <ActionPanel
          itemLabel={selectedItem.title}
          actions={panelActions}
          selected={panelSelected}
          onSelect={setPanelSelected}
          onRun={(action) => action.run()}
          onDismiss={() => setPanelOpen(false)}
        />
      )}
      <Toast toast={toast} />
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
