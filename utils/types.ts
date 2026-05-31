import { ReactNode } from "react";

export interface ActionItem {
  id?: number | string;
  title: string;
  url?: string;
  domain?: string;
  path?: string;
  icon?: ReactNode;
  action?: string;
  actionMode?: string;
  query?: string;
  hint?: string;
  source?: "tab" | "bookmark" | "action" | "history" | "favorite";
  // When `source === "favorite"`, records the underlying item type so the
  // action panel can offer the right actions (bookmark vs browser action).
  favoriteKind?: "bookmark" | "action";
  // For open-tab rows: the id of the bookmark matching this tab's URL, when one
  // exists. Drives the bookmark indicator + the "Remove bookmark" panel action.
  bookmarkId?: string;
}

// A secondary action shown in the floating action panel for the highlighted item.
export interface SubAction {
  key: string;
  label: string;
  icon?: ReactNode;
  // Hint rendered on the right (e.g. "↵" for the primary action).
  shortcut?: string;
  run: () => void;
}

export type SupportedKey = "ArrowUp" | "ArrowDown" | "Enter" | "Escape" | "Tab" | "Backspace";

export type HintConfig = {
  text?: string;
  icon: ReactNode;
};