import React, { useRef, useEffect, useState, useMemo } from "react";
import debounce from "lodash.debounce";
import { DEBOUNCE_DELAY } from "../utils/constants";
import { Badge } from "./ui/badge";
import "../assets/tailwind.css";

interface FilterProps {
  value: string;
  command: string;
  onValueChange: (value: string) => void;
}

function Filter({ value, command, onValueChange }: FilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const debouncedFilterChange = useMemo(
    () => debounce(onValueChange, DEBOUNCE_DELAY),
    [onValueChange]
  );

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(event.target.value);
    debouncedFilterChange(event.target.value);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="border-b border-neutral-300 dark:border-neutral-600 flex items-center gap-x-2 px-5 py-4">
      {command && (
        <Badge variant="secondary" className="border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 h-5 min-w-5 rounded-full font-mono text-xs  cursor-default">{command}</Badge>
      )}
      <input
        id="filter"
        className={`dark:text-neutral-300 text-neutral-950 outline-none border-none box-shadow-none focus:outline-none active:outline-none flex-1 bg-transparent text-sm font-mono`}
        ref={inputRef}
        aria-label="Search"
        placeholder="Type to search..."
        value={inputValue}
        onChange={handleInput}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      {
        !command && (
          <div className="items-center gap-x-2 cursor-default hidden sm:flex whitespace-nowrap">
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 hidden sm:block">Search bookmarks</span>
            <Badge variant="outline" className="border-neutral-300 dark:border-neutral-600 h-5 min-w-5 rounded-full px-1.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">Tab</Badge>
          </div>
        )
      }
    </div>
  );
}

export default Filter;
