export {
  SUITS,
  RANKS,
  SUIT_SYMBOL,
  RED_SUITS,
  CARD_WIDTH_NORMAL,
  CARD_HEIGHT_NORMAL,
  CARD_ASPECT_RATIO,
} from '@/shared/constants'

export const TABLEAU_SIZE = 8
export const FREE_CELL_COUNT = 4
export const FOUNDATION_SIZE = 4
export const DECK_SIZE = 52

// FreeCell-specific constants
export const AUTO_MOVE_THRESHOLD = 2 // rank <= min_opposite_color + 2
