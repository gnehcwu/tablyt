import {
  ArrowRightLeft,
  ArrowUpRight,
  BookmarkMinus,
  BookmarkPlus,
  CopyPlus,
  CornerDownLeft,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import type { ActionItem, SubAction } from "@/utils/types";
import { BP_SEARCH_WEB } from "@/utils/constants";

const ICON_SIZE = 16;

// Domain operations the palette exposes to the panel. Each fully encapsulates
// the message + close/refresh/panel behavior so this module stays a thin
// label/icon mapping.
export interface PanelActionCtx {
  isFavorite: (item: ActionItem) => boolean;
  toggleFavorite: (item: ActionItem) => void;
  switchToTab: (item: ActionItem) => void;
  open: (item: ActionItem) => void;
  duplicateTab: (item: ActionItem) => void;
  // Bookmark / un-bookmark by URL — shared by tab and history rows.
  bookmarkItem: (item: ActionItem) => void;
  removeItemBookmark: (item: ActionItem) => void;
  closeTab: (item: ActionItem) => void;
  removeBookmark: (item: ActionItem) => void;
  openCommand: (item: ActionItem) => void;
}

// The action panel offers the actions of the underlying item type. Favorited
// rows carry their origin in `favoriteKind`.
function panelKind(item: ActionItem): ActionItem["source"] {
  if (item.source === "favorite") return item.favoriteKind;
  return item.source;
}

export function getPanelActions(item: ActionItem, ctx: PanelActionCtx): SubAction[] {
  // The synthetic web-search row is per-query and has no meaningful secondary
  // actions (favoriting it would pin a one-off query), so it gets no panel.
  if (item.action === BP_SEARCH_WEB) return [];

  const favoriteAction = (): SubAction => {
    const favorited = ctx.isFavorite(item);
    return {
      key: "favorite",
      label: favorited ? "Remove from favorites" : "Add to favorites",
      icon: favorited ? <StarOff size={ICON_SIZE} /> : <Star size={ICON_SIZE} />,
      run: () => ctx.toggleFavorite(item),
    };
  };

  // The row already represents the URL, so bookmarking toggles in place rather
  // than spawning a duplicate bookmark row.
  const bookmarkToggleAction = (): SubAction =>
    item.bookmarkId
      ? {
          key: "unbookmark",
          label: "Remove bookmark",
          icon: <BookmarkMinus size={ICON_SIZE} />,
          run: () => ctx.removeItemBookmark(item),
        }
      : { key: "bookmark", label: "Bookmark", icon: <BookmarkPlus size={ICON_SIZE} />, run: () => ctx.bookmarkItem(item) };

  switch (panelKind(item)) {
    case "tab":
      return [
        {
          key: "switch",
          label: "Switch to",
          icon: <ArrowRightLeft size={ICON_SIZE} />,
          shortcut: "↵",
          run: () => ctx.switchToTab(item),
        },
        { key: "duplicate", label: "Duplicate", icon: <CopyPlus size={ICON_SIZE} />, run: () => ctx.duplicateTab(item) },
        bookmarkToggleAction(),
        { key: "close", label: "Close tab", icon: <X size={ICON_SIZE} />, run: () => ctx.closeTab(item) },
      ];
    case "bookmark":
      return [
        {
          key: "open",
          label: "Open",
          icon: <ArrowUpRight size={ICON_SIZE} />,
          shortcut: "↵",
          run: () => ctx.open(item),
        },
        favoriteAction(),
        {
          key: "remove",
          label: "Remove bookmark",
          icon: <Trash2 size={ICON_SIZE} />,
          run: () => ctx.removeBookmark(item),
        },
      ];
    case "action":
      return [
        favoriteAction(),
        {
          key: "open-command",
          label: "Open command",
          icon: <CornerDownLeft size={ICON_SIZE} />,
          shortcut: "↵",
          run: () => ctx.openCommand(item),
        },
      ];
    case "history":
      return [
        {
          key: "open",
          label: "Open",
          icon: <ArrowUpRight size={ICON_SIZE} />,
          shortcut: "↵",
          run: () => ctx.open(item),
        },
        bookmarkToggleAction(),
      ];
    default:
      return [];
  }
}
