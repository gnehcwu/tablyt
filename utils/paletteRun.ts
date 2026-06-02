import { BP_OPEN_TAB } from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

// What running an item's primary action should do. A mode-switching item (e.g.
// History) swaps the palette mode and stays open; everything else resolves to a
// single message for the background.
export type RunPlan =
  | { kind: "mode"; mode: string }
  | {
      kind: "message";
      message: { action: string; url?: string; tabId?: number | string; query?: string };
    };

// Decide what pressing ⏎ (or clicking) on an item does. Kept pure and separate
// from the component so the per-source routing is unit-testable.
export function buildRunPlan(item: ActionItem): RunPlan {
  if (item.actionMode) {
    return { kind: "mode", mode: item.actionMode };
  }

  return {
    kind: "message",
    message: {
      action: item.action || BP_OPEN_TAB,
      url: item.url,
      // Only open-tab rows carry a numeric tab id usable for switching. Other
      // sources (bookmark/history/favorite) put a bookmark/history id in `id`,
      // so they must open by url — otherwise the background treats the id as a
      // tab id, fails the lookup, and nothing opens.
      tabId: item.source === "tab" ? item.id : undefined,
      query: item.query,
    },
  };
}
