import React, { useRef, useEffect, useState, useMemo } from "react";
import debounce from "lodash.debounce";
import { DEBOUNCE_DELAY, ACTION_MODE } from "@/utils/constants";
import { Badge } from "./ui/badge";
import { Search } from "lucide-react";
import "@/assets/tailwind.css";

interface FilterProps {
  value: string;
  command: string;
  onValueChange: (value: string) => void;
}

function Filter({ value, command, onValueChange }: FilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const debouncedFilterChange = useMemo(() => debounce(onValueChange, DEBOUNCE_DELAY), [onValueChange]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setInputValue(value);

    if (command) {
      debouncedFilterChange(value);
    } else {
      onValueChange(value);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="border-b border-neutral-300 dark:border-neutral-600 flex items-center gap-x-2.5 px-[21px] py-[18px]">
      <Search className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-400" strokeWidth={2} aria-hidden="true" />
      {command && (
        <Badge
          variant="secondary"
          className="h-5 rounded-full font-mono text-xs cursor-default"
        >
          {command}
        </Badge>
      )}
      <input
        id="filter"
        className={`dark:text-neutral-200 text-neutral-950 outline-none border-none box-shadow-none focus:outline-none active:outline-none flex-1 bg-transparent text-sm font-mono selection:bg-neutral-900 selection:text-neutral-100 dark:selection:bg-neutral-200 dark:selection:text-neutral-900`}
        ref={inputRef}
        aria-label="Search"
        placeholder={
          command === ACTION_MODE.MOVE
            ? "Move to folder…"
            : command === ACTION_MODE.BOOKMARK
              ? "Bookmark to folder…"
              : "Type to search..."
        }
        value={inputValue}
        onChange={handleInput}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      {!command && (
        <div className="items-center gap-x-1.5 cursor-default hidden sm:flex whitespace-nowrap">
          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">History</span>
          <Badge variant="secondary" className="h-5 rounded-full font-mono text-xs cursor-default">Tab</Badge>
        </div>
      )}
    </div>
  );
}

export default Filter;
