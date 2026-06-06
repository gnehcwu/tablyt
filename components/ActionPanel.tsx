import React, { useEffect, useMemo, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import type { SubAction } from "@/utils/types";
import { filterPanelActions } from "@/utils/actionPanelActions";
import { Kbd } from "./ui/kbd";
import "@/assets/tailwind.css";

interface ActionPanelProps {
  itemLabel: string;
  actions: SubAction[];
  onDismiss: () => void;
}

// Strong custom ease-out, matching the palette's other motion.
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

// A Raycast-style floating menu nestled into the palette's bottom-right corner.
// A search field pinned at the bottom owns focus the whole time the panel is
// open, so the user can filter the actions and run one without leaving the
// keyboard. The panel owns its own keyboard while open (the field's onKeyDown,
// stopPropagation'd) so the palette card underneath stays inert.
function ActionPanel({ itemLabel, actions, onDismiss }: ActionPanelProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => filterPanelActions(actions, query), [actions, query]);

  // Keep the selection in range as the filtered set shrinks/grows.
  useEffect(() => {
    setSelected((s) => (s >= filtered.length ? 0 : s));
  }, [filtered.length]);

  // The search field holds focus for the panel's whole lifetime. FocusLock traps
  // focus here and restores it to the palette search input when the panel closes.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Keep the highlighted row visible as navigation moves through a long list.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    // scrollIntoView is unimplemented in jsdom — guard so tests don't throw.
    node?.scrollIntoView?.({ block: "nearest" });
  }, [selected]);

  const runByClick = (action: SubAction) => {
    // Brief press flash so a click reads as a deliberate activation.
    setPressedKey(action.key);
    window.setTimeout(() => setPressedKey(null), 120);
    action.run();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // The panel owns the keyboard while open — never let these reach the palette
    // card underneath (which would move the main list / change the query).
    event.stopPropagation();

    // ⌘K / Ctrl+K closes the panel (mirrors the open shortcut).
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      onDismiss();
      return;
    }

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Tab": {
        event.preventDefault();
        const total = filtered.length;
        if (!total) return;
        const dir = event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey) ? 1 : -1;
        setSelected((s) => (s + dir + total) % total);
        return;
      }
      case "Enter": {
        event.preventDefault();
        filtered[selected]?.run();
        return;
      }
      case "Escape": {
        event.preventDefault();
        onDismiss();
        return;
      }
      default:
        // Everything else types into the search field (default not prevented).
        return;
    }
  };

  return (
    <FocusLock returnFocus>
      {/* Invisible click-catcher: dismiss on any click outside the panel
          without dimming the palette underneath. */}
      <div onMouseDown={onDismiss} aria-hidden="true" className="absolute inset-0 z-[5]" />
      <div
        role="menu"
        aria-label={`Actions for ${itemLabel}`}
        // Origin matches the ⌘K hint anchor so the scale-in grows from where
        // the eye is.
        style={{ transformOrigin: "bottom right", animationTimingFunction: EASE_OUT }}
        className={[
          "outline-none focus:outline-none",
          // 8px inset + rounded-2xl (16px) sit concentric inside the palette
          // card's rounded-3xl (24px): 24 − 8 = 16.
          "absolute bottom-2 right-2 z-10 flex w-[268px] flex-col select-none",
          "overflow-hidden rounded-2xl border border-neutral-300 dark:border-neutral-600",
          "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-200",
          "shadow-[0_22px_48px_-14px_rgba(0,0,0,0.45),0_4px_12px_-6px_rgba(0,0,0,0.25)]",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150",
        ].join(" ")}
      >
        <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-2.5">
          <span className="line-clamp-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">{itemLabel}</span>
        </div>

        {/* Scrolls when there are more actions than fit; the search field below
            it stays pinned to the bottom of the panel. */}
        <ul ref={listRef} className="flex max-h-[240px] flex-col gap-y-0.5 overflow-y-auto scrollbar-hide p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-center font-mono text-xs text-neutral-500 dark:text-neutral-400">
              No matching actions
            </li>
          ) : (
            filtered.map((action, i) => {
              const active = i === selected;
              const pressed = pressedKey === action.key;
              return (
                <li key={action.key} data-index={i}>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onMouseMove={() => setSelected(i)}
                    onClick={() => runByClick(action)}
                    style={pressed ? { transform: "scale(0.96)" } : undefined}
                    className={[
                      "flex h-9 w-full cursor-default items-center rounded-lg px-3",
                      // Transparent border slot so the contrast themes' border-only
                      // selection (which repaints bg-neutral-200/800 as an outline)
                      // has a border to draw on — matches the list Item primitive.
                      "border border-transparent",
                      "text-left font-mono text-sm outline-none focus:outline-none",
                      // Only the press scale animates. Selection moves on every
                      // keystroke, so the highlight snaps instantly (matching the
                      // list rows) — transitioning bg/border made the contrast
                      // themes' border-only selection flicker on fast navigation.
                      "transition-transform duration-150 ease-out",
                      pressed
                        ? "bg-neutral-200/75 dark:bg-neutral-800/75"
                        : active
                          ? "bg-neutral-200 dark:bg-neutral-800"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800/50",
                    ].join(" ")}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-x-2.5">
                      {action.icon && (
                        <span
                          className={[
                            "inline-flex h-4 w-4 shrink-0 items-center justify-center self-center",
                            active
                              ? "text-neutral-950 dark:text-neutral-200"
                              : "text-neutral-500 dark:text-neutral-400",
                          ].join(" ")}
                        >
                          {action.icon}
                        </span>
                      )}
                      <span className="truncate leading-none">{action.label}</span>
                    </span>
                    {action.shortcut && (
                      <Kbd className="ml-3 self-center rounded-md px-1 py-px text-xs font-normal">{action.shortcut}</Kbd>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <input
            ref={inputRef}
            data-autofocus
            aria-label="Search actions"
            placeholder="Search for actions..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent font-mono text-sm text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-neutral-200 dark:placeholder:text-neutral-500"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      </div>
    </FocusLock>
  );
}

export default ActionPanel;
