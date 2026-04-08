# Decisions

Tracks significant implementation choices with rationale and date. Update this file whenever a significant architectural, library, data model, or approach decision is made.

---

## 2025-01-01 — Pure function game logic pattern

**Decision:** All game state transformations are pure functions with signature `(GameState, ...args) => GameState | null`. Null indicates an invalid/illegal move.

**Rationale:** Enables deterministic testing without mocking, easy undo by just keeping old states, and clear separation between game rules and React rendering. Side effects (localStorage, React state) are isolated to the hook layer.

**Alternatives considered:** Mutable state with event emitter; Redux-style action/reducer (more ceremony for a single game).

---

## 2025-01-01 — Seeded PRNG for deterministic shuffling

**Decision:** Use the mulberry32 algorithm seeded with `Date.now()` (or a stored seed) rather than `Math.random()`.

**Rationale:** A reproducible seed means any game can be exactly recreated from its initial seed — useful for debugging, testing with specific card arrangements, and potential future "replay" features. mulberry32 is fast and produces good statistical randomness for this use case.

**Alternatives considered:** `Math.random()` (simpler but non-deterministic, untestable), crypto.getRandomValues (overkill, still non-seeded without extra work).

---

## 2025-01-01 — Single-level undo (2-state history)

**Decision:** `GameWithHistory` stores only the previous state and current state (2 states maximum). Undo reverts one move; there is no multi-level undo.

**Rationale:** Matches Windows Solitaire behaviour. Keeps memory usage bounded regardless of game length. The -15 undo penalty in Standard mode and no-undo design intent of Vegas mode make unlimited undo undesirable.

**Alternatives considered:** Full history stack (unlimited undo) — rejected because it contradicts the scoring philosophy and would use unbounded memory for long games.

---

## 2025-01-01 — CSS sprite sheet for card artwork

**Decision:** Cards are rendered using a single PNG sprite sheet (13 columns × 6 rows = 78 sprites) via CSS `background-position` percentages.

**Rationale:** Single HTTP request for all card art. Percentage-based positioning scales correctly with any card size without JavaScript. Compatible with CSS variables for responsive sizing.

**Alternatives considered:** Individual card PNGs (78 requests), SVG cards (larger bundle, more complex), canvas rendering (loses browser text/accessibility features).

---

## 2025-01-01 — CSS variables for card sizing

**Decision:** Card dimensions are set via CSS custom properties (`--card-w`, `--card-h`) on the board container. A modifier class (`.klondike-board--large`) overrides them for the large card size option.

**Rationale:** All card-size-dependent layout (pile offsets, grid columns) automatically updates when the variable changes. No JavaScript needed for layout recalculation. Works without media queries.

**Alternatives considered:** Media queries (tied to viewport, not user preference), JavaScript-computed styles (brittle, requires DOM measurements).

---

## 2025-01-01 — `ep:` localStorage key prefix

**Decision:** All localStorage keys are prefixed with `ep:` (for "entertainment-pack"). Game-specific sub-namespaces use `ep:<game>:` (e.g. `ep:bj:` for Blackjack).

**Rationale:** Avoids collisions with other apps or browser extensions that might use generic keys. Prefix makes it easy to identify and clear all app data in DevTools.

**Alternatives considered:** No prefix (collision risk), unique UUID prefix (unreadable in DevTools).

---

## 2025-01-01 — Pointer events for drag-and-drop (not HTML5 Drag API)

**Decision:** Klondike drag-and-drop is implemented using `pointerdown`/`pointermove`/`pointerup` events on the document, with a floating drag-preview div positioned via CSS transform.

**Rationale:** The HTML5 Drag API has significant cross-browser inconsistencies, cannot easily customize the drag image position, and does not fire events at the rate needed for smooth card preview movement. Pointer events give full control and work identically on touch and mouse.

**Alternatives considered:** HTML5 Drag API (inconsistent, poor UX), a drag-and-drop library (unnecessary dependency for this specific layout).

---

## 2025-01-01 — View-based navigation (no router library)

**Decision:** Initial navigation was a simple React `useState` switching between `'game' | 'stats' | 'gallery'` views. No router library was used.

**Rationale:** With only three views and no need for bookmarkable URLs at the time, a router added unnecessary complexity and bundle size.

**Superseded by:** Hash-based routing (see below).

---

## 2026-04-02 — Hash-based routing (no library)

**Decision:** URL navigation uses `window.location.hash` via a custom `useHashRoute` hook (~35 lines). Routes: `/#/` (landing), `/#/klondike`, `/#/blackjack`. No React Router or similar library.

**Rationale:** GitHub Pages is a static host — path-based routing requires a `404.html` redirect hack or server configuration. Hash routing is fully client-side and requires zero server configuration. The custom hook is ~35 lines and matches the codebase's low-dependency philosophy. Adding React Router (~50 kB min+gz) for three static routes would be over-engineering.

**Alternatives considered:** React Router with `createHashRouter` (standard, but adds ~50 kB dependency and API surface for no benefit at this scale), path-based routing with 404 redirect (fragile, GitHub Pages specific workaround).

---

## 2026-04-02 — Shared card library in `src/shared/`

**Decision:** Game-agnostic utilities (`Card`/`Suit`/`Rank` types, `rng.ts`, `deck.ts`, `spriteSheet.ts`, `CardView.tsx`, card base CSS) are extracted to `src/shared/` before adding the second game. Klondike re-exports the shared types so its internal imports require no cascading changes.

**Rationale:** Prevents duplication across games. The `Card` interface, PRNG, Fisher-Yates shuffle, and sprite sheet utility are identical for any standard playing-card game. Extracting them first means Blackjack (and future games) get them for free.

**Alternatives considered:** Copy files into each game directory (duplication, divergence risk), wait to extract "when needed" (results in messier extraction under time pressure).

---

## 2026-04-02 — Blackjack: 4-deck shoe, 3:2, dealer stands soft 17

**Decision:** First Blackjack implementation uses: 4-deck shoe (208 cards), 3:2 natural payout, dealer stands on all 17s (hard and soft). Shoe reshuffles when < 25% of cards remain. Actions: Hit, Stand, Double Down, Split. No insurance, no surrender in v1.

**Rationale:** Standard Vegas downtown rules. 4-deck shoe is common, reduces card-counting advantage (relevant for feel even in a browser game), and 3:2 is player-favourable vs. 6:5. Dealer standing on soft 17 is the classic rule. Starting simple (no insurance/surrender) keeps the UI focused.

**Alternatives considered:** 6-deck shoe (more common in high-limit games, fine to add as option), 6:5 payout (worse for player, added as future variant option), dealer hits soft 17 (more common in modern casinos, exposed as `dealerHitsSoft17` option for future use).

---

## 2026-04-02 — Blackjack: `BlackjackOptions` struct for future variants

**Decision:** All configurable Blackjack rules live in a `BlackjackOptions` interface embedded in `BlackjackState` and persisted to localStorage. v1 exposes this in the options dialog but only the `deckCount` field is interactive; other fields use defaults.

**Rationale:** Adding variant support later (6:5, surrender, insurance, re-split aces) only requires: adding UI controls to `BlackjackOptionsDialog`, and ensuring the logic functions read from `state.options` (they already do). No data model migration needed.

**Alternatives considered:** Hard-coded constants for v1 (easier now, painful refactor later when variants are requested).

---

## 2026-04-02 — Blackjack balance persistence separate from game state

**Decision:** The player's balance is stored both inside `BlackjackState` (serialised as `ep:bj:game`) and as a standalone `ep:bj:balance` key.

**Rationale:** The full game state including the 208-card shoe serialises to ~10 kB JSON. The landing page needs to show the current balance without parsing the full shoe. The standalone key enables a cheap `JSON.parse` of a single number.

**Alternatives considered:** Always parse full game state (works, but wasteful for a balance display), store balance in a shared `ep:bj:settings` key (mixing settings and live game data).

---

## 2026-04-07 — FreeCell: Pointer drag matching Klondike's system

**Decision:** FreeCell uses the same pointer-based drag system as Klondike — `onPointerDown` on cards, `pointermove`/`pointerup` on `document`, `data-drop-area`/`data-drop-pile` attributes on drop zones, best-overlap calculation on release. Click (short drag) still works for click-to-select/move. `onDrop(src, destArea, destPile)` added to the hook for direct drag moves without requiring a prior click selection.

**Rationale:** Consistent UX across all games. The drag system already handles single-card moves cleanly; FreeCell only ever moves one card at a time so no supermove preview complexity arises.

**Alternatives considered:** Click-only (no drag) — simpler but inconsistent with Klondike/Blackjack feel on desktop.

---

## 2026-04-07 — FreeCell supermove formula and auto-move safety

**Decision:** A sequence of N cards can only move if `N ≤ (freeCells + 1) × 2^emptyTableau`. If the destination is empty, subtract 1 from the empty pile count. Auto-move only places cards rank ≤ min(opposite-color foundations) + 2.

**Rationale:** The supermove formula is the standard FreeCell rule — it directly emerges from the fact that moving N cards requires N free intermediate slots, and empty tableau piles can hold any sequence (doubling the free space). Auto-move threshold prevents "trapping" cards by committing them too early; +2 threshold is a conservative heuristic that prevents most dead ends.

**Alternatives considered:** No supermove limit (deviates from FreeCell rules), auto-move all cards (leads to unwinnable states), higher safety threshold (makes auto-move too conservative).

---

## 2026-04-07 — FreeCell persistence: `ep:fc:*` keys

**Decision:** FreeCell state, stats use keys `ep:fc:game`, `ep:fc:stats`. Stats track `{ gamesPlayed, gamesWon }`.

**Rationale:** Consistent with existing namespace (`ep:` prefix, game-specific sub-key). Simple stats (just win count) match the landing page badge display and avoid the complexity of Klondike's multi-mode scoring.

**Alternatives considered:** Full stats like Klondike (time, moves, best score) — overkill for FreeCell's simpler scoring model.
