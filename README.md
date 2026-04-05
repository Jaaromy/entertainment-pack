# Entertainment Pack

A collection of browser-based card games. Currently features Klondike Solitaire.

## Klondike Solitaire

Classic solitaire with configurable rules:

- **Draw Mode** — Draw 1 (easier) or Draw 3 (harder)
- **Scoring** — Standard (Windows-style) or Vegas ($52 wager, $5 per card to foundation)
- **Card Size** — Normal or Large
- **Undo** — Single-level undo
- **Stats** — Win/loss tracking per game variant
- **Vegas Pot** — Running balance carries across games

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run tests
```

Deployed automatically to GitHub Pages on push to `main` (tests must pass).

## Stack

React 19 · TypeScript 5.7 · Vite 6 · Vitest 3
