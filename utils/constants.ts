export const DEFAULT_MINIMUM_MATCH = 2;
export const DEBOUNCE_DELAY = 150;
// Breadcrumb delimiter for a bookmark's folder path. A chevron with hairline
// spaces reads as a hierarchy (Bookmarks › Work › Docs) rather than a URL path.
export const BOOKMARK_PATH_SEPARATOR = " › ";
export const BP_TOGGLE_PALETTE = "bp-toggle-palette";
export const TAB_PALETTE_ELEMENT = "tab-palette-host";
export const BP_SEARCH_BOOKMARKS = "bp-search-bookmarks";
export const BP_TOGGLE_COMMAND = "bp-toggle-command";
export const BP_SEARCH_OPENED_TABS = "bp-search-opened-tabs";
export const BP_SEARCH_HISTORIES = "bp-search-histories";
export const BP_OPEN_TAB = "bp-open-tab";
export const BP_DUPLICATE_TAB = "bp-duplicate-tab";
export const BP_CLOSE_TAB = "bp-close-tab";
export const BP_REMOVE_BOOKMARK = "bp-remove-bookmark";
export const BP_ADD_BOOKMARK = "bp-add-bookmark";
export const BP_MOVE_BOOKMARK = "bp-move-bookmark";
export const BP_SEARCH_FOLDERS = "bp-search-folders";
export const BP_OPEN_HISTORY_TAB = "bp-open-history-tab";
export const BP_OPEN_DOWNLOADS_TAB = "bp-open-downloads-tab";
export const BP_OPEN_EXTENSIONS_TAB = "bp-open-extensions-tab";
export const BP_OPEN_SETTINGS_TAB = "bp-open-settings-tab";
export const BP_TOGGLE_MUTE = "bp-toggle-mute";
export const BP_OPEN_OPTIONS = "bp-open-options";
export const BP_SEARCH_WEB = "bp-search-web";

export const ACTION_TYPES = {
  TOGGLE_PALETTE: "TOGGLE_PALETTE",
  DISMISS_PALETTE: "DISMISS_PALETTE",
  SET_FILTER: "SET_FILTER",
  SET_SELECTED: "SET_SELECTED",
  SET_SCORED_ITEMS: "SET_SCORED_ITEMS",
  SET_COMMAND: "SET_COMMAND",
  SET_LOADING: "SET_LOADING",
} as const;

export const ACTION_MODE = {
  HISTORY: "History",
  MOVE: "Move",
  BOOKMARK: "Bookmark",
} as const;

// Modes that turn the list into a bookmark-folder picker (move an existing
// bookmark, or bookmark a tab into a chosen folder). They share the same
// fetch/score/keyboard handling; only the chosen-folder action differs.
export const FOLDER_PICK_MODES: string[] = [ACTION_MODE.MOVE, ACTION_MODE.BOOKMARK];

export const BROWSER_ACTION_URL_MAP: Record<string, string> = {
  [BP_OPEN_DOWNLOADS_TAB]: "chrome://downloads",
  [BP_OPEN_EXTENSIONS_TAB]: "chrome://extensions",
  [BP_OPEN_SETTINGS_TAB]: "chrome://settings",
};
