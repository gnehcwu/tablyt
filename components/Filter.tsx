import React, { useRef, useEffect, useState, useMemo } from "react";
import debounce from "lodash.debounce";
import { DEBOUNCE_DELAY } from "@/utils/constants";
import { Badge } from "./ui/badge";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import "@/assets/tailwind.css";
import { Kbd } from "./ui/kbd";

interface FilterProps {
  value: string;
  command: string;
  onValueChange: (value: string) => void;
}

function Filter({ value, command, onValueChange }: FilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const debouncedFilterChange = useMemo(() => debounce(onValueChange, DEBOUNCE_DELAY), [onValueChange]);

  const plugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

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
    <div className="border-b border-neutral-300 dark:border-neutral-600 flex items-center gap-x-2 px-[21px] py-4">
      {command && (
        <Badge
          variant="secondary"
          className="border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 h-5 min-w-5 rounded-full font-mono text-xs  cursor-default"
        >
          {command}
        </Badge>
      )}
      <input
        id="filter"
        className={`dark:text-neutral-200 text-neutral-950 outline-none border-none box-shadow-none focus:outline-none active:outline-none flex-1 bg-transparent text-sm font-mono selection:bg-neutral-900 selection:text-neutral-100 dark:selection:bg-neutral-200 dark:selection:text-neutral-900`}
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
      {!command && (
        <Carousel
          plugins={[plugin.current]}
          orientation="vertical"
          opts={{ align: "start", loop: true }}
          className="h-5 overflow-hidden"
        >
          <CarouselContent className="h-5 mt-0">
            <CarouselItem key={0} className="h-5 pt-0 basis-full self-end">
              <div className="items-center gap-x-2 cursor-default hidden sm:flex whitespace-nowrap h-5">
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 hidden sm:block">
                  Search bookmarks
                </span>
                <Kbd className="min-w-[30px] rounded-xs text-xs font-mono font-semibold">Tab</Kbd>
              </div>
            </CarouselItem>
            <CarouselItem key={1} className="h-5 pt-0 basis-full self-end">
              <div className="items-center gap-x-2 cursor-default hidden sm:flex whitespace-nowrap">
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 hidden sm:block">
                  Search history
                </span>
                <Kbd className="min-w-[30px] h-4.5 rounded-xs text-sm font-mono font-bold">!</Kbd>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
}

export default Filter;
