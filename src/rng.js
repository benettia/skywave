// seeded, splittable rng. mulberry32: 32-bit state, plenty for a radio band.
export const mulberry32 = a => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
// independent stream k off a parent seed — per-station audio uses split(seed, f*10)
export const split = (seed, k) => mulberry32((seed * 31 + k) >>> 0);
