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
    <div className="border-b border-neutral-300 dark:border-neutral-600 relative">
      {command && (
        <Badge variant="outline" className="border-neutral-300 dark:border-neutral-600 h-5 min-w-5 rounded-full px-1.5 font-mono text-xs text-neutral-500 dark:text-neutral-400 absolute top-4 left-[22px] cursor-default">{command}</Badge>
      )}
      <input
        id="filter"
        className={`dark:text-neutral-300 text-neutral-950 outline-none border-none box-shadow-none focus:outline-none active:outline-none m-4 p-[0px_8px] w-[calc(100%-32px)] bg-transparent text-sm font-mono ${command ? "pl-24" : ""}`}
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
          <div className="absolute top-[18px] right-[22px] flex items-center gap-x-2 cursor-default">
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 hidden sm:block">Search bookmarks</span>
            <Badge variant="outline" className="border-neutral-300 dark:border-neutral-600 h-5 min-w-5 rounded-full px-1.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">Tab</Badge>
          </div>
        )
      }
    </div>
  );
}

export default Filter;
