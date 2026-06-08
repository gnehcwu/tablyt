import {
  ArrowRightLeft,
  ArrowUpRight,
  BookmarkMinus,
  BookmarkPlus,
  CopyPlus,
  CornerDownLeft,
  FolderInput,
  FolderPlus,
  Link,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react";
import type { ActionItem, SubAction } from "@/utils/types";
import { BP_SEARCH_WEB } from "@/utils/constants";
import { scoreItem } from "@/utils/scoring/score";

const ICON_SIZE = 16;

// Keep matches within this fraction of the best hit — same relative cutoff the
// main palette scorer uses, so the action search prunes scattered junk while
// keeping everything when the whole (small) list only loosely matches.
const RELATIVE_MATCH_RATIO = 0.3;

// Fuzzy-filter the panel's actions by their label, best match first. Reuses the
// palette's fuzzy scorer (`scoreItem`) so typing in the action search feels the
// same as searching the main list — acronyms and word-jumps match, not just
// substrings. An empty query keeps the actions in their declared order.
export function filterPanelActions(actions: SubAction[], query: string): SubAction[] {
  const q = query.trim();
  if (!q) return actions;

  const scored = actions
    .map((action) => ({ action, score: scoreItem(action.label, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const cutoff = scored[0].score * RELATIVE_MATCH_RATIO;
  return scored.filter((entry) => entry.score >= cutoff).map((entry) => entry.action);
}

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
  // Enter folder-picker mode to move this bookmark into another folder.
  moveBookmark: (item: ActionItem) => void;
  // Enter folder-picker mode to bookmark this tab's URL into a chosen folder.
  bookmarkToFolder: (item: ActionItem) => void;
  // Copy the item's URL to the clipboard.
  copyLink: (item: ActionItem) => void;
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

  const copyLinkAction = (): SubAction => ({
    key: "copy-link",
    label: "Copy link",
    icon: <Link size={ICON_SIZE} />,
    run: () => ctx.copyLink(item),
  });

  // Offered only when the row isn't already bookmarked — once it is, the toggle
  // above becomes "Remove bookmark" and a fresh create-in-folder would just
  // duplicate it. Returns 0 or 1 actions so it can spread into an action list.
  const bookmarkToFolderActions = (): SubAction[] =>
    item.bookmarkId
      ? []
      : [
          {
            key: "bookmark-folder",
            label: "Bookmark to folder",
            icon: <FolderPlus size={ICON_SIZE} />,
            run: () => ctx.bookmarkToFolder(item),
          },
        ];

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
        copyLinkAction(),
        bookmarkToggleAction(),
        ...bookmarkToFolderActions(),
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
        copyLinkAction(),
        favoriteAction(),
        {
          key: "move",
          label: "Move to folder",
          icon: <FolderInput size={ICON_SIZE} />,
          run: () => ctx.moveBookmark(item),
        },
        {
          key: "remove",
          label: "Remove bookmark",
          icon: <Trash2 size={ICON_SIZE} />,
          run: () => ctx.removeBookmark(item),
        },
      ];
    case "action":
      return [
        {
          key: "open-command",
          label: "Open command",
          icon: <CornerDownLeft size={ICON_SIZE} />,
          shortcut: "↵",
          run: () => ctx.openCommand(item),
        },
        favoriteAction(),
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
        ...bookmarkToFolderActions(),
      ];
    default:
      return [];
  }
}
