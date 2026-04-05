import type { CSSProperties } from 'react';
import type { Suit, Rank } from './types';
import spriteSheetUrl from './assets/classic_solitaire_sheet.png';

// Sprite sheet: 923 × 576 px, 13 columns × 6 rows
const COLS = 13;
const ROWS = 6;

// Suit → row index (0-based). Rows 0–3 are card faces.
const SUIT_ROW: Record<Suit, number> = {
  spades:   0,
  hearts:   1,
  clubs:    2,
  diamonds: 3,
};

// Special assets in row 4:
//   col 10 = stock-empty, can recycle  (shuffle icon)
//   col 11 = stock-empty, no recycles  (no-shuffle icon)
//   col 12 = empty pile slot
const SPECIAL_ROW   = 4;
const COL_SHUFFLE    = 10;
const COL_NO_SHUFFLE = 11;
const COL_EMPTY_SLOT = 12;

// Percentage-based positioning — scales automatically with the card element size.
// backgroundSize: '1300% 600%' makes the sheet 13× wide and 6× tall relative to the element.
// backgroundPosition percentages are relative to the overflow, so:
//   position for col c = c / (COLS-1) * 100%
function bgStyle(col: number, row: number): CSSProperties {
  const xPct = col === 0 ? 0 : (col / (COLS - 1)) * 100;
  const yPct = row === 0 ? 0 : (row / (ROWS - 1)) * 100;
  return {
    backgroundImage:    `url(${spriteSheetUrl})`,
    backgroundSize:     `${COLS * 100}% ${ROWS * 100}%`,
    backgroundPosition: `${xPct}% ${yPct}%`,
    backgroundRepeat:   'no-repeat',
  };
}

/** Background style to display a specific card face from the sprite sheet. */
export function cardFaceStyle(suit: Suit, rank: Rank): CSSProperties {
  return bgStyle(rank - 1, SUIT_ROW[suit]);
}

/** Background style for the stock slot when recycling is available. */
export const shuffleSlotStyle: CSSProperties   = bgStyle(COL_SHUFFLE,    SPECIAL_ROW);

/** Background style for the stock slot when no more recycling is allowed. */
export const noShuffleSlotStyle: CSSProperties = bgStyle(COL_NO_SHUFFLE, SPECIAL_ROW);

/** Background style for an empty pile slot (foundation / tableau). */
export const emptySlotStyle: CSSProperties     = bgStyle(COL_EMPTY_SLOT, SPECIAL_ROW);
