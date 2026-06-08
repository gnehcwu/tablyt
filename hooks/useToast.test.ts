import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useToast from "@/hooks/useToast";

describe("useToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows a toast and auto-dismisses after the duration", () => {
    const { result } = renderHook(() => useToast(2200));
    expect(result.current.toast).toBeNull();

    act(() => result.current.showToast("Bookmarked"));
    expect(result.current.toast).toMatchObject({ message: "Bookmarked" });

    act(() => vi.advanceTimersByTime(2200));
    expect(result.current.toast).toBeNull();
  });

  it("replaces in place (new id) and resets the dismiss timer", () => {
    const { result } = renderHook(() => useToast(2200));

    act(() => result.current.showToast("First"));
    const firstId = result.current.toast!.id;

    // Just before the first would dismiss, a second supersedes it.
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.showToast("Second"));
    expect(result.current.toast).toMatchObject({ message: "Second" });
    expect(result.current.toast!.id).not.toBe(firstId);

    // The original timer was cleared — the toast is still up after the old window.
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.toast?.message).toBe("Second");

    // The reset timer dismisses it a full duration after the second show.
    act(() => vi.advanceTimersByTime(2200));
    expect(result.current.toast).toBeNull();
  });
});
