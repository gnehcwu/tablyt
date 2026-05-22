import { useEffect, useMemo, useRef, useState } from "react";
import { Github } from "lucide-react";
import Palette from "@/components/Palette";
import { Kbd } from "@/components/ui/kbd";
import {
  applyTheme,
  DEFAULT_THEME,
  getTheme,
  setTheme,
  subscribeTheme,
  THEMES,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/utils/theme";
import "@/assets/tailwind.css";

function MiniPalette() {
  return (
    <div className="bg-white dark:bg-black h-full w-full flex flex-col">
      <div className="px-2 py-1.5 border-b border-neutral-300 dark:border-neutral-600">
        <div className="h-[3px] w-9 rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </div>
      <div className="flex-1 px-2 py-2 flex flex-col justify-center gap-1.5">
        <div className="h-[3px] w-[62%] rounded-full bg-neutral-400/70 dark:bg-neutral-500" />
        <div className="h-[3px] w-[78%] rounded-full bg-neutral-400/70 dark:bg-neutral-500" />
        <div className="h-[3px] w-[48%] rounded-full bg-neutral-400/70 dark:bg-neutral-500" />
      </div>
      <div className="px-2 py-1.5 border-t border-neutral-300 dark:border-neutral-600">
        <div className="h-[3px] w-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </div>
    </div>
  );
}

interface ThemeThumbnailProps {
  theme: Theme;
  label: string;
  selected: boolean;
  onSelect: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

function ThemeThumbnail({ theme, label, selected, onSelect, buttonRef }: ThemeThumbnailProps) {
  const isSystem = theme === THEMES.SYSTEM;
  const themeClass = theme === THEMES.LIGHT || isSystem ? "" : theme;

  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={`group rounded-2xl cursor-pointer flex flex-col items-center gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground/40 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        selected ? "-translate-y-1" : "hover:-translate-y-0.5 active:scale-[0.98]"
      }`}
    >
      <div
        className={`w-full aspect-[16/10] rounded-xl overflow-hidden border transition-[border-color,box-shadow] duration-300 ease-out ${
          selected
            ? "border-primary shadow-[0_14px_30px_-16px_rgba(0,0,0,0.32)]"
            : "border-border group-hover:border-foreground/40"
        }`}
      >
        {isSystem ? (
          <div className="grid grid-cols-2 h-full">
            <MiniPalette />
            <div className="dark h-full">
              <MiniPalette />
            </div>
          </div>
        ) : (
          <div className={`${themeClass} h-full`}>
            <MiniPalette />
          </div>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span
          className={`text-xs leading-tight transition-colors duration-200 ${
            selected ? "text-foreground font-medium" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
        <span
          aria-hidden
          className={`h-px bg-primary rounded-full transition-[width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            selected ? "w-5 opacity-100" : "w-0 opacity-0"
          }`}
        />
      </div>
    </button>
  );
}

function Options() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const previewRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent),
    []
  );

  useEffect(() => {
    getTheme().then(setThemeState);

    const onStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName
    ) => {
      if (area !== "local" || !(THEME_STORAGE_KEY in changes)) return;
      const next = (changes[THEME_STORAGE_KEY].newValue as Theme) || DEFAULT_THEME;
      setThemeState(next);
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTheme((resolved) => {
      if (previewRef.current) applyTheme(previewRef.current, resolved);
    });
    return unsubscribe;
  }, []);

  const handleSelect = (next: Theme) => {
    setThemeState(next);
    setTheme(next).catch(() => {});
  };

  const handleGroupKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const navKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!navKeys.includes(event.key)) return;
    event.preventDefault();

    const total = THEME_OPTIONS.length;
    const currentIndex = THEME_OPTIONS.findIndex((o) => o.value === theme);
    const base = currentIndex < 0 ? 0 : currentIndex;
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = (base + delta + total) % total;

    handleSelect(THEME_OPTIONS[nextIndex].value);
    thumbRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-[920px] mx-auto px-8 pt-16 pb-24">
        <header className="mb-14 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-2xl tracking-tight">Pick a look.</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Six themes for Tablyt.
            </p>
          </div>
          <a
            href="https://github.com/gnehcwu/tablyt"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Tablyt on GitHub"
            title="View on GitHub"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            <Github className="w-[18px] h-[18px]" />
          </a>
        </header>

        <section
          role="radiogroup"
          aria-label="Theme"
          onKeyDown={handleGroupKeyDown}
          className="mb-20 grid grid-cols-3 sm:grid-cols-6 gap-6"
        >
          {THEME_OPTIONS.map((opt, i) => (
            <ThemeThumbnail
              key={opt.value}
              theme={opt.value}
              label={opt.label}
              selected={theme === opt.value}
              onSelect={() => handleSelect(opt.value)}
              buttonRef={(el) => {
                thumbRefs.current[i] = el;
              }}
            />
          ))}
        </section>

        <section>
          <div
            className="rounded-3xl p-8 sm:p-14 flex justify-center"
            style={{
              backgroundColor: "oklch(0.99 0 0)",
              backgroundImage:
                "radial-gradient(circle at 1px 1px, oklch(0.5 0 0 / 0.18) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          >
            <div ref={previewRef} className="w-full max-w-[789px]">
              <Palette embedded />
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Kbd className="text-[10px]">{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd className="text-[10px]">⇧</Kbd>
            <Kbd className="text-[10px]">K</Kbd>
            <span>from any tab.</span>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Options;
