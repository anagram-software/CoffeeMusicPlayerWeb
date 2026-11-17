# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Coffee Music Player (web): a single-page web player for Navidrome (Subsonic/OpenSubsonic API), styled after the author's Android app [CoffeeMusicPlayer](https://github.com/anagram-software/CoffeeMusicPlayer). The browser talks to the music server directly; there is no backend. In the author's setup an **Octo-Fiesta** proxy sits in front of Navidrome and mixes Qobuz results into the API (see below).

## Commands

```bash
npm run dev                 # Vite dev server, http://localhost:5173
npm run build               # tsc -b && vite build (also regenerates src/routeTree.gen.ts)
npm run typecheck           # tsc -b
npm run lint                # oxlint
npm test                    # vitest in watch mode
npx vitest run              # all tests once
npx vitest run src/player/queue.test.ts        # one file
npx vitest run -t "respects repeat modes"      # by test name
docker compose up -d --build                   # production build served by nginx on :8080
npm run docker:publish                         # build + push thatudeshuk/coffee-music-player:<version> and :latest (PUSH=0 to skip push)
```

The version comes from `package.json` (`npm version patch|minor|major`); it tags the Docker image and is shown in Settings → About via `__APP_VERSION__` (defined in `vite.config.ts`).

For manual testing use the public demo server: `demo.navidrome.org`, user `demo`, password `demo`. It has no Octo-Fiesta; external results can only be simulated.

## Architecture

### Data layer (`src/lib/subsonic/`)
- `client.ts` is a hand-written Subsonic client. `subsonic-api` is used **only for its response types** (it needs the raw password and doesn't throw on `status: "failed"`). Credentials persisted after login are `{url, username, salt, token}`, never the password. Failures throw `SubsonicError`; auth errors (codes 40/41/44) log the user out (`lib/queryClient.ts`), and the query cache is cleared on logout so accounts never share data.
- `queries.ts` holds all TanStack Query option factories, taking a client. Components use `useSubsonic()`; route loaders prefetch with `getClient()` (both in `stores/session.ts`). Some fields Navidrome sends via OpenSubsonic aren't in `subsonic-api`'s types yet (e.g. `samplingRate`, `bitDepth`, playlist `readonly`); they're declared locally where used.
- Octo-Fiesta: external items have ids `ext-<provider>-<type>-<id>` (`external.ts`). Streaming an external track makes the proxy download it, which drives several behaviours: search plays only the clicked song; the engine never preloads external tracks; starring an external album makes Octo-Fiesta download the whole album (`addToLibrary.ts`). Qobuz results carry no popularity data, so `relevance.ts` filters cover/karaoke filler by keyword and merges duplicate editions.
- Last.fm import (Playlists page → `LastfmImportDialog`): `lib/lastfm.ts` fetches loved/top/tag/artist track lists with the user's API key (Settings → Last.fm; the API has no playlist method and last.fm pages block cross-origin and bot requests). `subsonic/match.ts` matches each track via search3, preferring library songs over external ones. `subsonic/importPlaylist.ts` creates the playlist and fills it in the background.
- Adding songs to playlists goes through `subsonic/playlistSongs.ts` (`appendSongs`, `createPlaylistWithSongs`). Octo-Fiesta handles `updatePlaylist` itself: it resolves external song ids (downloads the song, waits for the library scan) but joins repeated params (`songIdToAdd`, `songIndexToRemove`) into one comma-separated value that Navidrome reads as a single id. So behind the proxy (detected by its `octoFiesta` OpenSubsonic extension, or any `ext-` id) songs are added one per call. `createPlaylist` is relayed untouched (batches work, external ids don't), so playlists with external songs are created empty, then filled.

### Player (`src/player/`)
- `store.ts` (Zustand, persisted to localStorage) holds the queue and UI state and has **no side effects**. `engine.ts` watches it and owns the `<audio>` elements. UI calls the exported `player` controller, not the store's `_`-prefixed setters.
- The engine keeps two `<audio>` elements: one plays while the other preloads the next track, and they swap on `ended` (near-gapless). It also handles Media Session, scrobbling (Last.fm rules), error skipping, and resuming the saved position after reload. In dev builds, `window.__coffee = { player, store, effects }` is available for debugging and browser automation.
- `effects.ts` is the Web Audio equalizer. It's off by default and nothing is routed through Web Audio until it's enabled (inside a user gesture). Routing an element into an AudioContext can't be undone, so disabling closes the context and the engine swaps in fresh `<audio>` elements (`disableEffects`).
- `queue.ts` / `quality.ts` are pure helpers (queue maths, `Track` shape, quality label) with unit tests.

### Routing and layout
- TanStack Router with file-based routes in `src/routes/`. `src/routeTree.gen.ts` is generated by the Vite plugin; don't edit it. Routes under `_app/` require a session (`_app.tsx` redirects to `/login`) and declare `staticData: { section }`, which drives the page accent and title (`hooks/useCurrentSection.ts`, `lib/sections.ts`).
- `components/layout/AppShell.tsx`: grid columns must be `minmax(0, …)`, because plain `auto`/`1fr` tracks grow to fit long unbreakable titles and push the app off-screen. One scroll container (`[data-scroll-restoration-id="main"]`) holds the sticky top bar and the page, so content scrolls under the frosted bar. Pages put sub-bars (tabs, search box) into the top bar with `<TopBarSlot>` (a portal), so the bar and sub-bar share one blurred background. The router's `scrollToTopSelectors` includes that container (new pages start at top; back/forward restore).
- Virtual lists (`components/library/VirtualGrid|VirtualList`) attach to that scroll container via `ScrollElementContext`; `useScrollMargin` measures content above the list by observing `<main data-scroll-content>`.
- Breakpoints matter for the player: below `md` (768px) queue/lyrics live inside the full player and the bar has no panel buttons; 768–1023px they open as a slide-over sheet; ≥1024px (`lg`) they're a docked column (`player/SidePanel.tsx`), and the full player can split into artwork + large lyrics.

### Theming (`src/index.css`)
- Light/dark via the `.dark` class on `<html>`, set by `hooks/useTheme.ts` (setting: system/light/dark) and by an inline script in `index.html` before first paint. Keep the two in sync.
- Each section has an accent. `[data-section="…"]` sets `--section-accent` (backgrounds, pills) and `--section-ink` (text; deeper shades in light mode). Use `bg-section` for fills and `text-section-ink` for text. Custom properties inherit as computed values, so `[data-section]` also re-derives `--primary`/`--ring`. Nested `data-section` (e.g. the favorites heart, the settings dialog) therefore recolours correctly.
- Player surfaces (bar, full player, side panel) use `.player-neutral`: neutral rings/primary instead of the page accent. The full player gets the `dark` class only in dark theme. Its background and the bar's are tints from the cover art (`lib/artColor.ts`, `dark` and `light` variants).
- Avoid literal `text-white`/`bg-white` outside surfaces that sit on cover art; use `foreground`/`muted-foreground` tokens so both themes work.

### Conventions
- shadcn/ui components live in `components/ui/` (generated; add more with `npx shadcn@latest add <name>`). App code imports `cn` from `@/lib/utils` (a re-export of shadcn's `cn` package). App icons come from `react-icons/md`; Lucide is only used inside the shadcn components.
- oxlint's `react/only-export-components` is on (off for `routes/` and `components/ui/`): keep non-component exports (constants, helpers, contexts) in their own modules. Existing examples: `player/sidePanelState.ts`, `layout/topBarSlot.ts`, `layout/scrollElement.ts`.
- User preferences live in `stores/settings.ts` (persisted; add new keys to `partialize`). Transient UI state such as the settings dialog lives in `stores/ui.ts`.
- Docker: `Dockerfile` builds on `--platform=$BUILDPLATFORM` (the output is static files, so multi-arch builds need no emulation) and serves with unprivileged nginx (`docker/nginx.conf`: SPA fallback, immutable `/assets`, `Referrer-Policy: no-referrer` because stream/cover URLs carry auth tokens).
