import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  BP_SEARCH_OPENED_TABS,
  BP_SEARCH_BOOKMARKS,
  BP_OPEN_TAB,
} from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

// Mutable fixtures the mocked background reads from, plus a record of every
// message the palette sent. `vi.hoisted` lets the (hoisted) vi.mock factory
// close over them.
const bg = vi.hoisted(() => ({
  tabs: [] as ActionItem[],
  bookmarks: [] as ActionItem[],
  calls: [] as { action: string; [k: string]: unknown }[],
}));

vi.mock("@/utils/messageBackground", () => ({
  default: vi.fn((msg: { action: string; [k: string]: unknown }) => {
    bg.calls.push(msg);
    // String literals (not the imported constants) because the factory is hoisted.
    if (msg.action === "bp-search-opened-tabs") return Promise.resolve({ items: bg.tabs });
    if (msg.action === "bp-search-bookmarks") return Promise.resolve({ items: bg.bookmarks });
    if (msg.action === "bp-search-histories") return Promise.resolve({ items: [] });
    return Promise.resolve({ success: true });
  }),
}));

// Import after the mock is registered.
import Palette from "@/components/Palette";

beforeEach(() => {
  bg.tabs = [];
  bg.bookmarks = [];
  bg.calls = [];
});

// The list is loaded once the empty-state placeholder is gone. (Rows live in a
// react-window virtual list that doesn't lay out in jsdom, but selection/keyboard
// handling reads from reducer state, not the DOM — so the flow is still testable.)
async function waitForLoaded() {
  await waitFor(() => expect(screen.queryByText("No results found")).toBeNull());
}

const sentTo = (action: string) => bg.calls.filter((c) => c.action === action);

describe("Palette keyboard flows", () => {
  it("fetches open tabs and bookmarks when it opens", async () => {
    render(<Palette embedded />);

    await waitFor(() => {
      expect(sentTo(BP_SEARCH_OPENED_TABS)).toHaveLength(1);
      expect(sentTo(BP_SEARCH_BOOKMARKS)).toHaveLength(1);
    });
  });

  it("Enter on the highlighted open tab switches to it by numeric tab id", async () => {
    bg.tabs = [{ id: 7, title: "GitHub", url: "https://github.com", source: "tab" }];
    render(<Palette embedded />);
    await waitForLoaded();

    // Tabs sort first, so selection defaults to the tab at index 0.
    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "Enter" });

    await waitFor(() => {
      const open = sentTo(BP_OPEN_TAB);
      expect(open).toHaveLength(1);
      expect(open[0]).toMatchObject({ tabId: 7 });
    });
  });

  // Regression for the original bug: pressing Enter on a bookmark must open it
  // by URL. A bookmark's id is a *bookmark* id; sending it as tabId made the
  // background try to switch to a nonexistent tab and nothing opened.
  it("Enter on the highlighted bookmark opens by URL with no tabId", async () => {
    bg.tabs = [];
    bg.bookmarks = [{ id: "bookmark-42", title: "Docs", url: "https://docs.example.com", source: "bookmark" }];
    render(<Palette embedded />);
    await waitForLoaded();

    // Bookmarks sort last; ArrowUp from the top wraps to the final row (the
    // bookmark) regardless of how many browser actions sit in between.
    const input = screen.getByLabelText("Search");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      const open = sentTo(BP_OPEN_TAB);
      expect(open).toHaveLength(1);
    });
    const open = sentTo(BP_OPEN_TAB)[0];
    expect(open).toMatchObject({ url: "https://docs.example.com" });
    expect(open.tabId).toBeUndefined();
  });

  it("Tab switches into History mode and shows its badge", async () => {
    render(<Palette embedded />);
    await waitForLoaded();

    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "Tab" });

    // The mode badge renders the command label.
    expect(await screen.findByText("History")).toBeInTheDocument();
    await waitFor(() => expect(sentTo("bp-search-histories")).toHaveLength(1));
  });
});
