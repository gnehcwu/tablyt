import { describe, it, expect } from "vitest";
import scoreActions from "@/utils/scoring/scoreActions";
import type { ActionItem } from "@/utils/types";

const item = (title: string, over: Partial<ActionItem> = {}): ActionItem => ({ title, ...over });

describe("scoreActions", () => {
  it("returns an empty list for no items", () => {
    expect(scoreActions([], "anything")).toEqual([]);
  });

  it("passes items through unscored when the query is shorter than the minimum match", () => {
    const items = [item("Zebra"), item("Apple")];

    // 1 char is below DEFAULT_MINIMUM_MATCH (2), so no filtering/reordering.
    expect(scoreActions(items, "z")).toEqual(items);
  });

  it("drops items that don't match the pattern at all", () => {
    const items = [item("GitHub"), item("Calendar")];

    const result = scoreActions(items, "github");

    expect(result.map((i) => i.title)).toEqual(["GitHub"]);
  });

  it("sorts matches by descending score", () => {
    const items = [item("react testing library"), item("react")];

    const result = scoreActions(items, "react") as (ActionItem & { score: number })[];

    expect(result.length).toBeGreaterThan(1);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("nudges an open tab above an equally-matching bookmark (source boost)", () => {
    const items: ActionItem[] = [
      item("github", { source: "bookmark", url: "https://github.com" }),
      item("github", { source: "tab", url: "https://github.com" }),
    ];

    const result = scoreActions(items, "github");

    expect(result[0].source).toBe("tab");
  });

  it("matches against domain and path, not just title", () => {
    const items = [item("Untitled", { domain: "stackoverflow.com", path: "/questions" })];

    expect(scoreActions(items, "stackoverflow")).toHaveLength(1);
    expect(scoreActions(items, "questions")).toHaveLength(1);
  });
});
