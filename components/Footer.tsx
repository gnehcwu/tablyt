import React from "react";
import { Kbd } from "./ui/kbd";
import "../assets/tailwind.css";

interface FooterProps {
  filteredActionItemsCount: number;
  totalActionItemsCount: number;
}

const KEYBOARD_SYMBOLS = {
  ENTER: "⏎",
  UP: "↑",
  DOWN: "↓",
  ESC: "esc",
} as const;

function Footer({ filteredActionItemsCount: filteredBookmarkCount, totalActionItemsCount: totalBookmarkCount }: FooterProps) {
  const searchedResult = `${Math.min(
    filteredBookmarkCount,
    totalBookmarkCount
  )}/${totalBookmarkCount}`;

  return (
    <div className="flex flex-row items-center justify-between p-[12px_16px] border-t border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 text-xs font-mono cursor-default">
      <p>{searchedResult}</p>
      <div className="items-center gap-x-6 hidden sm:flex">
        <div className="flex items-center gap-x-1">
          <Kbd aria-label="Close" className="text-xs font-mono">
            {KEYBOARD_SYMBOLS.ESC}
          </Kbd>
          <span>to close</span>
        </div>
        <div className="flex items-center gap-x-1">
          <Kbd aria-label="Open">{KEYBOARD_SYMBOLS.ENTER}</Kbd>
          <span>to open</span>
        </div>
        <div className="flex items-center gap-x-1">
          <Kbd aria-label="Move up">{KEYBOARD_SYMBOLS.UP}</Kbd>
          <Kbd aria-label="Move down">{KEYBOARD_SYMBOLS.DOWN}</Kbd>
          <span>to select</span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Footer);
