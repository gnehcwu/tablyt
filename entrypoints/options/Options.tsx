import { useEffect, useMemo, useRef, useState } from "react";
import {
  Github,
  ArrowUpRight,
  AppWindow,
  Bookmark,
  History,
  Globe,
  CopyPlus,
  VolumeX,
  FolderDown,
  Blocks,
  Cog,
  BadgeQuestionMark,
  Settings2,
  BadgeInfo,
} from "lucide-react";
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

const REPO_URL = "https://github.com/gnehcwu/tablyt";
const ISSUES_URL = `${REPO_URL}/issues`;
const RELEASES_URL = `${REPO_URL}/releases`;

// Stronger than CSS's default ease-out — gives motion proper snap without
// looking abrupt. From Emil Kowalski's animation principles.
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

type ViewKey = "theme" | "reference" | "about";

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: "theme", label: "Theme" },
  { key: "reference", label: "Reference" },
  { key: "about", label: "About" },
];

// Content blocks cascade in just after the SectionHeader's own staggered reveal,
// so header + body read as one motion event. motion-safe only — reduced-motion
// users get the content with opacity, no movement. Mirrors SectionHeader's curve.
const REVEAL =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300";
const revealStyle = (index: number): React.CSSProperties => ({
  animationTimingFunction: EASE_OUT,
  animationDelay: `${140 + index * 60}ms`,
  animationFillMode: "both",
});

// Search scopes the palette exposes. Mirrors the mode switching in
// Palette.tsx#handleKeyDown — kept in lockstep manually.
const SCOPES: { key: string; icon: React.ReactNode; label: string; combo: React.ReactNode; desc: string }[] = [
  { key: "tabs", icon: <AppWindow />, label: "Tabs", combo: <span className="text-muted-foreground">Default</span>, desc: "Every open tab across all your windows — shown first." },
  { key: "bookmarks", icon: <Bookmark />, label: "Bookmarks", combo: <span className="text-muted-foreground">Default</span>, desc: "Listed right alongside your tabs — just start typing." },
  { key: "history", icon: <History />, label: "History", combo: <Kbd>Tab</Kbd>, desc: "Its own scope — your recent browsing history." },
  { key: "web", icon: <Globe />, label: "Web", combo: <span className="text-muted-foreground">No match</span>, desc: "Falls back to a search with your default engine." },
];

// Mirrors BROWSER_ACTIONS in Palette.tsx — kept in lockstep manually.
const ACTIONS: { key: string; icon: React.ReactNode; label: string; desc: string }[] = [
  { key: "duplicate", icon: <CopyPlus />, label: "Duplicate", desc: "Duplicate the current tab" },
  { key: "mute", icon: <VolumeX />, label: "Toggle mute", desc: "Mute or unmute the current tab" },
  { key: "downloads", icon: <FolderDown />, label: "Downloads", desc: "Open browser downloads" },
  { key: "extensions", icon: <Blocks />, label: "Extensions", desc: "Manage browser extensions" },
  { key: "settings", icon: <Cog />, label: "Browser settings", desc: "Open browser settings" },
  { key: "tablyt", icon: <Settings2 />, label: "Tablyt settings", desc: "Open this page" },
  { key: "about", icon: <BadgeInfo />, label: "About", desc: "About the extension" },
];

// A label → description list whose first column auto-sizes to its widest term
// and stays aligned across rows (no magic widths). Shared by Keyboard,
// Permissions, and Built-with so they read as one consistent system.
function DefinitionGrid({
  rows,
}: {
  rows: { key: string; term: React.ReactNode; desc: React.ReactNode }[];
}) {
  return (
    <dl className="mt-3 grid grid-cols-[max-content_1fr] items-start gap-x-5 gap-y-2.5 text-sm">
      {rows.flatMap((r) => [
        <dt key={`${r.key}-t`} className="flex items-center gap-1 leading-5">
          {r.term}
        </dt>,
        <dd key={`${r.key}-d`} className="leading-5 text-neutral-500 dark:text-neutral-400">
          {r.desc}
        </dd>,
      ])}
    </dl>
  );
}

// A miniature of the palette card for the theme thumbnails — mirrors the real
// surfaces (bg-white/black + neutral borders) so each theme class repaints it
// via the per-theme overrides in tailwind.css.
function MiniPalette() {
  return (
    <div className="bg-white dark:bg-black h-full w-full flex flex-col">
      <div className="px-2 py-1.5 border-b border-neutral-300 dark:border-neutral-600">
        <div className="h-[3px] w-9 rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </div>
      <div className="flex-1 px-2 py-2 flex flex-col justify-center gap-1.5">
        {/* First bar sits on a selected-row tint to echo the live palette. */}
        <div className="-mx-1 rounded-md bg-neutral-200 dark:bg-neutral-800 px-1 py-1">
          <div className="h-[3px] w-[62%] rounded-full bg-neutral-500 dark:bg-neutral-400" />
        </div>
        <div className="h-[3px] w-[78%] rounded-full bg-neutral-400/70 dark:bg-neutral-500 mx-1" />
        <div className="h-[3px] w-[48%] rounded-full bg-neutral-400/70 dark:bg-neutral-500 mx-1" />
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
      style={{ transitionTimingFunction: EASE_OUT }}
      className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl outline-none transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground/40 active:scale-[0.97] ${
        selected ? "-translate-y-1.5" : "hover:-translate-y-1"
      }`}
    >
      <div
        style={{ transitionTimingFunction: EASE_OUT }}
        className={`aspect-[16/10] w-full overflow-hidden rounded-xl border-2 transition-[border-color,box-shadow] duration-300 ${
          selected
            ? "border-foreground shadow-[0_22px_44px_-18px_rgba(0,0,0,0.45)]"
            : "border-border group-hover:border-foreground/40"
        }`}
      >
        {isSystem ? (
          <div className="grid h-full grid-cols-2">
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
      <div className="flex flex-col items-center gap-1.5">
        <span
          className={`text-[13px] leading-none transition-colors duration-200 ${
            selected ? "font-semibold tracking-tight text-foreground" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
        {/* Transform-only underline: scale-x from center beats width transitions
            on perf, and the curve matches the rest of the page. */}
        <span
          aria-hidden
          style={{ transitionTimingFunction: EASE_OUT, transformOrigin: "center" }}
          className={`h-[2px] w-6 rounded-full bg-foreground transition-[transform,opacity] duration-300 ${
            selected ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
          }`}
        />
      </div>
    </button>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function NavButton({ active, onClick, children }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "relative w-full rounded-md px-3 py-2 text-left text-[13px]",
        "transition-[background-color,color,transform] duration-150 ease-out",
        "active:scale-[0.985] motion-reduce:active:scale-100",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-muted font-semibold text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ].join(" ")}
    >
      {/* Left accent bar — scales in from the top edge so the reveal has
          direction (matches top-down scan order), not just a pop of opacity. */}
      <span
        aria-hidden
        style={{ transitionTimingFunction: EASE_OUT, transformOrigin: "top" }}
        className={[
          "absolute top-1.5 bottom-1.5 -left-px w-[3px] rounded-full bg-foreground",
          "transition-[transform,opacity] duration-200",
          active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
        ].join(" ")}
      />
      {children}
    </button>
  );
}

// Title-first section header. Whitespace alone carries the hierarchy; the
// staggered entrance gives title then subtitle a sense of arrival.
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const enter =
    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300";
  return (
    <header className="mb-14">
      <h1
        className={`${enter} text-[40px] font-medium leading-[0.95] tracking-[-0.02em] text-foreground`}
        style={{ animationTimingFunction: EASE_OUT, animationFillMode: "both" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={`${enter} mt-5 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400`}
          style={{ animationTimingFunction: EASE_OUT, animationDelay: "60ms", animationFillMode: "both" }}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
    >
      {children}
      <ArrowUpRight
        size={12}
        aria-hidden="true"
        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
      />
    </a>
  );
}

interface ThemeSectionProps {
  theme: Theme;
  onSelect: (next: Theme) => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
  thumbRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
}

function ThemeSection({ theme, onSelect, previewRef, thumbRefs }: ThemeSectionProps) {
  return (
    <>
      <SectionHeader title="Theme" subtitle="Six looks. Applied wherever the palette appears." />

      <section
        role="radiogroup"
        aria-label="Theme"
        className="mb-16 grid grid-cols-3 gap-6 sm:grid-cols-6"
      >
        {THEME_OPTIONS.map((opt, i) => (
          <ThemeThumbnail
            key={opt.value}
            theme={opt.value}
            label={opt.label}
            selected={theme === opt.value}
            onSelect={() => onSelect(opt.value)}
            buttonRef={(el) => {
              thumbRefs.current[i] = el;
            }}
          />
        ))}
      </section>

      {/* The live palette is its own demonstration — no frame, no dot grid;
          ornament around it competes. A soft shadow lifts it off the page. */}
      <div className="flex justify-center">
        <div
          ref={previewRef}
          className="w-full max-w-[789px] rounded-3xl [&>*]:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
        >
          <Palette embedded />
        </div>
      </div>
    </>
  );
}

function ReferenceSection() {
  const keys: { combo: React.ReactNode; label: string }[] = [
    {
      combo: (
        <>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </>
      ),
      label: "Move between results",
    },
    { combo: <Kbd>⏎</Kbd>, label: "Open the selected result, or switch to the tab" },
    { combo: <Kbd>Tab</Kbd>, label: "Toggle History search" },
    { combo: <Kbd>⌫</Kbd>, label: "Exit History (when the filter is empty)" },
    { combo: <Kbd>esc</Kbd>, label: "Close the palette" },
  ];

  return (
    <>
      <SectionHeader title="Reference" subtitle="Everything the palette can do, at a glance." />

      <section className="space-y-10">
        <div className={REVEAL} style={revealStyle(0)}>
          <h2 className="text-sm font-medium text-foreground">Search scopes</h2>
          <ul className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {SCOPES.map((s) => (
              <li key={s.key} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-foreground">
                    {s.label}
                    <span className="flex items-center gap-1">{s.combo}</span>
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={REVEAL} style={revealStyle(1)}>
          <h2 className="text-sm font-medium text-foreground">Browser actions</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Type a name in the default scope and press <Kbd className="mx-0.5">⏎</Kbd> to run it.
          </p>
          <ul className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {ACTIONS.map((a) => (
              <li key={a.key} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
                  {a.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-foreground">{a.label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{a.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={REVEAL} style={revealStyle(2)}>
          <h2 className="text-sm font-medium text-foreground">Keyboard</h2>
          <DefinitionGrid rows={keys.map((k) => ({ key: k.label, term: k.combo, desc: k.label }))} />
        </div>
      </section>
    </>
  );
}

function AboutSection({ isMac, version }: { isMac: boolean; version: string }) {
  const mod = isMac ? "⌘" : "Ctrl";
  return (
    <>
      <SectionHeader title="About" subtitle="A command palette for your browser, local-first." />

      <section className="space-y-10">
        <div className={REVEAL} style={revealStyle(0)}>
          <h2 className="text-sm font-medium text-foreground">Getting started</h2>
          <ol className="mt-3 space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li>1 — Open any tab.</li>
            <li>
              2 — Press <Kbd>{mod}</Kbd>
              <Kbd className="mx-0.5">⇧</Kbd>
              <Kbd>K</Kbd> to summon the palette.
            </li>
            <li>3 — Start typing to jump to a tab, bookmark, or history entry — or run an action.</li>
          </ol>
        </div>

        <div className={REVEAL} style={revealStyle(1)}>
          <h2 className="text-sm font-medium text-foreground">What it does</h2>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li>— Search open tabs and bookmarks together — one list, just start typing.</li>
            <li>— Open tabs come first and switch instantly; bookmarks open in a new tab.</li>
            <li>
              — Press <Kbd className="mx-0.5">Tab</Kbd> to search your history in its own scope.
            </li>
            <li>— Trigger browser actions: duplicate, mute, downloads, extensions, and more.</li>
            <li>— No match? It falls back to a search with your default engine.</li>
          </ul>
        </div>

        <div className={REVEAL} style={revealStyle(2)}>
          <h2 className="text-sm font-medium text-foreground">Shortcut</h2>
          <DefinitionGrid
            rows={[
              {
                key: "toggle",
                term: (
                  <>
                    <Kbd>{mod}</Kbd>
                    <Kbd>⇧</Kbd>
                    <Kbd>K</Kbd>
                  </>
                ),
                desc: "Open or close the palette on the current tab",
              },
            ]}
          />
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            Rebind it at{" "}
            <code className="rounded bg-muted/60 px-1 py-px font-mono text-[11px] text-foreground">
              chrome://extensions/shortcuts
            </code>{" "}
            or{" "}
            <code className="rounded bg-muted/60 px-1 py-px font-mono text-[11px] text-foreground">
              about:addons
            </code>
            .
          </p>
        </div>

        <div className={REVEAL} style={revealStyle(3)}>
          <h2 className="text-sm font-medium text-foreground">Privacy</h2>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            <li>— Everything runs locally in your browser.</li>
            <li>— No data is collected, transmitted, or shared with anyone.</li>
            <li>— Built on Manifest V3 for better privacy, security, and performance.</li>
          </ul>
        </div>

        <div className={REVEAL} style={revealStyle(4)}>
          <h2 className="text-sm font-medium text-foreground">Feedback</h2>
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Found a bug or have an idea? <ExternalLink href={ISSUES_URL}>Open an issue</ExternalLink> on GitHub,
            or browse <ExternalLink href={RELEASES_URL}>recent releases</ExternalLink>
            {version ? ` (you're on v${version})` : ""}.
          </p>
        </div>
      </section>
    </>
  );
}

function Options() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [view, setView] = useState<ViewKey>("theme");
  const previewRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent),
    []
  );

  const version = useMemo(() => {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return "";
    }
  }, []);

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

  useEffect(() => {
    // Arrow-key / number-key theme navigation only applies on the Theme view.
    if (view !== "theme") return;

    const isTextTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      return el.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTextTarget(event.target)) return;

      const navKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      const total = THEME_OPTIONS.length;
      const currentIndex = THEME_OPTIONS.findIndex((o) => o.value === theme);
      const base = currentIndex < 0 ? 0 : currentIndex;

      if (navKeys.includes(event.key)) {
        event.preventDefault();
        const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const nextIndex = (base + delta + total) % total;
        handleSelect(THEME_OPTIONS[nextIndex].value);
        thumbRefs.current[nextIndex]?.focus();
        return;
      }

      const num = Number(event.key);
      if (Number.isInteger(num) && num >= 1 && num <= total) {
        event.preventDefault();
        const nextIndex = num - 1;
        handleSelect(THEME_OPTIONS[nextIndex].value);
        thumbRefs.current[nextIndex]?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [theme, view]);

  // Reflect the active section in the tab title so multiple open tabs of the
  // settings page stay distinguishable.
  useEffect(() => {
    const label = NAV_ITEMS.find((item) => item.key === view)?.label;
    document.title = label ? `${label} · Tablyt` : "Tablyt — Settings";
  }, [view]);

  return (
    <div className="min-h-screen bg-background font-mono text-foreground antialiased">
      <div className="mx-auto flex min-h-screen max-w-[1180px]">
        <aside
          aria-label="Settings navigation"
          className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border px-6 py-10"
        >
          {/* Compact inline lockup: icon + wordmark on a shared baseline. */}
          <div className="group/brand mb-14 flex items-center gap-2.5">
            <img
              src="/icon/128.png"
              alt=""
              aria-hidden="true"
              style={{ transitionTimingFunction: EASE_OUT }}
              className="h-7 w-7 shrink-0 rounded-[7px] transition-transform duration-300 group-hover/brand:-rotate-[6deg] group-hover/brand:scale-[1.08] group-active/brand:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
            />
            <p className="text-[15px] font-semibold leading-none tracking-[-0.02em] text-foreground">
              Tablyt
            </p>
          </div>

          <nav aria-label="Sections" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavButton key={item.key} active={view === item.key} onClick={() => setView(item.key)}>
                {item.label}
              </NavButton>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 pt-4 text-xs text-muted-foreground">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-fit items-center gap-1.5 rounded outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Github size={12} aria-hidden="true" />
              <span>GitHub</span>
              <ArrowUpRight
                size={10}
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              />
            </a>
            {version && <span className="tabular-nums">v{version}</span>}
          </div>
        </aside>

        <main aria-label="Settings content" className="min-w-0 flex-1 px-12 pb-24 pt-12">
          {/* key={view} remounts on tab change so the entrance replays. The
              wrapper handles the cross-fade; vertical motion belongs to the
              section's staggered children, tuned to overlap so the whole
              reveal reads as one motion event. */}
          <div
            key={view}
            style={{ animationTimingFunction: EASE_OUT }}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          >
            {view === "theme" ? (
              <ThemeSection
                theme={theme}
                onSelect={handleSelect}
                previewRef={previewRef}
                thumbRefs={thumbRefs}
              />
            ) : view === "reference" ? (
              <ReferenceSection />
            ) : (
              <AboutSection isMac={isMac} version={version} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Options;
