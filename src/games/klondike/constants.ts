export {
  SUITS, RANKS, SUIT_SYMBOL, RED_SUITS,
  DRAG_START_THRESHOLD_SQ, DRAG_CLICK_SUPPRESS_RADIUS_SQ, DRAG_CLICK_SUPPRESS_TIMEOUT_MS,
} from '../../shared/constants';

// ---- Standard scoring (Windows Solitaire style) ----
/** Waste → Tableau */
export const SCORE_WASTE_TO_TABLEAU = 5;
/** Waste → Foundation */
export const SCORE_WASTE_TO_FOUNDATION = 10;
/** Tableau → Foundation */
export const SCORE_TABLEAU_TO_FOUNDATION = 10;
/** Flipping a face-down tableau card */
export const SCORE_FLIP_TABLEAU = 5;
/** Foundation → Tableau (penalty) */
export const SCORE_FOUNDATION_TO_TABLEAU = -15;
/**
 * Recycling stock penalty.
 * Draw-1: -100 per recycle after the first pass.
 * Draw-3: no penalty (unlimited free recycles in standard mode).
 */
export const SCORE_RECYCLE_DRAW1 = -100;

// ---- Vegas scoring ----
/** Initial "wager": $1 per card in the deck */
export const VEGAS_INITIAL_BET = -52;
/** Reward per card moved to foundation */
export const VEGAS_CARD_TO_FOUNDATION = 5;
/**
 * Maximum recycling passes in Vegas mode.
 * Draw-1: 1 pass (no recycles allowed).
 * Draw-3: 3 passes (2 recycles after initial pass).
 */
export const VEGAS_MAX_RECYCLES_DRAW1 = 0;
export const VEGAS_MAX_RECYCLES_DRAW3 = 2;

// ---- Table sizes ----
export const TABLEAU_SIZE = 7;
export const FOUNDATION_SIZE = 4;
export const DECK_SIZE = 52;

