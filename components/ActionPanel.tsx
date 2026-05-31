import { useEffect, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import type { SubAction } from "@/utils/types";
import { Kbd } from "./ui/kbd";
import "@/assets/tailwind.css";

interface ActionPanelProps {
  itemLabel: string;
  actions: SubAction[];
  selected: number;
  onSelect: (index: number) => void;
  onRun: (action: SubAction) => void;
  onDismiss: () => void;
}

// Strong custom ease-out, matching the palette's other motion.
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

// A Raycast-style floating menu nestled into the palette's bottom-right corner.
// Keyboard navigation is owned by the parent (Palette.handleKeyDown) so focus
// stays on the search input — this component only renders state and forwards
// mouse interaction.
function ActionPanel({ itemLabel, actions, selected, onSelect, onRun, onDismiss }: ActionPanelProps) {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  // Move focus onto the menu container (not the buttons — keyboard nav is owned
  // by the parent's onKeyDown via bubbling, and focusing a button would let
  // Enter fire a native click on top of our handler). FocusLock then traps focus
  // here and restores it to the search input when the panel closes.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  const handleClick = (action: SubAction) => {
    // Brief press flash so a click reads as a deliberate activation.
    setPressedKey(action.key);
    window.setTimeout(() => setPressedKey(null), 120);
    onRun(action);
  };

  return (
    <FocusLock returnFocus>
      {/* Invisible click-catcher: dismiss on any click outside the panel
          without dimming the palette underneath. */}
      <div onMouseDown={onDismiss} aria-hidden="true" className="absolute inset-0 z-[5]" />
      <div
        ref={containerRef}
        tabIndex={-1}
        data-autofocus
        role="menu"
        aria-label={`Actions for ${itemLabel}`}
        // Origin matches the ⌘K hint anchor so the scale-in grows from where
        // the eye is.
        style={{ transformOrigin: "bottom right", animationTimingFunction: EASE_OUT }}
        className={[
          "outline-none focus:outline-none",
          // 8px inset + rounded-2xl (16px) sit concentric inside the palette
          // card's rounded-3xl (24px): 24 − 8 = 16.
          "absolute bottom-2 right-2 z-10 w-[268px] select-none",
          "overflow-hidden rounded-2xl border border-neutral-300 dark:border-neutral-600",
          "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-200",
          "shadow-[0_22px_48px_-14px_rgba(0,0,0,0.45),0_4px_12px_-6px_rgba(0,0,0,0.25)]",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150",
        ].join(" ")}
      >
        <div className="border-b border-neutral-200 dark:border-neutral-700 px-4 py-2.5">
          <span className="line-clamp-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">{itemLabel}</span>
        </div>
        <ul className="flex flex-col gap-y-0.5 p-2">
          {actions.map((action, i) => {
            const active = i === selected;
            const pressed = pressedKey === action.key;
            return (
              <li key={action.key}>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onMouseMove={() => onSelect(i)}
                  onClick={() => handleClick(action)}
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
                          active ? "text-neutral-950 dark:text-neutral-200" : "text-neutral-500 dark:text-neutral-400",
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
          })}
        </ul>
      </div>
    </FocusLock>
  );
}

export default ActionPanel;
