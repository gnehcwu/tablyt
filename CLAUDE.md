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
2. Handle it in one of the two `browser.runtime.onMessage.addListener` blocks in `entrypoints/background.ts` (the first block handles data fetches and returns `{ items }`; the second handles mutation actions — switch/open/duplicate/close tab, add/remove bookmark, mute, etc. — and returns `{ success }`).
3. If it should appear as a browser action in the palette, register it in `BROWSER_ACTIONS` inside `components/Palette.tsx`. For pure URL-opening actions, also add the URL to `BROWSER_ACTION_URL_MAP` in `utils/constants.ts`.

Use `utils/messageBackground.ts` (a Promise wrapper around `chrome.runtime.sendMessage`) when calling the background from the palette. Use `hooks/useChromeMessage.ts` when subscribing to background-→content messages from a React component.

Mutation actions invoked from the action panel (`BP_CLOSE_TAB`, `BP_REMOVE_BOOKMARK`, `BP_ADD_BOOKMARK`, and `BP_DUPLICATE_TAB` with a `tabId`) are wired through `utils/actionPanelActions.tsx`'s `PanelActionCtx`, not `BROWSER_ACTIONS`.

### Palette state and modes

`components/Palette.tsx` is the entry component; its state lives in the `useReducer` in `hooks/usePalette.ts` (`open`, `search`, `selected`, `scoredActionItems`, `command`, `loading`). The action panel's own ephemeral state (`panelOpen`, `panelSelected`) is local `useState` in `Palette.tsx`, not in the reducer. Keystrokes are handled in `Palette.handleKeyDown`:

- `⌘K` / `Ctrl+K` → toggle the action panel for the highlighted item (see below).
- `Tab` → toggle History mode (`ACTION_MODE.HISTORY`); there is only this one alternate mode.
- `Backspace` on empty input → exit the current mode.
- `↑`/`↓` navigate, `Enter` runs the selected item, `Esc` closes the palette.

The default scope merges open tabs + bookmarks + browser actions into one list. `fetchActionItems` fetches them (History mode fetches `BP_SEARCH_HISTORIES` instead), tagging each with a `source` (`"tab" | "bookmark" | "action" | "history" | "favorite"`). `scoreActionList` then groups results by `SECTION_ORDER` (`["tab", "action", "bookmark"]`). Browser actions only appear when `command` is empty. Bookmarks are deduped against open tabs; an open tab whose URL is bookmarked carries a `bookmarkId` so its row shows a bookmark indicator and its panel offers "Remove bookmark".

### Action panel

`components/ActionPanel.tsx` is a Raycast-style floating menu (bottom-right of the card) opened with `⌘K`. It's wrapped in `react-focus-lock` so focus is trapped while open and returned to the search input on close; keyboard nav is still driven by `Palette.handleKeyDown` (events bubble to the card) so no button is individually focused. The per-item actions are built by `getPanelActions(item, ctx)` in `utils/actionPanelActions.tsx`, keyed by the item's `source` (or `favoriteKind` for favorite rows). `ctx` (`PanelActionCtx`) supplies the operations (switch/open/duplicate/close, bookmark toggle, favorite toggle, etc.), each implemented in `Palette.tsx`. The synthetic web-search row gets no panel.

### Favorites

Bookmarks and browser actions can be favorited (open tabs cannot). `utils/favorites.ts` persists them in `chrome.storage.local` under `tablyt:favorites` (mirroring `utils/theme.ts`'s get/set/subscribe pattern); `hooks/useFavorites.ts` exposes a reactive `{ favorites, isFavorite, toggle }`. When the query is empty, `scoreActionList` pins a deduped **Favorites** section at the top (favorited items are removed from their normal sections). Favorites are rehydrated to renderable items via `favoriteEntryToItem` (action icons re-resolved from `BROWSER_ACTIONS`, never serialized).

### Toasts

Transient confirmations (Bookmarked, Tab closed, Added to favorites, …) use `hooks/useToast.ts` + `components/Toast.tsx` — a single replace-in-place toast pinned bottom-center of the card, CSS-transition based (not keyframes), auto-dismiss ~2.2s. Only operations that keep the palette open fire a toast.

### Fuzzy scoring

`utils/scoring/score.ts` is a memoized fuzzy-match scorer (continuous-match / word-jump / transposition heuristics). `utils/scoring/scoreActions.ts` is the wrapper used by the palette: it scores each item against `title`, `domain`, and `path` and keeps the max (tabs get a small `SOURCE_BOOST`). After dropping zero-score items it applies a **relative cutoff** — keep only items scoring ≥ `RELATIVE_MATCH_RATIO` (0.3) × the top score — so loose subsequence matches are pruned when a strong match exists but results survive when everything is loosely matched. When the query is shorter than `DEFAULT_MINIMUM_MATCH` (2 chars), all items pass through unscored. A synthetic "Search the web" item (`source: "action"`) is pinned to the top of the actions section whenever there's a query.

## Conventions

- Path alias `@/*` resolves to the repo root (configured in both `tsconfig.json` and `wxt.config.ts`/`vite.config.ts`). Prefer it over relative imports.
- UI primitives in `components/ui/` are [shadcn/ui](https://ui.shadcn.com) (new-york style, neutral base color, CSS variables); add new ones via `npx shadcn@latest add <name>` — settings live in `components.json`.
- Icons come from `lucide-react`.
- Tailwind CSS v4 is loaded via the `@tailwindcss/vite` plugin; the entry stylesheet is `assets/tailwind.css` and must be imported in any component rendered inside the Shadow Root (see existing imports in `Palette.tsx`, `Filter.tsx`, `ActionList.tsx`) so its styles get bundled into the Shadow DOM stylesheet.
- The manifest (permissions, command shortcut, action icons) is declared in `wxt.config.ts`, not in a hand-written `manifest.json`.
- Persisted state uses `chrome.storage.local` with a `tablyt:*` key and a `get`/`set`/`subscribe`-via-`onChanged` trio — see `utils/theme.ts` and `utils/favorites.ts`. Follow that pattern for new persisted settings.

## Compact Instructions

Preserve:
1. Architecture decisions (NEVER summarize)
2. Modified files and key changes
3. Current verification status (pass/fail commands)
4. Open risks, TODOs, rollback notes
