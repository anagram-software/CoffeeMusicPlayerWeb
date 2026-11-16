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

## Layout

- `src/lib/subsonic/` – a small Subsonic client (token auth; types come from `subsonic-api`)
- `src/stores/` – Zustand stores (session)
- `src/routes/` – pages; `_app/` routes require login and set `staticData.section`
- `src/components/layout/` – app shell: sidebar, top bar, player bar
- `src/index.css` – Coffee dark theme and per-section accent colours (`data-section`)
