# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite production build
npm test           # Run all tests (Vitest)
npm run test:watch # Watch mode for tests
```

To run a single test file: `npx vitest run src/games/klondike/__tests__/gameLogic.test.ts`

CI runs `npm test` before every deploy to GitHub Pages.

## Architecture

This is a Klondike Solitaire game. React components are thin wrappers — all game logic lives in pure functions under `src/games/klondike/`.

**State flow:**
```
User input (click/drag)
  → useKlondike hook (src/games/klondike/hooks/useKlondike.ts)
  → Pure game functions (gameLogic.ts) → GameState | null
  → GameWithHistory (gameReducer.ts, manages undo)
  → localStorage (storage.ts)
  → React re-render
```

**Key modules:**
- `gameLogic.ts` — All move functions are pure: `(GameState) → GameState | null`. Null means invalid move.
- `gameReducer.ts` — Wraps GameState in GameWithHistory with undo support (history array + index pointer).
- `useKlondike.ts` — The only stateful layer; bridges pure logic to React and localStorage.
- `KlondikeGame.tsx` — Drag-and-drop via pointer events (not HTML5 drag API). Uses refs for drag preview positioning to avoid React re-renders mid-drag. Drop targets detected via bounding box overlap.
- `spriteSheet.ts` — Maps card rank/suit to CSS `background-position` percentages for the 13×6 sprite sheet.

**Scoring modes:**
- Standard: Windows Solitaire rules (+5 waste→tableau, +10 foundation, -15 undo, -100 recycle penalty for Draw-1).
- Vegas: -$52 initial wager, +$5 per foundation card. Draw-1 = 0 recycles, Draw-3 = 2 recycles max.

**Persistence:** All game state, settings, stats, and Vegas pot are stored in localStorage.

## Conventions

- All new game logic requires tests in `src/games/klondike/__tests__/`.
- Game logic functions must remain pure (no side effects, no mutation).
- `drawMode` is `1 | 3`; `scoringMode` is `"standard" | "vegas"`.
- Stock array: last element = top card (next to draw). Waste array: last element = top (playable).
