# Coffee Music Player (web)

A web music player for [Navidrome](https://www.navidrome.org/) (Subsonic / OpenSubsonic API),
styled after the [Coffee Music Player](https://github.com/anagram-software/CoffeeMusicPlayer) Android app.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run lint       # oxlint
npm run typecheck
npm run build
```

Try it against the public demo server: `demo.navidrome.org`, user `demo`, password `demo`.

## Stack

Vite · React 19 · TypeScript · TanStack Router (file-based, `src/routes/`) · TanStack Query ·
Zustand · Tailwind CSS v4 · shadcn/ui (Radix) · react-icons (Material Design)

## Features

- Library: songs, albums, artists, genres; album/artist/genre pages; search
- Playback: queue with drag-to-reorder, shuffle/repeat, near-gapless preloading,
  media keys / lock screen (Media Session), scrobbling, resume after reload
- Full player tinted from the album art, with synced lyrics (server, or LRCLIB if enabled)
- Favorites (starring), playlists (create, edit, reorder), Home
- Equalizer: 5 bands with presets, bass boost, virtualizer, reverb (Web Audio)

## Layout

- `src/lib/subsonic/` – a small Subsonic client (token auth; types come from `subsonic-api`)
- `src/player/` – audio engine, queue store and Web Audio effects
- `src/stores/` – Zustand stores (session, settings)
- `src/routes/` – pages; `_app/` routes require login and set `staticData.section`
- `src/components/layout/` – app shell: sidebar, top bar, player bar
- `src/index.css` – Coffee dark theme and per-section accent colours (`data-section`)
