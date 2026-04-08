/**
 * Mulberry32 – a fast, small seeded PRNG.
 * Returns a factory whose output is uniformly distributed in [0, 1).
 *
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
export function mulberry32(seed: number): () => number {
  // Coerce to unsigned 32-bit integer so bit-ops are well-defined.
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Fisher-Yates shuffle.
 * Pure: returns a new array, does not mutate the input.
 */
export function shuffleArray<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/**
 * Microsoft FreeCell shuffle — faithful port of Jim Horne's original algorithm.
 * Uses MS C runtime rand() (signed 32-bit LCG) and a selection-based deal.
 * Game numbers 1–32000 match the original Windows FreeCell exactly.
 *
 * Key differences from generic Fisher-Yates:
 *  - RNG uses signed 32-bit overflow (Math.imul + | 0), not masked to 31 bits
 *  - Selection-based: picks from remaining cards, not in-place swap from end
 */
export function msShuffle<T>(arr: readonly T[], seed: number): T[] {
  const deck = arr.slice();
  const result: T[] = new Array(arr.length);
  let s = seed | 0;  // signed 32-bit
  let wLeft = deck.length;
  for (let i = 0; i < arr.length; i++) {
    s = (Math.imul(s, 214013) + 2531011) | 0;
    const j = ((s >> 16) & 0x7fff) % wLeft;
    result[i] = deck[j] as T;
    deck[j] = deck[--wLeft] as T;
  }
  return result;
}
