# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tablyt is a Chrome/Firefox extension that opens a command-palette overlay (default `Ctrl/Cmd+Shift+K`) for searching open tabs, bookmarks, history, and triggering browser actions. Built on [WXT](https://wxt.dev) with React 19, TypeScript, and Tailwind CSS v4.

## Commands

- `npm run dev` — WXT dev server with HMR for Chrome (loads a temp profile with the extension installed).
- `npm run dev:firefox` — same, for Firefox.
- `npm run build` / `npm run build:firefox` — production build into `.output/`.
- `npm run zip` / `npm run zip:firefox` — zip the built artifact for store upload.
- `npm run compile` — typecheck only (`tsc --noEmit`); there is no separate lint or test command.
- `npm install` runs `wxt prepare` post-install, which regenerates `.wxt/` (types, tsconfig base). Run `npx wxt prepare` manually if `.wxt/` is missing or types look stale.

There is no test suite.

## Architecture

The extension has two runtime contexts that talk via `chrome.runtime.sendMessage`:

1. **Background service worker** (`entrypoints/background.ts`) — owns all Chrome API access: `tabs`, `bookmarks`, `history`, `windows`. It listens for the toolbar action click and the registered keyboard command, and forwards a `BP_TOGGLE_PALETTE` message to the active tab's content script. It also responds to data-fetch and tab-mutation requests from the palette.
2. **Content script** (`entrypoints/content/index.tsx`) — injected on `*://*/*`. It uses WXT's `createShadowRootUi` to mount the `<Palette />` React app inside a Shadow DOM so the host page's styles never leak in. The dark/light class on the wrapper is driven by `prefers-color-scheme`.

### Message protocol

Every cross-context message is identified by a string constant prefixed `BP_` (browser-palette), all defined in `utils/constants.ts`. When adding a new action:

1. Add the `BP_*` constant in `utils/constants.ts`.
2. Handle it in one of the two `browser.runtime.onMessage.addListener` blocks in `entrypoints/background.ts` (the first block handles data fetches and returns `{ items }`; the second handles tab-mutation actions and returns `{ success }`).
3. If it should appear as a browser action in the palette, register it in `BROWSER_ACTIONS` inside `components/Palette.tsx`. For pure URL-opening actions, also add the URL to `BROWSER_ACTION_URL_MAP` in `utils/constants.ts`.

Use `utils/messageBackground.ts` (a Promise wrapper around `chrome.runtime.sendMessage`) when calling the background from the palette. Use `hooks/useChromeMessage.ts` when subscribing to background-→content messages from a React component.

### Palette state and modes

`components/Palette.tsx` is the entry component; its state lives in the `useReducer` in `hooks/usePalette.ts` (`open`, `search`, `selected`, `scoredActionItems`, `command`, `loading`). Mode switching uses single keystrokes handled in `Palette.handleKeyDown`:

- `Tab` → toggle Bookmarks mode (`ACTION_MODE.BOOKMARKS`).
- `!` → toggle History mode (`ACTION_MODE.HISTORY`).
- `Backspace` on empty input → exit current mode.

`ACTION_MODE_ACTIONS` in `utils/constants.ts` maps each mode to the `BP_SEARCH_*` action used to fetch its items. Browser actions are only appended to the list when `command` is empty (i.e. default tab-search mode).

### Fuzzy scoring

`utils/scoring/score.ts` is a memoized fuzzy-match scorer (continuous-match / word-jump / transposition heuristics). `utils/scoring/scoreActions.ts` is the wrapper used by the palette: it scores each item against `title`, `domain`, and `path` and keeps the max. Items with a score of 0 are dropped. When the query is shorter than `DEFAULT_MINIMUM_MATCH` (2 chars), all items pass through unscored.

## Conventions

- Path alias `@/*` resolves to the repo root (configured in both `tsconfig.json` and `wxt.config.ts`/`vite.config.ts`). Prefer it over relative imports.
- UI primitives in `components/ui/` are [shadcn/ui](https://ui.shadcn.com) (new-york style, neutral base color, CSS variables); add new ones via `npx shadcn@latest add <name>` — settings live in `components.json`.
- Icons come from `lucide-react`.
- Tailwind CSS v4 is loaded via the `@tailwindcss/vite` plugin; the entry stylesheet is `assets/tailwind.css` and must be imported in any component rendered inside the Shadow Root (see existing imports in `Palette.tsx`, `Filter.tsx`, `ActionList.tsx`) so its styles get bundled into the Shadow DOM stylesheet.
- The manifest (permissions, command shortcut, action icons) is declared in `wxt.config.ts`, not in a hand-written `manifest.json`.

## Compact Instructions

Preserve:

1. Architecture decisions (NEVER summarize)
2. Modified files and key changes
3. Current verification status (pass/fail commands)
4. Open risks, TODOs, rollback notes
