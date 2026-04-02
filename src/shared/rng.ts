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
