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

To benchmark hot-path pure functions: `npx vitest bench --run` (see `gameLogic.bench.ts`)

CI runs `npm test` before every deploy to GitHub Pages.

## Architecture

Multi-game entertainment pack. React components are thin wrappers — all game logic lives in pure functions. Games share card primitives via `src/shared/`.

**Routing:** Hash-based (`/#/`, `/#/klondike`, `/#/blackjack`, `/#/freecell`) via `src/router/useHashRoute.ts`. No router library. Bookmarkable URLs work on GitHub Pages.

**Shared card library (`src/shared/`):**
- `types.ts` — `Card`, `Suit`, `Rank`
- `constants.ts` — `SUITS`, `RANKS`, `SUIT_SYMBOL`, `RED_SUITS`
- `rng.ts` — `mulberry32` seeded PRNG + Fisher-Yates shuffle
- `deck.ts` — `createDeck()`, `createShuffledDeck(seed)`
- `spriteSheet.ts` — CSS background-position mapping for the 13×6 sprite sheet
- `card.css` — `.card`, `.card--face-up/down`, `.pile-slot`, `--card-w`, `--card-h` CSS vars
- `components/CardView.tsx` — Memoized card rendering component

**State flow (both games follow this pattern):**
```
User input
  → useGame hook (hooks/useKlondike.ts | hooks/useBlackjack.ts)
  → Pure game functions (gameLogic.ts) → GameState | null
  → GameWithHistory (gameReducer.ts, manages single-level undo)
  → localStorage (storage.ts)
  → React re-render
```

**Klondike (`src/games/klondike/`):**
- `gameLogic.ts` — All move functions are pure: `(GameState) → GameState | null`. Null means invalid move.
- `gameReducer.ts` — Wraps GameState in GameWithHistory with undo support.
- `useKlondike.ts` — The only stateful layer; bridges pure logic to React and localStorage.
- `KlondikeGame.tsx` — Drag-and-drop via pointer events (not HTML5 drag API).
- Scoring modes: Standard (Windows rules) and Vegas (-$52 wager, +$5/foundation card).
- Persistence keys: `ep:settings`, `ep:game`, `ep:stats`, `ep:vegas-pot`

**Blackjack (`src/games/blackjack/`):**
- `blackjackLogic.ts` — Pure functions: `placeBet`, `deal`, `hit`, `stand`, `doubleDown`, `split`, `playDealer`, `settleHands`, `nextRound`.
- `blackjackReducer.ts` — Same undo pattern as Klondike.
- `useBlackjack.ts` — Game controller hook.
- `BlackjackGame.tsx` — Main UI component.
- Rules: 4-deck shoe (default), 3:2 natural, dealer stands soft 17. `BlackjackOptions` struct ready for variants.
- Persistence keys: `ep:bj:game`, `ep:bj:stats`, `ep:bj:settings`, `ep:bj:balance`

**FreeCell (`src/games/freecell/`):**
- `gameLogic.ts` — Pure move functions: `moveToFreeCell`, `moveFromFreeCell`, `moveTableauToTableau`, `moveTableauToFoundation`, `moveFreeCellToFoundation`, `autoMoveToFoundation`.
- `gameReducer.ts` — Single-level undo (`GameWithHistory` with 2-state limit).
- `useFreecell.ts` — Click-based game controller (no drag).
- `FreeCellGame.tsx` — Main UI component with click selection.
- `freecell.css` — Grid layout: free cells (left) + foundations (right), then 8-column tableau with card fanning.
- Rules: Descending rank + alternating color on tableau, Ace→King by suit on foundations. Supermove: `(freeCells + 1) × 2^emptyTableau` cards.
- Persistence keys: `ep:fc:game`, `ep:fc:stats`

**Persistence:** All game state, settings, stats persisted to localStorage with `ep:` prefix.

## Conventions

- All new game logic requires tests in the relevant `__tests__/` directory (e.g. `src/games/klondike/__tests__/`, `src/games/blackjack/__tests__/`). New functionality without tests will not be accepted.
- Game logic functions must remain pure (no side effects, no mutation).
- `drawMode` is `1 | 3`; `scoringMode` is `"standard" | "vegas"`.
- Stock array: last element = top card (next to draw). Waste array: last element = top (playable).

## Documentation

- **DECISIONS.md** — Update whenever a significant implementation decision is made (architecture, library choice, data model, approach trade-offs). Include date, decision, rationale, and alternatives considered.
- **CLAUDE.md** — Update whenever project structure, commands, or architecture changes in a meaningful way.
- **README.md** — Update whenever user-facing features, game rules, or deployment steps change.
