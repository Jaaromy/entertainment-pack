# Entertainment Pack

A collection of browser-based card games.

## Games

### Klondike Solitaire

Classic solitaire with configurable rules:

- **Draw Mode** — Draw 1 (easier) or Draw 3 (harder)
- **Scoring** — Standard (Windows-style) or Vegas ($52 wager, $5 per card to foundation)
- **Card Size** — Normal or Large
- **Undo** — Single-level undo
- **Stats** — Win/loss tracking per game variant
- **Vegas Pot** — Running balance carries across games

### Blackjack

Vegas-style blackjack with 4-deck shoe:

- **Rules** — 3:2 natural, dealer stands on all 17s, reshuffle at 25% penetration
- **Actions** — Hit, Stand, Double Down, Split
- **Betting** — Chip-based ($1–$500 per hand)
- **Stats** — Balance tracking, hand history

### FreeCell

Strategic solitaire with eight tableau columns and four free cells:

- **Gameplay** — Most deals are solvable with proper strategy
- **Free Cells** — Four temporary slots for any card
- **Supermove** — Moving sequences follows FreeCell rules: `(freeCells + 1) × 2^emptyTableau` cards max
- **Auto-move** — Safe cards automatically advance to foundations
- **Undo** — Single-level undo
- **Stats** — Win tracking

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
