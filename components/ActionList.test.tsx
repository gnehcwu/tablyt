import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ActionList, { buildDisplayRows, truncatePath } from "@/components/ActionList";
import { BOOKMARK_PATH_SEPARATOR } from "@/utils/constants";
import type { ActionItem } from "@/utils/types";

describe("truncatePath", () => {
  it("returns the path unchanged when it fits", () => {
    expect(truncatePath("Work", 30)).toBe("Work");
  });

  it("middle-truncates a single long segment with an ellipsis", () => {
    const out = truncatePath("a".repeat(40), 12);
    expect(out.length).toBeLessThanOrEqual(12);
    expect(out).toContain("…");
  });

  it("shrinks each segment of a multi-segment path, preserving the separators", () => {
    const path = ["Bookmarks Bar", "Verylongteamname", "Anotherlongone"].join(BOOKMARK_PATH_SEPARATOR);
    const out = truncatePath(path, 24);
    // Still reads as a hierarchy (separators kept) and is shortened overall.
    expect(out.split(BOOKMARK_PATH_SEPARATOR)).toHaveLength(3);
    expect(out).toContain("…");
    expect(out.length).toBeLessThan(path.length);
  });
});

describe("buildDisplayRows", () => {
  it("inserts a header before the first row of each labeled section, keeping item indices aligned", () => {
    const rows = buildDisplayRows([
      { title: "T1", source: "tab" },
      { title: "T2", source: "tab" },
      { title: "A1", source: "action" },
      { title: "B1", source: "bookmark" },
    ]);

    expect(rows).toEqual([
      { kind: "header", label: "Open tabs" },
      { kind: "item", item: { title: "T1", source: "tab" }, itemIndex: 0 },
      { kind: "item", item: { title: "T2", source: "tab" }, itemIndex: 1 },
      { kind: "header", label: "Actions" },
      { kind: "item", item: { title: "A1", source: "action" }, itemIndex: 2 },
      { kind: "header", label: "Bookmarks" },
      { kind: "item", item: { title: "B1", source: "bookmark" }, itemIndex: 3 },
    ]);
  });

  it("renders no section headers for homogeneous scopes (history, folders)", () => {
    const history = buildDisplayRows([
      { title: "H1", source: "history" },
      { title: "H2", source: "history" },
    ]);
    const folders = buildDisplayRows([
      { title: "F1", source: "folder" },
      { title: "F2", source: "folder" },
    ]);

    expect(history.every((r) => r.kind === "item")).toBe(true);
    expect(folders.every((r) => r.kind === "item")).toBe(true);
  });
});

describe("ActionList folder rows", () => {
  it("shows the folder name and full path badge, with no subtitle line", () => {
    const folder: ActionItem = {
      id: "f1",
      title: "Team",
      path: `Bookmarks Bar${BOOKMARK_PATH_SEPARATOR}Work`,
      source: "folder",
    };

    render(<ActionList loading={false} actions={[folder]} selected={0} onSelect={vi.fn()} onAction={vi.fn()} />);

    expect(screen.getByText("Team")).toBeInTheDocument();
    // Full parent path shown in the badge (not root-stripped, not truncated here).
    expect(screen.getByText(`Bookmarks Bar${BOOKMARK_PATH_SEPARATOR}Work`)).toBeInTheDocument();
    // No description subtitle for folders — the "-" placeholder never renders.
    expect(screen.queryByText("-")).toBeNull();
  });
});
