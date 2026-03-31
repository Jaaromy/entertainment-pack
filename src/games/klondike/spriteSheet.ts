import type { CSSProperties } from 'react';
import type { Suit, Rank } from './types';
import spriteSheetUrl from './assets/classic_solitaire_sheet.png';

// Sprite sheet: 923 × 576 px, 13 columns × 6 rows → 71 × 96 px per cell
const SHEET_W = 923;
const SHEET_H = 576;
const COLS = 13;
const ROWS = 6;
const CELL_W = SHEET_W / COLS; // 71
const CELL_H = SHEET_H / ROWS; // 96

// Displayed card size — must match .card width/height in CSS
const CARD_W = 72;
const CARD_H = 100;

// Scale the full sheet so each cell maps exactly to CARD_W × CARD_H
const BG_W = Math.round((SHEET_W * CARD_W) / CELL_W); // 935
const BG_H = Math.round((SHEET_H * CARD_H) / CELL_H); // 600

// Suit → row index (0-based). Rows 0–3 are card faces.
const SUIT_ROW: Record<Suit, number> = {
  spades:   0,
  hearts:   1,
  clubs:    2,
  diamonds: 3,
};

// Row 5 (index 4) special assets — columns are 1-indexed in the sheet description:
//   col 11 → index 10 = stock-empty, can recycle  (shuffle icon)
//   col 12 → index 11 = stock-empty, no recycles  (no-shuffle icon)
//   col 13 → index 12 = empty pile slot
const SPECIAL_ROW   = 4;
const COL_SHUFFLE    = 10;
const COL_NO_SHUFFLE = 11;
const COL_EMPTY_SLOT = 12;

function bgStyle(col: number, row: number): CSSProperties {
  return {
    backgroundImage:    `url(${spriteSheetUrl})`,
    backgroundSize:     `${BG_W}px ${BG_H}px`,
    backgroundPosition: `${-(col * CARD_W)}px ${-(row * CARD_H)}px`,
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
