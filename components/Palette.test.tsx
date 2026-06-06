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
  folders: [] as ActionItem[],
  calls: [] as { action: string; [k: string]: unknown }[],
}));

vi.mock("@/utils/messageBackground", () => ({
  default: vi.fn((msg: { action: string; [k: string]: unknown }) => {
    bg.calls.push(msg);
    // String literals (not the imported constants) because the factory is hoisted.
    if (msg.action === "bp-search-opened-tabs") return Promise.resolve({ items: bg.tabs });
    if (msg.action === "bp-search-bookmarks") return Promise.resolve({ items: bg.bookmarks });
    if (msg.action === "bp-search-histories") return Promise.resolve({ items: [] });
    if (msg.action === "bp-search-folders") return Promise.resolve({ items: bg.folders });
    return Promise.resolve({ success: true });
  }),
}));

// Import after the mock is registered.
import Palette from "@/components/Palette";

beforeEach(() => {
  bg.tabs = [];
  bg.bookmarks = [];
  bg.folders = [];
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

  it("moves a bookmark into a chosen folder via the action panel", async () => {
    bg.tabs = [];
    bg.bookmarks = [{ id: "bookmark-42", title: "Docs", url: "https://docs.example.com", source: "bookmark" }];
    bg.folders = [{ id: "folder-9", title: "Work", domain: "Bookmarks Bar", path: "Bookmarks Bar", source: "folder" }];
    render(<Palette embedded />);
    await waitForLoaded();

    const input = screen.getByLabelText("Search");
    // Highlight the bookmark (bookmarks sort last; ArrowUp wraps to it).
    fireEvent.keyDown(input, { key: "ArrowUp" });

    // ⌘K opens the action panel; filter its actions via the panel search field
    // and run the match with Enter → enters Move mode.
    fireEvent.keyDown(input, { key: "k", metaKey: true });
    const panelSearch = await screen.findByLabelText("Search actions");
    fireEvent.change(panelSearch, { target: { value: "move" } });
    fireEvent.keyDown(panelSearch, { key: "Enter" });

    // The mode badge shows "Move", the folder list is fetched, and the folder
    // row is committed to the list before we select it.
    expect(await screen.findByText("Move")).toBeInTheDocument();
    await waitFor(() => expect(sentTo("bp-search-folders")).toHaveLength(1));
    await screen.findByText("Work");

    // The mode switch remounts the card (keyed on the mode animation), so the
    // search input is a fresh node — re-query it before the final keystroke.
    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "Enter" });

    await waitFor(() => {
      const moved = sentTo("bp-move-bookmark");
      expect(moved).toHaveLength(1);
      expect(moved[0]).toMatchObject({ bookmarkId: "bookmark-42", parentId: "folder-9" });
    });
  });

  it("bookmarks an open tab into a chosen folder via the action panel", async () => {
    bg.tabs = [{ id: 7, title: "GitHub", url: "https://github.com", source: "tab" }];
    bg.bookmarks = [];
    bg.folders = [{ id: "folder-9", title: "Work", path: "Bookmarks Bar", source: "folder" }];
    render(<Palette embedded />);
    await waitForLoaded();

    // The tab sorts first, so it's selected by default. Open its action panel and
    // filter to "Bookmark to folder" via the panel search field, then run it.
    const input = screen.getByLabelText("Search");
    fireEvent.keyDown(input, { key: "k", metaKey: true });
    const panelSearch = await screen.findByLabelText("Search actions");
    fireEvent.change(panelSearch, { target: { value: "folder" } });
    fireEvent.keyDown(panelSearch, { key: "Enter" });

    expect(await screen.findByText("Bookmark")).toBeInTheDocument();
    await waitFor(() => expect(sentTo("bp-search-folders")).toHaveLength(1));
    await screen.findByText("Work");

    // Card remounts on the mode switch — re-query the input before selecting.
    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "Enter" });

    await waitFor(() => {
      const added = sentTo("bp-add-bookmark");
      expect(added).toHaveLength(1);
      expect(added[0]).toMatchObject({ url: "https://github.com", title: "GitHub", parentId: "folder-9" });
    });
  });

  it("copies an open tab's link via the action panel", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    bg.tabs = [{ id: 7, title: "GitHub", url: "https://github.com", source: "tab" }];
    render(<Palette embedded />);
    await waitForLoaded();

    const input = screen.getByLabelText("Search");
    fireEvent.keyDown(input, { key: "k", metaKey: true });
    const panelSearch = await screen.findByLabelText("Search actions");
    fireEvent.change(panelSearch, { target: { value: "copy" } });
    fireEvent.keyDown(panelSearch, { key: "Enter" });

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://github.com"));
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("filters the action panel via its search field and runs the match", async () => {
    bg.tabs = [{ id: 7, title: "GitHub", url: "https://github.com", source: "tab" }];
    render(<Palette embedded />);
    await waitForLoaded();

    const input = screen.getByLabelText("Search");
    fireEvent.keyDown(input, { key: "k", metaKey: true });

    // All tab actions are listed initially.
    expect(await screen.findByText("Switch to")).toBeInTheDocument();
    expect(screen.getByText("Close tab")).toBeInTheDocument();

    // Typing narrows the list to the matching action(s).
    const panelSearch = screen.getByLabelText("Search actions");
    fireEvent.change(panelSearch, { target: { value: "close" } });
    await waitFor(() => expect(screen.queryByText("Switch to")).toBeNull());
    expect(screen.getByText("Close tab")).toBeInTheDocument();

    // Enter runs the single remaining match.
    fireEvent.keyDown(panelSearch, { key: "Enter" });
    await waitFor(() => {
      const closed = sentTo("bp-close-tab");
      expect(closed).toHaveLength(1);
      expect(closed[0]).toMatchObject({ tabId: 7 });
    });
  });

  it("shows an empty state when no panel action matches the search", async () => {
    bg.tabs = [{ id: 7, title: "GitHub", url: "https://github.com", source: "tab" }];
    render(<Palette embedded />);
    await waitForLoaded();

    fireEvent.keyDown(screen.getByLabelText("Search"), { key: "k", metaKey: true });
    const panelSearch = await screen.findByLabelText("Search actions");
    fireEvent.change(panelSearch, { target: { value: "zzzzz" } });

    expect(await screen.findByText("No matching actions")).toBeInTheDocument();
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
